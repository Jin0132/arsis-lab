/**
 * Remove empty 課題ボード rows (checkbox-only) so real tasks sit together.
 * Does not change filled rows' checkboxes. Does not re-seed.
 *
 * Usage: node scripts/compact-lab-tasks.mjs
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

function isEmptyTask(r) {
  return ![r.get("ID"), r.get("箱"), r.get("課題"), r.get("詳細"), r.get("メモ"), r.get("更新日")]
    .some((v) => String(v ?? "").trim());
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

const emptyA1 = [];
for (const r of rows) {
  if (isEmptyTask(r)) emptyA1.push(r.rowNumber);
}

if (emptyA1.length === 0) {
  console.log(JSON.stringify({ ok: true, deleted: 0 }));
  process.exit(0);
}

emptyA1.sort((a, b) => a - b);
const first = emptyA1[0];
const last = emptyA1[emptyA1.length - 1];
const contiguous = emptyA1.every((n, i) => n === first + i);
if (!contiguous) {
  throw new Error(`Empty rows are not a single block: ${first}-${last} count=${emptyA1.length}`);
}

// Sheets API: 0-based, endIndex exclusive. A1 row N → index N-1.
await sheet.deleteRows(first - 1, last);

const today = new Date().toLocaleDateString("ja-JP");
const after = await sheet.getRows();
const b01 = after.find((r) => String(r.get("ID")) === "B01");
if (b01) {
  const prev = String(b01.get("メモ") ?? "").trim();
  b01.set("ID", "T08");
  b01.set("箱", "運用");
  b01.set(
    "メモ",
    [prev, "旧ID B01。プレフィックスを運用(T)に揃えた"].filter(Boolean).join("\n")
  );
  b01.set("更新日", today);
  await b01.save();
}

const remainingEmpty = (await sheet.getRows()).filter(isEmptyTask).length;
const filled = (await sheet.getRows()).filter((r) => !isEmptyTask(r)).map((r) => r.get("ID"));
console.log(
  JSON.stringify({
    ok: true,
    deletedEmpty: emptyA1.length,
    deletedA1: `${first}-${last}`,
    renamed: b01 ? "B01→T08" : null,
    remainingEmpty,
    filledIds: filled,
  })
);
