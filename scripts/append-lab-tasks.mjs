/**
 * Append (or upsert by ID) rows on the Lab 「課題ボード」 tab.
 * Does NOT clear existing rows or checkboxes.
 *
 * Usage:
 *   node scripts/append-lab-tasks.mjs tasks.json
 *   echo '[{"箱":"Lab","課題":"...","詳細":"...","優先度":"中"}]' | node scripts/append-lab-tasks.mjs
 *
 * Task object: { ID?, 箱, 課題, 詳細, 優先度, メモ? }
 * If ID is omitted, the next ID for that 箱 prefix is assigned.
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

const AREA_PREFIX = {
  Lab: "L",
  Docs: "D",
  Portal: "P",
  "setting-app": "S",
  統合: "I",
  公開サイト: "W",
  Bridge: "B",
  運用: "T",
};

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

function nextId(existingIds, area) {
  const prefix = AREA_PREFIX[area] || "X";
  let max = 0;
  const re = new RegExp(`^${prefix}(\\d+)$`);
  for (const id of existingIds) {
    const m = String(id).match(re);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `${prefix}${String(max + 1).padStart(2, "0")}`;
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

async function loadTasks() {
  const arg = process.argv[2];
  const raw = arg
    ? readFileSync(resolve(arg), "utf8")
    : await readStdin();
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("Expected a non-empty JSON array of tasks");
  }
  return parsed;
}

async function main() {
  const tasks = await loadTasks();
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
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const doc = new GoogleSpreadsheet(sheetId, jwt);
  await doc.loadInfo();
  const sheet = doc.sheetsByTitle[TAB];
  if (!sheet) {
    throw new Error(`Tab 「${TAB}」 not found. Run seed-lab-tasks.mjs first.`);
  }

  await sheet.loadHeaderRow();
  const rows = await sheet.getRows();
  const byId = new Map(rows.map((r) => [String(r.get("ID") ?? ""), r]));
  const existingIds = [...byId.keys()];
  const today = new Date().toLocaleDateString("ja-JP");

  const added = [];
  const updated = [];

  for (const t of tasks) {
    const area = String(t["箱"] ?? t.area ?? "").trim();
    const title = String(t["課題"] ?? t.title ?? "").trim();
    const detail = String(t["詳細"] ?? t.detail ?? "").trim();
    const priority = String(t["優先度"] ?? t.priority ?? "中").trim() || "中";
    const memo = String(t["メモ"] ?? t.memo ?? "").trim();
    if (!area || !title) {
      throw new Error(`Task missing 箱 or 課題: ${JSON.stringify(t)}`);
    }

    let id = String(t.ID ?? t.id ?? "").trim();
    if (id && byId.has(id)) {
      const row = byId.get(id);
      row.set("箱", area);
      row.set("課題", title);
      if (detail) row.set("詳細", detail);
      if (priority) row.set("優先度", priority);
      if (memo) {
        const prev = String(row.get("メモ") ?? "").trim();
        row.set("メモ", prev ? `${prev}\n${memo}` : memo);
      }
      row.set("更新日", today);
      await row.save();
      updated.push(id);
      continue;
    }

    if (!id) id = nextId(existingIds, area);
    existingIds.push(id);

    const created = await sheet.addRow({
      ID: id,
      箱: area,
      課題: title,
      詳細: detail,
      優先度: priority,
      Cursor対応: false,
      オーナー確認: false,
      メモ: memo,
      更新日: today,
    });
    byId.set(id, created);
    added.push(id);
  }

  console.log(JSON.stringify({ added, updated, url: `https://docs.google.com/spreadsheets/d/${sheetId}/edit` }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
