/**
 * Seed / reshape Lab backlog spreadsheet for Owner ↔ Cursor sync.
 * Usage: node scripts/seed-lab-tasks.mjs
 */
import { readFileSync } from "node:fs";
import { createPrivateKey } from "node:crypto";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnv() {
  const raw = readFileSync(resolve(root, "arsis-lab/.env.local"), "utf8");
  const env = {};
  for (const line of raw.split(/\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    env[k] = v.replace(/\\n/g, "\n");
  }
  return env;
}

function normalizeKey(raw) {
  let k = raw.replace(/^\uFEFF/, "").trim();
  if (
    (k.startsWith('"') && k.endsWith('"')) ||
    (k.startsWith("'") && k.endsWith("'"))
  ) {
    k = k.slice(1, -1).trim();
  }
  k = k.replace(/\\n/g, "\n").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (k.trimStart().startsWith("{")) {
    const account = JSON.parse(k);
    return {
      email: account.client_email,
      privateKey: account.private_key.replace(/\\n/g, "\n"),
    };
  }
  createPrivateKey(k);
  return { privateKey: k };
}

const HEADERS = [
  "ID",
  "箱",
  "課題",
  "詳細",
  "優先度",
  "Cursor対応",
  "オーナー確認",
  "メモ",
  "更新日",
];

/** Fine-grained backlog from ecosystem plan (2026-08) */
const TASKS = [
  // Lab
  ["L01", "Lab", "BRIEFING と /map の内容を定期的に突き合わせる", "正本は orchestra-app-1/docs/ARSIS_LAB_BRIEFING.md。矛盾があれば BRIEFING を直し /map を追従", "中"],
  ["L02", "Lab", "README に Lab シート運用ルールを1段落追記", "Inbox / Adopted=実装へ / マスタブックと混ぜない、を明記", "低"],
  ["L03", "Lab", "仕分け UI（/）は保管のまま触らない", "機能追加禁止。地図とシート運用が主用途", "低"],
  ["L04", "Lab", "Target Project 列のレガシー（OneMeeting）方針を BRIEFING に残す", "地図からは外したがコード・旧行に残りうる旨を確認", "低"],
  // Docs / process
  ["D01", "Docs", "Context Bridge のリポジトリ名・場所を BRIEFING に1行追記", "5箱表記を完成させる", "中"],
  ["D02", "Docs", "setting-app README に Portal 統合予定と BRIEFING 参照を追記", "横断ドキュメントの重複を避ける", "中"],
  ["D03", "Docs", "orchestra-app BRIEFING の最終確認日を更新運用にする", "地図更新時は BRIEFING 同日更新", "低"],
  // Portal
  ["P01", "Portal", "マスタブック3タブ（Member page / AppData / Documents）の読み書きを点検", "日常運用の安定が最優先", "高"],
  ["P02", "Portal", "書類台帳（Documents）の Drive 直下取り込み仕様を再確認", "サブフォルダは自動で載らない旨を README と一致させる", "中"],
  ["P03", "Portal", "To do list タブと AppData タスクの二重管理を利用者向けに注記", "Portal 正本は AppData", "中"],
  ["P04", "Portal", "セッティング表タブ（旧 seating-chart）は setting-app 完成まで維持", "統合前に壊さない・大規模改修しない", "中"],
  ["P05", "Portal", "会計・口座情報を Portal に載せない方針を維持", "運営ガイドと BRIEFING の「守ること」と一致", "高"],
  // setting-app
  ["S01", "setting-app", "OrchestraCanvas 描画・席ドラッグのさらなる分割", "FUTURE_TASKS / README の未完了項目", "中"],
  ["S02", "setting-app", "JSON 読み込み失敗時の分かりやすいエラー表示", "ダッシュボード／インポートまわり", "中"],
  ["S03", "setting-app", "ホール図面など大きなデータの容量対策", "localStorage 上限対策", "中"],
  ["S04", "setting-app", "操作説明パネル（機能まとめ）を実装", "PC / iPad の範囲選択・パン操作を画面内に", "中"],
  ["S05", "setting-app", "PWA アイコン追加", "manifest 用アイコン整備", "低"],
  ["S06", "setting-app", "重要な配置の JSON バックアップ運用を README で強調", "統合前のデータ消失防止", "高"],
  ["S07", "setting-app", "Portal seating state とのデータ形式差分を一覧化する", "OrchestraConfig ↔ seating-state-v1 の対応表（設計メモ）", "高"],
  // Integration setting-app → Portal
  ["I01", "統合", "統合方針を決める（コンポーネント移植 / 共有 lib / 段階置換）", "BRIEFING に方針1段落を追記してから実装", "高"],
  ["I02", "統合", "localStorage キー移行計画を書く", "orchestra-setting-configs-v2 → Portal 側キー、既存データの移行手順", "高"],
  ["I03", "統合", "Portal に setting-app を組み込む試作ブランチ", "旧 seating-chart と並存可能な形で検証", "高"],
  ["I04", "統合", "旧 seating-chart.tsx と seating-state-v1 を廃止", "I03 完了・オーナー確認後", "中"],
  // arsis-site
  ["W01", "公開サイト", "Article / config とマスタブック連携の現状を確認", "Portal 未使用であることの再確認", "中"],
  ["W02", "公開サイト", "チケット表示・記事まわりの未解決課題をシートに追記", "見つかったものだけを細分化して追加行に", "低"],
  // Bridge
  ["B01", "Bridge", "Context Bridge の現状スコープを1段落で BRIEFING に書く", "推測実装禁止のまま、分かる範囲だけ", "中"],
  // Sheet ops
  ["T01", "運用", "このシートを Inbox として使う（手入力で行追加可）", "Cursor対応→実装、オーナー確認→完了の順", "高"],
  ["T02", "運用", "Adopted 相当は Cursor対応 ON、完了はオーナー確認 ON", "両方 ON = クローズ。片方だけは進行中", "高"],
];

async function main() {
  const env = loadEnv();
  const email = env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const sheetId = env.GOOGLE_SHEET_ID?.trim();
  const keyInfo = normalizeKey(env.GOOGLE_PRIVATE_KEY ?? "");
  const saEmail = keyInfo.email || email;
  if (!saEmail || !sheetId || !keyInfo.privateKey) {
    throw new Error("Missing GOOGLE_* env");
  }

  const jwt = new JWT({
    email: saEmail,
    key: keyInfo.privateKey,
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive.file",
    ],
  });

  const doc = new GoogleSpreadsheet(sheetId, jwt);
  await doc.loadInfo();
  console.log("Spreadsheet:", doc.title);
  console.log(
    "Existing sheets:",
    doc.sheetsByIndex.map((s) => s.title).join(", ")
  );

  const TAB = "課題ボード";
  let sheet = doc.sheetsByTitle[TAB];
  if (!sheet) {
    sheet = await doc.addSheet({
      title: TAB,
      headerValues: HEADERS,
    });
    console.log("Created sheet:", TAB);
  } else {
    await sheet.clear();
    await sheet.setHeaderRow(HEADERS);
    console.log("Cleared and reset headers on:", TAB);
  }

  const today = new Date().toLocaleDateString("ja-JP");
  const rows = TASKS.map(([id, area, title, detail, priority]) => ({
    ID: id,
    箱: area,
    課題: title,
    詳細: detail,
    優先度: priority,
    Cursor対応: false,
    オーナー確認: false,
    メモ: "",
    更新日: today,
  }));

  await sheet.addRows(rows);

  // Checkbox validation for Cursor対応 / オーナー確認 (cols F–G)
  const endRow = rows.length + 1; // header is row 1
  const res = await jwt.request({
    url: `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`,
    method: "POST",
    data: {
      requests: [
        {
          setDataValidation: {
            range: {
              sheetId: sheet.sheetId,
              startRowIndex: 1,
              endRowIndex: Math.max(endRow, 200),
              startColumnIndex: 5,
              endColumnIndex: 7,
            },
            rule: {
              condition: { type: "BOOLEAN" },
              showCustomUi: true,
            },
          },
        },
        {
          updateSheetProperties: {
            properties: {
              sheetId: sheet.sheetId,
              gridProperties: { frozenRowCount: 1 },
            },
            fields: "gridProperties.frozenRowCount",
          },
        },
        {
          autoResizeDimensions: {
            dimensions: {
              sheetId: sheet.sheetId,
              dimension: "COLUMNS",
              startIndex: 0,
              endIndex: HEADERS.length,
            },
          },
        },
      ],
    },
  });
  console.log("Applied checkbox validation + freeze header", res.status);

  // Optional: keep old first sheet note
  const first = doc.sheetsByIndex[0];
  if (first && first.title !== TAB) {
    console.log(
      "Note: existing sheet kept as-is:",
      first.title,
      "(new work lives in",
      TAB + ")"
    );
  }

  console.log(`Wrote ${rows.length} tasks to 「${TAB}」`);
  console.log(`URL: https://docs.google.com/spreadsheets/d/${sheetId}/edit`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
