import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Arsis 全体地図",
  description:
    "Arsis Lab / Portal / 公開サイト / setting-app / Context Bridge の役割一覧（要約）",
};

const PROJECTS = [
  {
    name: "Arsis Lab",
    role: "このリポジトリ。全体地図（/map）と仕分け UI（/）",
    note: "仕分け UI は当面停止・保管。日常は /map で全体把握",
  },
  {
    name: "Arsis Portal",
    role: "団の内部運営",
    note: "orchestra-app-1。団員・公演・タスク・書類台帳・セッティング表タブ",
  },
  {
    name: "setting-app",
    role: "オーケストラ・セッティング表（独立アプリ）",
    note: "椅子・譜面台の配置。localStorage 保存。将来 Portal のセッティング表タブと入れ替え予定",
  },
  {
    name: "公開サイト",
    role: "対外サイト",
    note: "arsis-site。Article / config を使う想定",
  },
  {
    name: "Context Bridge",
    role: "文脈共有（別プロジェクト）",
    note: "Lab の Target 値は Bridge。詳細は各リポジトリ参照",
  },
] as const;

const SHEETS = [
  { tab: "Member page", portal: "使う", use: "団員マスタ" },
  { tab: "AppData", portal: "使う", use: "公演・練習・タスク・契約" },
  { tab: "Documents", portal: "使う", use: "書類台帳（URL と要約だけ）" },
  { tab: "Article", portal: "使わない", use: "公開サイトの記事" },
  { tab: "config", portal: "使わない", use: "公開サイトのスイッチ" },
  { tab: "To do list", portal: "使わない", use: "シート上の作業リスト。Portal のタスク正本は AppData" },
  { tab: "その他タブ", portal: "使わない", use: "URL集、フォーム、曲目・編成、練習場、緊急連絡先" },
] as const;

const ROUTES = [
  { what: "団員、公演、練習、書類台帳、マイページ", to: "Portal" },
  { what: "舞台上の座席・セッティング表", to: "setting-app（将来 Portal 内タブへ統合）" },
  { what: "公開サイトの記事・チケット表示", to: "arsis-site" },
  { what: "会計・送金・領収書", to: "別スプレッドシート / Drive。Portal には載せない" },
  { what: "文脈共有", to: "Context Bridge" },
  { what: "全体把握", to: "Lab /map（このページ）" },
] as const;

export default function MapPage() {
  return (
    <div className="min-h-screen bg-zinc-50 p-8 font-sans text-zinc-900 dark:bg-black dark:text-white">
      <main className="mx-auto max-w-4xl space-y-10">
        <header className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">
            Arsis Development Ecosystem
          </p>
          <h1 className="text-3xl font-bold tracking-tight">全体地図</h1>
          <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            機能はありません。各箱の役割と正本の場所だけを示します（要約版）。最終確認日
            2026-08-24。
          </p>
          <p className="text-xs text-zinc-400">
            正本:{" "}
            <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">
              orchestra-app-1/docs/ARSIS_LAB_BRIEFING.md
            </code>
          </p>
          <Link
            href="/"
            className="inline-block text-sm text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-300"
          >
            コックピットへ戻る
          </Link>
        </header>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Arsis Lab の現状</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            <li>
              <strong>仕分け UI（/）</strong>は完成済みだが、当面は使わない・機能追加もしない（保管）。
            </li>
            <li>
              <strong>全体地図（/map）</strong>が、このリポジトリの主な用途。
            </li>
            <li>
              Lab が書き込む先は <strong>別スプレッドシート</strong>（
              <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">GOOGLE_SHEET_ID</code>
              ）。課題の採用・保留・不採用を記録するバックログ用。
            </li>
            <li>
              <strong>マスタブック</strong>（『Arsis Chamber Orchestra』）とは別物。マスタブックは
              Portal / 公開サイトの運用データ正本。Lab のバックログはそこに混ぜない。
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">箱の役割</h2>
          <ul className="space-y-2">
            {PROJECTS.map((p) => (
              <li
                key={p.name}
                className="rounded-2xl border bg-white px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <p className="font-semibold">{p.name}</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-300">{p.role}</p>
                <p className="mt-1 text-xs text-zinc-400">{p.note}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">つながり</h2>
          <pre className="overflow-x-auto rounded-2xl border bg-white p-5 text-xs leading-relaxed text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
{`arsis-lab
  ├─ /map … 全体地図（要約・主用途）
  └─ / … 仕分け UI（保管・停止）

Portal ── orchestra-app-1 ── マスタブック
  │                 ├── Member page / AppData / Documents
  │                 ├── Drive『Arsis Chamber Orchestra』
  │                 ├── Docs『ArsisCO 運営ガイド』
  │                 └── セッティング表タブ（当面 localStorage）
  │                       ↓ 将来
setting-app ── セッティング表の新実装（localStorage → Portal へ統合予定）

公開サイト arsis-site ── Article / config（Portal とは別）

Context Bridge ── 文脈共有（別リポジトリ）`}
          </pre>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">setting-app（要点）</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            <li>リポジトリ: setting-app。Next.js。舞台上の椅子・譜面台・指揮台を配置。</li>
            <li>保存: ブラウザ localStorage（Git には載らない）。JSON 書き出しでバックアップ。</li>
            <li>Portal のセッティング表タブ（localStorage）より高機能。完成後に Portal 内へ置き換え予定。</li>
            <li>マスタブック・Drive とは未連携。座席データの正本は端末内（移行時に要設計）。</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">マスタブックのタブ</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            スプレッドシート『Arsis Chamber Orchestra』。Portal が読むのは3タブだけです。
          </p>
          <div className="overflow-x-auto rounded-2xl border bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <table className="w-full text-left text-sm">
              <thead className="border-b text-xs uppercase tracking-wide text-zinc-400 dark:border-zinc-800">
                <tr>
                  <th className="px-4 py-3 font-medium">タブ</th>
                  <th className="px-4 py-3 font-medium">Portal</th>
                  <th className="px-4 py-3 font-medium">用途</th>
                </tr>
              </thead>
              <tbody>
                {SHEETS.map((row) => (
                  <tr key={row.tab} className="border-b last:border-0 dark:border-zinc-800">
                    <td className="px-4 py-3 font-medium">{row.tab}</td>
                    <td className="px-4 py-3">{row.portal}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{row.use}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Google の正本</h2>
          <ul className="space-y-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            <li className="rounded-2xl border bg-white px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900">
              Drive『Arsis Chamber Orchestra』の直下は「書類（一般）」「第1回演奏会」「Arsis その他」。
              Portal の取り込みは直下だけを見ます。
            </li>
            <li className="rounded-2xl border bg-white px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900">
              運営ルールの正本はドキュメント『ArsisCO 運営ガイド』。Portal の書類台帳に登録済みです。
              リポジトリ内に operations-guide.md はありません。
              <div className="mt-2">
                <a
                  href="https://docs.google.com/document/d/10NZfpK_qB02rDlsvD_CIQ1VKnLBoOmwVhkuTw9ycYMU/edit"
                  target="_blank"
                  rel="noreferrer"
                  className="text-zinc-800 underline-offset-4 hover:underline dark:text-zinc-100"
                >
                  運営ガイドを開く
                </a>
              </div>
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">課題の振り分け</h2>
          <div className="overflow-x-auto rounded-2xl border bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <table className="w-full text-left text-sm">
              <thead className="border-b text-xs uppercase tracking-wide text-zinc-400 dark:border-zinc-800">
                <tr>
                  <th className="px-4 py-3 font-medium">内容</th>
                  <th className="px-4 py-3 font-medium">振り先</th>
                </tr>
              </thead>
              <tbody>
                {ROUTES.map((row) => (
                  <tr key={row.what} className="border-b last:border-0 dark:border-zinc-800">
                    <td className="px-4 py-3">{row.what}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{row.to}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">守ること</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            <li>口座・振込先は Portal に載せない。</li>
            <li>書類の本文を Portal に複製しない。台帳は URL と要約。</li>
            <li>NotebookLM の中身は読めない。URL だけ残す。</li>
            <li>会計ブックは Portal 未接続。会計機能を Portal に足す提案はしない。</li>
            <li>Portal は Next.js。GAS 前提で語らない。</li>
            <li>セッティング表は setting-app で育て、Portal へ統合するまで二重実装を意識する。</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
