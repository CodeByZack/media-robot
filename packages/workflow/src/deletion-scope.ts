/**
 * 删除前的「目录归属」裁决（5 个网盘执行器共用：115 / 夸克 / 光鸭 / 天翼 / 123）。
 *
 * ★ 2026-09-30 语义修正。守卫的本意是「**绝不删本目录之外的东西**」—— 这条必须保住。
 * 但旧实现把判据写成「你要删的每个 id 都必须出现在**这一次**列目录结果里」，而网盘
 * 列目录在异步 move/delete 之后有 2~6s 索引滞后（夸克实测），于是正常的清理被升级成
 * 整轮 failed：
 *   · 云雀叫天录 1d7d9e2b：清 staging 残留时，刚被搬走的文件不在新列表里 →
 *     `SAFETY_VIOLATION: refusing to delete unverified file ids` → 整轮 failed，
 *     24 集已识别内容随 pending 目录进回收站；
 *   · 同一族在 sandbox 层还有 4 处（v1.0.2 已改成 presentIn 跳过）。
 * 「不在」对**删除**来说恰恰是目标已达成，不是违规。所以改成：只删此刻确实在目录里
 * 的 id，其余跳过（gone）并留痕。
 *
 * 安全属性不变：调用方只拿 toDelete（已被本次列目录证实属于该目录的 id）去调网盘
 * 删除接口，绝不可能删到本目录之外。
 *
 * ⚠️ 验证必须用**完整目录树**（listTree）而不是 listVideoFiles —— agent 的眼睛
 * （inspectStaging / inspectTargetDir）看得到每个文件，而清理对象大多是**非视频**
 * （多余字幕、广告、nfo）。只验视频会让"删字幕"在每个盘上都不可能（2026-07-02
 * 光鸭 黑客帝国3 的 cleanup 连拒两次就是这条）。
 */

/** 把待删 id 拆成"本次列目录确证在目录里的"与"已经不在的"。纯函数，不做 IO。 */
export function splitDeletable(
  verifiedIds: Iterable<string>,
  fileIds: string[],
): { toDelete: string[]; gone: string[] } {
  const verified = new Set(verifiedIds);
  const toDelete: string[] = [];
  const gone: string[] = [];
  for (const fileId of fileIds) {
    if (verified.has(fileId)) {
      toDelete.push(fileId);
    } else {
      gone.push(fileId);
    }
  }
  return { toDelete, gone };
}

/** 跳过时的统一留痕：缺的不是错误，但要看得见（否则清理变少会变成静默行为）。 */
export function logSkippedDeletes(scope: string, directoryId: string, gone: string[]): void {
  if (gone.length === 0) {
    return;
  }
  console.warn(
    `[delete] ${scope}: 跳过 ${gone.length} 个不在目录里的 id（已删/已搬走/索引滞后）dir=${directoryId}: ${gone.join(",")}`,
  );
}
