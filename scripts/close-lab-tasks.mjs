/**
 * Set Cursor対応 / オーナー確認 on existing 課題ボード rows by ID.
 * Does not add or delete rows.
 *
 * Usage:
 *   node scripts/close-lab-tasks.mjs P01
 *   node scripts/close-lab-tasks.mjs P01 D04 --memo "..."
 */
import { readFileSync } from "node:fs";
import { createPrivateKey } from "node:crypto";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const TAB = "課題ボード";

function loadEnv() {
  const raw = readFileSync(resolve(root, ".env.local"), "utf8");
  const env = {};
  for (const line of raw.split(/\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    env[t.slice(0, i).trim()] = v.replace(/\\n/g, "\n");
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

const args = process.argv.slice(2);
const memoIdx = args.indexOf("--memo");
const memo = memoIdx >= 0 ? args[memoIdx + 1] : "";
const ids = args.filter((a, i) => a !== "--memo" && i !== memoIdx + 1);
if (ids.length === 0) {
  console.error("Usage: node scripts/close-lab-tasks.mjs ID [ID...] [--memo text]");
  process.exit(1);
}

const env = loadEnv();
const keyInfo = normalizeKey(env.GOOGLE_PRIVATE_KEY ?? "");
const jwt = new JWT({
  email: keyInfo.email || env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: keyInfo.privateKey,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
const doc = new GoogleSpreadsheet(env.GOOGLE_SHEET_ID, jwt);
await doc.loadInfo();
const sheet = doc.sheetsByTitle[TAB];
if (!sheet) throw new Error(`Tab 「${TAB}」 not found`);
await sheet.loadHeaderRow();
const rows = await sheet.getRows();
const today = new Date().toLocaleDateString("ja-JP");
const closed = [];
for (const id of ids) {
  const row = rows.find((r) => String(r.get("ID")) === id);
  if (!row) throw new Error(`ID not found: ${id}`);
  row.set("Cursor対応", true);
  row.set("オーナー確認", true);
  if (memo) {
    const prev = String(row.get("メモ") ?? "").trim();
    row.set("メモ", prev ? `${prev}\n${memo}` : memo);
  }
  row.set("更新日", today);
  await row.save();
  closed.push(id);
}
console.log(JSON.stringify({ closed }));
