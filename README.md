# Arsis Lab

Arsis Development Ecosystem の **全体地図**（`/map`）と、保管中の **AI 仕分け UI**（`/`）を置くリポジトリです。

- **主用途**: [http://localhost:3000/map](http://localhost:3000/map) — エコシステム全体の要約（正本は `orchestra-app-1/docs/ARSIS_LAB_BRIEFING.md`）
- **保管**: `/` の仕分け UI — ニュースを課題化し、別スプレッドシートへ記録（当面停止）

## 必要なもの

- Node.js 20 以降（推奨）
- npm
- Google AI Studio などの **Gemini API キー**
- Google Cloud の **サービスアカウント**（Sheets API 利用）と対象スプレッドシート

## セットアップ

```bash
git clone https://github.com/Jin0132/arsis-lab.git
cd arsis-lab
npm install
```

### 環境変数

`arsis-lab/.env.local` を作成し、次を設定します（サンプルは `.env.example` を参照）。

| 変数名 | 用途 |
|--------|------|
| `GEMINI_API_KEY` | Gemini API キー |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | サービスアカウントのメール |
| `GOOGLE_PRIVATE_KEY` | サービスアカウントの秘密鍵（PEM。`\n` を含む文字列可）。JSON 全体を貼っても可 |
| `GOOGLE_SHEET_ID` | Lab バックログ用スプレッドシートの ID（マスタブックとは別） |

サービスアカウントに、対象シートの編集権限を付与してください。

シート1行目のヘッダーはコード側と一致させる必要があります（例: `Status (Pending/Adopted/Rejected)`、`Target Project (Portal/Bridge/OneMeeting)`）。

## 起動

リポジトリの **ルート**で実行します。

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開きます。全体地図（機能なし）は [http://localhost:3000/map](http://localhost:3000/map) です。

### 課題ボード（スプレッドシート）

Lab 用シート（`GOOGLE_SHEET_ID`・ブック名「arsis-lab マスターシート」）のタブ **「課題ボード」** が、横断課題の Inbox です（マスタブックとは別）。

| 列 | 意味 |
|----|------|
| Cursor対応 | Cursor / 実装側が完了したら ON |
| オーナー確認 | オーナーが確認したら ON（両方 ON でクローズ） |

- 優先度の目安: 高 → 中 → 低。手で行を追加してよい
- 再シード（上書き）: `node scripts/seed-lab-tasks.mjs`（既存のチェックは消えるので注意）

| コマンド | 内容 |
|----------|------|
| `npm run dev` | 開発サーバー |
| `npm run build` | 本番ビルド |
| `npm run start` | 本番サーバー |
| `npm run lint` | ESLint |

## ディレクトリ構成

```
arsis-lab/                 ← Git / npm のルート（この README）
├── package.json           ← スクリプトはここから実行
├── .env.example
├── arsis-lab/             ← Next.js アプリ本体
│   ├── .env.local         ← 秘密情報（Git 管理外）
│   ├── app/
│   │   ├── map/page.tsx   ← 全体地図（主用途）
│   │   ├── page.tsx       ← 仕分け UI（保管）
│   │   └── actions.ts     ← Gemini / Sheets 連携
│   └── ...
└── README.md
```

## セキュリティ

- `.env.local` はコミットしません
- API キーや秘密鍵をチャット・画面共有に貼らないでください
- 漏洩の疑いがある場合はキーを無効化し、再発行してください

## ライセンス

Private（社内 / 個人利用想定）
