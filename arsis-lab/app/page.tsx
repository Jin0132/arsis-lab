'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  addToBacklog,
  analyzeNewsWithAI,
  type AnalyzedNewsItem,
  type BacklogStatus,
  type SheetTargetProjectCode,
} from './actions';

/** UI 表示名とスプレッドシート Target Project 列の値（Portal / Bridge / OneMeeting） */
const PROJECTS = [
  { label: 'Arsis Portal', sheetTarget: 'Portal', color: '#4CAF50' },
  { label: 'Context Bridge', sheetTarget: 'Bridge', color: '#2196F3' },
  { label: 'One Meeting', sheetTarget: 'OneMeeting', color: '#9C27B0' },
] as const;

type LabCardItem = AnalyzedNewsItem & { key: string };

export default function LabPage() {
  const [input, setInput] = useState('');
  const [items, setItems] = useState<LabCardItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  async function submitRow(
    card: LabCardItem,
    status: BacklogStatus,
    targetProject: SheetTargetProjectCode | ''
  ) {
    setPendingKey(card.key);
    try {
      await addToBacklog({
        title: card.title,
        suggestion: card.suggestion,
        status,
        targetProject,
      });
      setItems((prev) => prev.filter((x) => x.key !== card.key));
    } catch (e) {
      alert(e instanceof Error ? e.message : '登録に失敗しました');
    } finally {
      setPendingKey(null);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-8 font-sans dark:bg-black dark:text-white">
      <main className="mx-auto max-w-4xl space-y-8">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">Arsis Lab AI コックピット</h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            AI がニュースを課題化し、採用・保留・不採用をスプレッドシートへ記録します（Arsis Development
            Ecosystem v5.0）
          </p>
          <Link
            href="/map"
            className="mt-3 inline-block text-sm text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-300"
          >
            全体地図を見る
          </Link>
        </header>

        <section className="space-y-4">
          <textarea
            className="h-40 w-full rounded-2xl border bg-white p-4 text-black shadow-inner outline-none transition-all focus:ring-2 focus:ring-blue-500 dark:bg-zinc-900 dark:text-white"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="ニュースや記事を貼り付け..."
          />
          <button
            type="button"
            disabled={loading || !input.trim()}
            onClick={async () => {
              setError(null);
              setLoading(true);
              try {
                const res = await analyzeNewsWithAI(input);
                setItems(
                  res.map((item) => ({
                    ...item,
                    key:
                      typeof crypto !== 'undefined' && crypto.randomUUID
                        ? crypto.randomUUID()
                        : `${item.title}-${Math.random()}`,
                  }))
                );
              } catch (e) {
                setItems([]);
                setError(e instanceof Error ? e.message : '分析に失敗しました');
              } finally {
                setLoading(false);
              }
            }}
            className="w-full rounded-2xl bg-black py-4 font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {loading ? 'AI が分析中...' : 'AI に課題を抽出させる'}
          </button>
          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
              {error}
            </p>
          )}
        </section>

        {items.length > 0 && (
          <div className="space-y-4">
            <h2 className="border-b border-zinc-200 pb-2 text-xl font-semibold dark:border-zinc-800">
              抽出された課題 ({items.length} 件)
            </h2>
            <div className="space-y-4">
              {items.map((item, i) => {
                const busy = pendingKey === item.key;
                return (
                  <div
                    key={item.key}
                    className="rounded-2xl border bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <span className="text-xs font-bold uppercase tracking-widest text-blue-500">
                      Topic {i + 1}
                    </span>
                    <h3 className="mb-2 mt-1 text-lg font-bold">{item.title}</h3>
                    <p className="mb-6 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                      {item.suggestion}
                    </p>

                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
                      採用（ターゲットプロジェクト）
                    </p>
                    <div className="mb-4 flex flex-wrap gap-2">
                      {PROJECTS.map((proj) => (
                        <button
                          key={proj.sheetTarget}
                          type="button"
                          disabled={busy}
                          onClick={() => submitRow(item, 'Adopted', proj.sheetTarget)}
                          className="rounded-full px-4 py-2 text-xs font-bold text-white transition-all hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                          style={{ backgroundColor: proj.color }}
                        >
                          {proj.label} に採用
                        </button>
                      ))}
                    </div>

                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
                      その他
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => submitRow(item, 'Pending', '')}
                        className="rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-bold text-amber-900 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100 dark:hover:bg-amber-900"
                      >
                        保留
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => submitRow(item, 'Rejected', '')}
                        className="rounded-full border border-zinc-300 bg-zinc-100 px-4 py-2 text-xs font-bold text-zinc-800 transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                      >
                        不採用
                      </button>
                    </div>
                    {busy && (
                      <p className="mt-3 text-xs text-zinc-500">スプレッドシートに書き込み中...</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
