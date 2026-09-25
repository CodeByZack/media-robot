"use client";

import { useState } from "react";
import { BRAND_TILES, type Brand } from "../lib/brand-tiles";
import { Pan115QrConnect } from "./pan115-qr-connect";
import { QuarkQrConnect } from "./quark-qr-connect";
import { QuarkCookieConnect } from "./quark-cookie-connect";
import { GuangYaTokenConnect } from "./guangya-token-connect";
import { TianyiQrConnect } from "./tianyi-qr-connect";
import { TianyiSsonConnect } from "./tianyi-sson-connect";
import { Pan123QrConnect } from "./pan123-qr-connect";
import { Pan123TokenConnect } from "./pan123-token-connect";

/** Settings「添加网盘」:品牌选择行 —— navy 文字方牌 + 名称 + 认证方式，与盘卡同一套
 *  「以字代图的标识语言」。选中后胶囊下方展开该品牌的连接区。115/夸克/天翼/123 scan
 *  a QR(夸克折叠 cookie 粘贴回退、天翼折叠 SSON 回退、123 折叠粘 token 回退——QR 的
 *  凭证兑换是易碎跳),光鸭粘 token。Each bound drive becomes its own isolated
 *  workspace (tree model).
 *  defaultBrand:首盘用户传 "pan115" 直接引导扫码;已有盘时传 null,连接区收起,
 *  点胶囊才展开(添加是低频动作,别让 115 连接区常驻占位)。再点选中胶囊可收起。
 *  品牌表在 ../lib/brand-tiles.ts（纯数据 + 契约测试，见该文件注释）。 */
export function AddDriveBrandTabs({ defaultBrand = "pan115" }: { defaultBrand?: Brand | null }) {
  const [brand, setBrand] = useState<Brand | null>(defaultBrand);

  return (
    <div>
      <div className="brand-gallery" role="group" aria-label="选择网盘品牌">
        {BRAND_TILES.map((tile) => (
          <button
            key={tile.key}
            type="button"
            className={`brand-tile${brand === tile.key ? " is-selected" : ""}`}
            onClick={() => setBrand(brand === tile.key ? null : tile.key)}
            aria-pressed={brand === tile.key}
          >
            <span className="drive-mark brand-tile-mark" aria-hidden>
              {tile.mark}
            </span>
            <span className="brand-tile-label">{tile.label}</span>
            <span className="brand-tile-note">{tile.authNote}</span>
          </button>
        ))}
      </div>
      {brand === "pan115" ? (
        <div className="brand-connect-area">
          <Pan115QrConnect />
        </div>
      ) : brand === "guangya" ? (
        <div className="brand-connect-area">
          <GuangYaTokenConnect />
        </div>
      ) : brand === "tianyi" ? (
        <div className="brand-connect-area">
          <TianyiQrConnect />
          <details style={{ marginTop: 12 }}>
            <summary className="panel-note" style={{ cursor: "pointer" }}>
              扫码不行？手动粘 SSON cookie
            </summary>
            <div style={{ marginTop: 10 }}>
              <TianyiSsonConnect />
            </div>
          </details>
        </div>
      ) : brand === "pan123" ? (
        <div className="brand-connect-area">
          <Pan123QrConnect />
          <details style={{ marginTop: 12 }}>
            <summary className="panel-note" style={{ cursor: "pointer" }}>
              扫码不行？手动粘 token
            </summary>
            <div style={{ marginTop: 10 }}>
              <Pan123TokenConnect />
            </div>
          </details>
        </div>
      ) : brand === "quark" ? (
        <div className="brand-connect-area">
          <QuarkQrConnect />
          <details style={{ marginTop: 12 }}>
            <summary className="panel-note" style={{ cursor: "pointer" }}>
              扫码不行？手动粘 cookie
            </summary>
            <div style={{ marginTop: 10 }}>
              <QuarkCookieConnect />
            </div>
          </details>
        </div>
      ) : null}
    </div>
  );
}
