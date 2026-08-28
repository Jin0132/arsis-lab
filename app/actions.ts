'use server';

import { createPrivateKey } from 'node:crypto';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

export type AnalyzedNewsItem = {
  title: string;
  suggestion: string;
};

export type BacklogStatus = 'Adopted' | 'Pending' | 'Rejected';

/** Target Project 列に書く値（採用時のみ。保留・不採用は空） */
export type SheetTargetProjectCode = 'Portal' | 'Bridge' | 'OneMeeting';

export type BacklogPayload = {
  /** スプレッドシートの Source 列（見出し） */
  title: string;
  suggestion: string;
  /** 列名: Status (Pending/Adopted/Rejected) */
  status: BacklogStatus;
  /** 列名: Target Project (Portal/Bridge/OneMeeting)。該当なしは '' */
  targetProject: SheetTargetProjectCode | '';
};

/** スプレッドシート1行目のヘッダー文字列と完全一致させる */
const HEADER_STATUS = 'Status (Pending/Adopted/Rejected)';
const HEADER_TARGET_PROJECT = 'Target Project (Portal/Bridge/OneMeeting)';

function getGeminiClient() {
  const key = process.env.GEMINI_API_KEY;
  if (!key?.trim()) {
    throw new Error(
      'GEMINI_API_KEY が設定されていません。.env.local に Gemini の API キーを追加してください。'
    );
  }
  return new GoogleGenerativeAI(key);
}

/** .env 由来の文字列を PEM として読める形に揃える（OpenSSL DECODER unsupported の主因を潰す） */
function normalizePrivateKeyPem(raw: string): string {
  let k = raw.replace(/^\uFEFF/, '').trim();
  if (
    (k.startsWith('"') && k.endsWith('"')) ||
    (k.startsWith("'") && k.endsWith("'"))
  ) {
    k = k.slice(1, -1).trim();
  }
  k = k.replace(/\\n/g, '\n');
  k = k.replace(/\r\n/g, '\n');
  k = k.replace(/\r/g, '\n');
  return k.trim();
}

type ServiceAccountJson = {
  type?: string;
  client_email?: string;
  private_key?: string;
};

/**
 * GOOGLE_PRIVATE_KEY に PEM だけでなくサービスアカウント JSON 全体が入っている場合も解釈する。
 */
function resolveSheetsCredentials(): { email: string; privateKey: string; sheetId: string } {
  const sheetId = process.env.GOOGLE_SHEET_ID?.trim() ?? '';
  let email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() ?? '';
  let keyMaterial = process.env.GOOGLE_PRIVATE_KEY ?? '';

  keyMaterial = keyMaterial.replace(/^\uFEFF/, '').trim();
  if (
    (keyMaterial.startsWith('"') && keyMaterial.endsWith('"')) ||
    (keyMaterial.startsWith("'") && keyMaterial.endsWith("'"))
  ) {
    keyMaterial = keyMaterial.slice(1, -1);
  }

  if (keyMaterial.trimStart().startsWith('{')) {
    try {
      const account = JSON.parse(keyMaterial) as ServiceAccountJson;
      if (account.private_key) {
        keyMaterial = account.private_key;
        if (!email && account.client_email) {
          email = account.client_email.trim();
        }
      }
    } catch {
      // JSON でなければ PEM として続行
    }
  }

  const privateKey = normalizePrivateKeyPem(keyMaterial);

  if (!email || !privateKey || !sheetId) {
    throw new Error(
      'Google Sheets 用の環境変数が不足しています。GOOGLE_SERVICE_ACCOUNT_EMAIL・GOOGLE_PRIVATE_KEY・GOOGLE_SHEET_ID を設定してください。'
    );
  }

  if (!privateKey.includes('BEGIN') || !privateKey.includes('PRIVATE KEY')) {
    throw new Error(
      'GOOGLE_PRIVATE_KEY が PEM 形式ではありません。サービスアカウント JSON の "private_key" の値（-----BEGIN PRIVATE KEY----- で始まる）か、JSON ファイル全体を 1 行で貼り付けてください。'
    );
  }

  try {
    createPrivateKey(privateKey);
  } catch {
    throw new Error(
      'GOOGLE_PRIVATE_KEY を秘密鍵として読み取れませんでした（OpenSSL: DECODER routines::unsupported と同等の状態です）。.env の外側の引用符、改行が \\n の1本か実改行か、コピー欠け（BEGIN/END 行）を確認してください。'
    );
  }

  return { email, privateKey, sheetId };
}

function getSheetsJwt() {
  const { email, privateKey, sheetId } = resolveSheetsCredentials();

  return {
    jwt: new JWT({
      email,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    }),
    sheetId,
  };
}

function parseAnalysisJson(raw: string): AnalyzedNewsItem[] {
  const cleaned = raw
    .replace(/```json\s*/gi, '')
    .replace(/```/g, '')
    .trim();
  const parsed: unknown = JSON.parse(cleaned);
  if (!Array.isArray(parsed)) {
    throw new Error('AI の出力が JSON 配列ではありません。');
  }
  return parsed.map((entry, i) => {
    const row = entry as Record<string, unknown>;
    return {
      title: String(row.title ?? `ニュース ${i + 1}`),
      suggestion: String(row.suggestion ?? ''),
    };
  });
}

/** 貼り付けテキストから開発課題（Suggestion）を JSON 配列で抽出 */
export async function analyzeNewsWithAI(text: string): Promise<AnalyzedNewsItem[]> {
  const trimmed = text?.trim();
  if (!trimmed) {
    throw new Error('分析するテキストが空です。');
  }

  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

  const prompt = `
以下のニュース・記事テキストを分析し、開発課題（Suggestion）を抽出してください。
出力は必ず以下の JSON 配列形式のみにしてください（前置き・解説・マークダウンは不要）。
[{"title": "見出し", "suggestion": "具体的な開発提案"}]

テキスト:
${trimmed}
`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  const raw = response.text();
  try {
    return parseAnalysisJson(raw);
  } catch {
    throw new Error(
      'AI の応答を JSON として解釈できませんでした。もう一度実行するか、入力を短く分けて試してください。'
    );
  }
}

/** スプレッドシートのバックログに1行追加（ヘッダー行の表記とキーを一致） */
export async function addToBacklog(data: BacklogPayload): Promise<void> {
  const { jwt, sheetId } = getSheetsJwt();
  const doc = new GoogleSpreadsheet(sheetId, jwt);
  await doc.loadInfo();
  const sheet = doc.sheetsByIndex[0];

  await sheet.addRow({
    Date: new Date().toLocaleString('ja-JP'),
    Source: data.title,
    Suggestion: data.suggestion,
    [HEADER_STATUS]: data.status,
    [HEADER_TARGET_PROJECT]: data.targetProject,
  });
}
