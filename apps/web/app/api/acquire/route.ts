import { connection, NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { isDemoMode } from "../../../lib/demo-mode";
import {
  getCurrentAccountId,
  resolveCurrentWorkspace,
  acquireLlmPreflightError,
  queueCandidateTracking,
  queueCandidateSeries,
  reserveCandidate,
  untrackTrackedTitle,
  importForeignWorkFiles,
} from "../../../lib/workflow-runtime";
import { queueSeasonTracking, queueRemainingSeasons } from "../../../lib/title-hub";

/** 与 actions.ts 的 acquireLlmNotConfigured 同语义 */
async function llmPreflight(): Promise<{ status: "llm_not_configured"; message: string } | null> {
  const message = await acquireLlmPreflightError(await getCurrentAccountId());
  return message ? { status: "llm_not_configured", message } : null;
}

export async function POST(request: NextRequest) {
  await connection();

  if (isDemoMode()) {
    return NextResponse.json({ status: "unsupported", message: "演示模式为只读，不支持此操作" }, { status: 403 });
  }

  const body = await request.json();
  // 盘由 cookie 决定，**不再信任请求体里的 storageId** —— 客户端不该有权指定资源
  // 落到哪块盘（那等于把"看哪块盘"和"写哪块盘"解耦，可能写进用户没在看的那块）。
  // resolveCurrentWorkspace 已做归属校验，未拥有的值一律回退主盘。
  const { connectedStorageId: driveId } = await resolveCurrentWorkspace();
  const storageChoice = driveId ?? undefined;

  try {
    switch (body.type) {
      case "track": {
        const input = body;
        if (input.currentState === "already_tracked") {
          return NextResponse.json({ status: "already_tracked", message: "已追踪，后台会继续按缺集状态检查。" });
        }
        if (input.currentState === "active_workflow") {
          return NextResponse.json({ status: "active_workflow", message: "获取任务已在运行中，不会重复创建。" });
        }
        if (input.currentState === "reserved") {
          return NextResponse.json({ status: "reserved", message: "已预定，上映后会自动获取并通知你。" });
        }
        if (input.currentState === "can_reserve" && input.candidateId) {
          const reservation = await reserveCandidate(input.candidateId, storageChoice);
          if (reservation.status === "unsupported") return NextResponse.json({ status: "unsupported", message: reservation.message });
          if (reservation.status === "already_running") return NextResponse.json({ status: "active_workflow", message: "获取任务已在运行中，不会重复创建。" });
          if (reservation.status === "already_tracked") return NextResponse.json({ status: "already_tracked", message: "已追踪，后台会继续按缺集状态检查。" });
          revalidatePath("/");
          return NextResponse.json({ status: "reserved", message: "已预定，上映后会自动获取并通知你。" });
        }
        if (input.candidateId) {
          const preflight = await llmPreflight();
          if (preflight) return NextResponse.json(preflight);
          const request = await queueCandidateTracking(input.candidateId, storageChoice);
          if (request.status === "already_tracked") return NextResponse.json({ status: "already_tracked", message: "已追踪，后台会继续按缺集状态检查。" });
          if (request.status === "already_running") return NextResponse.json({ status: "active_workflow", message: "获取任务已在运行中，不会重复创建。" });
          if (request.status === "unsupported") return NextResponse.json({ status: "unsupported", message: request.message });
          revalidatePath("/");
          return NextResponse.json({ status: "requested", message: "已加入后台队列，完成后会通知你。" });
        }
        return NextResponse.json({ status: "requested", message: "已收到获取请求。" });
      }

      case "series": {
        const preflight = await llmPreflight();
        if (preflight) return NextResponse.json(preflight);
        const request = await queueCandidateSeries(body.candidateId, storageChoice);
        if (request.status === "already_tracked") return NextResponse.json({ status: "already_tracked", message: "全剧已追踪，后台会继续按缺集状态检查。" });
        if (request.status === "already_running") return NextResponse.json({ status: "active_workflow", message: "全剧获取任务已在运行中。" });
        if (request.status === "unsupported") return NextResponse.json({ status: "unsupported", message: request.message });
        revalidatePath("/");
        return NextResponse.json({ status: "requested", message: "全剧获取已加入后台队列。" });
      }

      case "season": {
        const preflight = await llmPreflight();
        if (preflight) return NextResponse.json(preflight);
        const request = await queueSeasonTracking(body.tmdbId, body.seasonNumber, storageChoice);
        if (request.status === "already_tracked") return NextResponse.json({ status: "already_tracked", message: "本季已追踪。" });
        if (request.status === "already_running") return NextResponse.json({ status: "active_workflow", message: "本季获取任务已在运行中。" });
        if (request.status === "unsupported") return NextResponse.json({ status: "unsupported", message: request.message });
        revalidatePath(`/show/${body.tmdbId}`);
        revalidatePath("/");
        return NextResponse.json({ status: "requested", message: `第 ${body.seasonNumber} 季已加入后台队列。` });
      }

      case "remaining": {
        const preflight = await llmPreflight();
        if (preflight) return NextResponse.json(preflight);
        const request = await queueRemainingSeasons(body.tmdbId, storageChoice);
        if (request.status === "already_tracked") return NextResponse.json({ status: "already_tracked", message: "所有季都已在追踪。" });
        if (request.status === "already_running") return NextResponse.json({ status: "active_workflow", message: "获取任务已在运行中。" });
        if (request.status === "unsupported") return NextResponse.json({ status: "unsupported", message: request.message });
        revalidatePath(`/show/${body.tmdbId}`);
        revalidatePath("/");
        return NextResponse.json({ status: "requested", message: "剩余季已加入后台队列。" });
      }

      case "untrack": {
        const result = await untrackTrackedTitle(body.tmdbId, body.mediaKind, body.seasonNumber);
        revalidatePath("/");
        revalidatePath(`/show/${body.tmdbId}`);
        if (result.status === "in_flight") return NextResponse.json({ status: "in_flight", message: "获取进行中，完成或在活动页取消后再取消追踪。" });
        if (result.status === "not_found") return NextResponse.json({ status: "not_found", message: "该剧未在当前网盘追踪。" });
        return NextResponse.json({ status: "untracked", message: "已取消追踪（网盘文件已保留）。" });
      }

      case "import": {
        const movieTitle = String(body.movieTitle ?? "").trim();
        const year = Number(body.year);
        if (!movieTitle || !Number.isInteger(year) || year < 1880 || year > 2100) {
          return NextResponse.json({ status: "failed", message: "请填写有效的电影名称与年份。" });
        }
        const providerFileIds = (body.providerFileIds as string[]) ?? [];
        if (providerFileIds.length === 0) {
          return NextResponse.json({ status: "failed", message: "没有可入库的文件。" });
        }
        try {
          await importForeignWorkFiles({ providerFileIds, movieTitle, year });
          revalidatePath("/notifications");
          return NextResponse.json({ status: "imported", message: `已入库到 ${movieTitle} (${year})。` });
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          return NextResponse.json({ status: "failed", message: `入库失败：${msg.slice(0, 200)}` });
        }
      }

      default:
        return NextResponse.json({ status: "unsupported", message: `未知操作类型: ${body.type}` }, { status: 400 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ status: "unsupported", message: `操作失败：${message.slice(0, 200)}` }, { status: 500 });
  }
}
