"use client";

import type { RunResult } from "@/lib/runner";

export function OutputPanel({ result, isRunning }: { result: RunResult | null; isRunning: boolean }) {
  if (isRunning) {
    return (
      <div className="flex h-full items-center justify-center text-neutral-400">
        Running…
      </div>
    );
  }
  if (!result) {
    return (
      <div className="flex h-full items-center justify-center text-neutral-500">
        Press <kbd className="mx-1 rounded border border-neutral-700 px-1">Run</kbd> to execute.
      </div>
    );
  }
  const ok = result.exitCode === 0 && !result.timedOut;
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-neutral-800 px-3 py-1.5 text-xs">
        <span className={ok ? "text-emerald-400" : "text-red-400"}>
          {result.timedOut
            ? "timed out"
            : `exit ${result.exitCode ?? "?"}`}
        </span>
        <span className="text-neutral-500">{result.durationMs} ms</span>
        {result.truncated && <span className="text-amber-400">output truncated</span>}
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-auto font-mono text-xs">
        {result.stdout && (
          <section>
            <header className="sticky top-0 bg-neutral-900 px-3 py-1 text-neutral-400">stdout</header>
            <pre className="whitespace-pre-wrap break-words px-3 py-2 text-neutral-100">{result.stdout}</pre>
          </section>
        )}
        {result.stderr && (
          <section>
            <header className="sticky top-0 bg-neutral-900 px-3 py-1 text-neutral-400">stderr</header>
            <pre className="whitespace-pre-wrap break-words px-3 py-2 text-red-300">{result.stderr}</pre>
          </section>
        )}
        {!result.stdout && !result.stderr && (
          <div className="p-3 text-neutral-500">(no output)</div>
        )}
      </div>
    </div>
  );
}
