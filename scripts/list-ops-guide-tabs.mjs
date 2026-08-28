import { readFileSync } from "node:fs";
import { createPrivateKey } from "node:crypto";
import { JWT } from "google-auth-library";

const raw = readFileSync(
  new URL("../arsis-lab/.env.local", import.meta.url),
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
  url: `https://docs.googleapis.com/v1/documents/${docId}?includeTabsContent=true`,
});
const d = res.data;

function summarize(tab, path) {
  const content = tab.documentTab?.body?.content || [];
  let paras = 0;
  const headings = [];
  for (const el of content) {
    if (el.paragraph) {
      const style = el.paragraph.paragraphStyle?.namedStyleType || "";
      const t = (el.paragraph.elements || [])
        .map((e) => e.textRun?.content || "")
        .join("")
        .replace(/\n$/, "")
        .trim();
      if (!t) continue;
      paras++;
      if (style.includes("HEADING") || /^#{1,3}\s/.test(t) || t.length < 40)
        headings.push(t.slice(0, 60));
    } else if (el.table) {
      paras += 10;
      headings.push("[TABLE]");
    }
  }
  console.log(`\n### ${path} (blocks≈${paras})`);
  for (const h of headings.slice(0, 25)) console.log(" -", h);
  if (headings.length > 25) console.log(" - ... +" + (headings.length - 25));
}

console.log("TITLE:", d.title);
console.log("top tabs:", (d.tabs || []).length);
for (const tab of d.tabs || []) {
  const title = tab.tabProperties?.title || "?";
  summarize(tab, title);
  for (const c of tab.childTabs || []) {
    summarize(c, `${title} / ${c.tabProperties?.title}`);
  }
}
