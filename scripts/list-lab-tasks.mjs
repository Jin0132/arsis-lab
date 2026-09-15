/**
 * Dump 課題ボード rows as JSON (no secrets).
 * Usage: node scripts/list-lab-tasks.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createPrivateKey } from "node:crypto";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const TAB = "課題ボード";
const COLS = [
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

function loadEnv() {
  const raw = readFileSync(resolve(root, ".env.local"), "utf8");
  const env = {};
  for (const line of raw.split(/\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

function normalizeKey(raw) {
  let k = String(raw ?? "").replace(/^\uFEFF/, "").trim();
  if (
    (k.startsWith('"') && k.endsWith('"')) ||
    (k.startsWith("'") && k.endsWith("'"))
  ) {
    k = k.slice(1, -1).trim();
  }
  k = k.replace(/\\n/g, "\n");
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

const env = loadEnv();
const keyInfo = normalizeKey(env.GOOGLE_PRIVATE_KEY ?? "");
const jwt = new JWT({
  email: keyInfo.email || env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: keyInfo.privateKey,
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});
const doc = new GoogleSpreadsheet(env.GOOGLE_SHEET_ID, jwt);
await doc.loadInfo();
const sheet = doc.sheetsByTitle[TAB];
if (!sheet) throw new Error(`Tab 「${TAB}」 not found`);
await sheet.loadHeaderRow();
const headers = sheet.headerValues;
const rows = await sheet.getRows();
const out = rows.map((r, i) => {
  const obj = { _row: i + 2 };
  for (const c of COLS) obj[c] = r.get(c) ?? "";
  return obj;
});
const dest = resolve(root, "scripts/.lab-tasks-dump.json");
writeFileSync(
  dest,
  JSON.stringify({ headers, count: out.length, rows: out }, null, 2)
);
console.log(JSON.stringify({ ok: true, count: out.length, headers, dest: "scripts/.lab-tasks-dump.json" }));
