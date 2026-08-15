# Arsis Lab

Arsis Development Ecosystem 向けの **AI コックピット**です。ニュースや記事を貼り付けると Gemini が課題化し、採用・保留・不採用を Google スプレッドシートへ記録します。

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
| `GOOGLE_SHEET_ID` | 書き込み先スプレッドシートの ID |

サービスアカウントに、対象シートの編集権限を付与してください。

シート1行目のヘッダーはコード側と一致させる必要があります（例: `Status (Pending/Adopted/Rejected)`、`Target Project (Portal/Bridge/OneMeeting)`）。

## 起動

リポジトリの **ルート**で実行します。

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開きます。

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
│   │   ├── page.tsx       ← UI（コックピット）
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
