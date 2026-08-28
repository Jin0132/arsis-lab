import { readFileSync } from "node:fs";
import { createPrivateKey } from "node:crypto";
import { JWT } from "google-auth-library";

const raw = readFileSync(
  new URL("../.env.local", import.meta.url),
  "utf8"
);
const env = {};
for (const line of raw.split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i < 0) continue;
  let k = t.slice(0, i).trim();
  let v = t.slice(i + 1).trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1);
  }
  env[k] = v.replace(/\\n/g, "\n");
}

let key = env.GOOGLE_PRIVATE_KEY.replace(/^\uFEFF/, "").trim();
if (
  (key.startsWith('"') && key.endsWith('"')) ||
  (key.startsWith("'") && key.endsWith("'"))
) {
  key = key.slice(1, -1);
}
key = key.replace(/\\n/g, "\n");
createPrivateKey(key);

const jwt = new JWT({
  email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key,
  scopes: ["https://www.googleapis.com/auth/documents.readonly"],
});

const docId = "10NZfpK_qB02rDlsvD_CIQ1VKnLBoOmwVhkuTw9ycYMU";
const res = await jwt.request({
  url: `https://docs.googleapis.com/v1/documents/${docId}`,
});
const body = res.data;
const lines = [];
for (const el of body.body?.content || []) {
  if (el.paragraph) {
    const style = el.paragraph.paragraphStyle?.namedStyleType || "NORMAL";
    const t = (el.paragraph.elements || [])
      .map((e) => e.textRun?.content || "")
      .join("")
      .replace(/\n$/, "");
    if (!t.trim()) continue;
    lines.push(style.includes("HEADING") ? `\n## ${t}` : t);
  } else if (el.table) {
    lines.push("\n[TABLE]");
    for (const row of el.table.tableRows || []) {
      const cells = (row.tableCells || []).map((c) =>
        (c.content || [])
          .map((ce) => {
            if (!ce.paragraph) return "";
            return (ce.paragraph.elements || [])
              .map((e) => e.textRun?.content || "")
              .join("")
              .replace(/\n/g, " ")
              .trim();
          })
          .filter(Boolean)
          .join(" ")
      );
      lines.push("| " + cells.join(" | ") + " |");
    }
  }
}
console.log("TITLE:", body.title);
console.log(lines.join("\n"));
