"use client";

import { useCallback, useEffect, useState } from "react";
import { COLLECTORS, type CollectorId } from "@/lib/collectors";
import type { RunResult } from "@/lib/runner";
import { Editor } from "./Editor";
import { OutputPanel } from "./OutputPanel";

interface InitialTemplate {
  config: string;
  input: string;
}

function readHash(): InitialTemplate | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash) return null;
  try {
    const json = atob(decodeURIComponent(hash));
    const parsed = JSON.parse(json);
    if (typeof parsed.c === "string" && typeof parsed.i === "string") {
      return { config: parsed.c, input: parsed.i };
    }
  } catch { /* ignore */ }
  return null;
}

function writeHash(config: string, input: string) {
  const encoded = encodeURIComponent(btoa(JSON.stringify({ c: config, i: input })));
  history.replaceState(null, "", `#${encoded}`);
}

export function Playground({
  collector,
  initial,
}: {
  collector: CollectorId;
  initial: InitialTemplate;
}) {
  const [config, setConfig] = useState(initial.config);
  const [input, setInput] = useState(initial.input);
  const [result, setResult] = useState<RunResult | null>(null);
  const [isRunning, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fromHash = readHash();
    if (fromHash) {
      setConfig(fromHash.config);
      setInput(fromHash.input);
    }
  }, []);

  const run = useCallback(async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ collector, config, input }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }));
        setError(body.error || `HTTP ${res.status}`);
        setResult(null);
      } else {
        setResult(await res.json());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  }, [collector, config, input]);

  const share = useCallback(() => {
    writeHash(config, input);
    navigator.clipboard?.writeText(window.location.href).catch(() => {});
  }, [config, input]);

  const loadExample = useCallback(() => {
    setConfig(initial.config);
    setInput(initial.input);
  }, [initial]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); run(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [run]);

  const lang = COLLECTORS[collector].monacoLanguage;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-neutral-800 px-4 py-2">
        <button
          onClick={run}
          disabled={isRunning}
          className="rounded bg-emerald-600 px-3 py-1 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {isRunning ? "Running…" : "Run (⌘/Ctrl+Enter)"}
        </button>
        <button
          onClick={loadExample}
          className="rounded border border-neutral-700 px-3 py-1 text-sm text-neutral-300 hover:bg-neutral-800"
        >
          Load example
        </button>
        <button
          onClick={share}
          className="rounded border border-neutral-700 px-3 py-1 text-sm text-neutral-300 hover:bg-neutral-800"
        >
          Copy share link
        </button>
        <a
          href={COLLECTORS[collector].docsUrl}
          target="_blank"
          rel="noreferrer"
          className="ml-auto text-sm text-neutral-400 hover:text-neutral-200"
        >
          {COLLECTORS[collector].displayName} docs ↗
        </a>
      </div>
      {error && (
        <div className="border-b border-red-900 bg-red-950/50 px-4 py-2 text-sm text-red-300">
          {error}
        </div>
      )}
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-px bg-neutral-800">
        <div className="flex min-h-0 flex-col bg-neutral-950">
          <header className="border-b border-neutral-800 px-3 py-1 text-xs uppercase tracking-wide text-neutral-400">
            Config
          </header>
          <div className="min-h-0 flex-1">
            <Editor value={config} onChange={setConfig} language={lang} />
          </div>
        </div>
        <div className="grid min-h-0 grid-rows-2 gap-px bg-neutral-800">
          <div className="flex min-h-0 flex-col bg-neutral-950">
            <header className="border-b border-neutral-800 px-3 py-1 text-xs uppercase tracking-wide text-neutral-400">
              Input (input.log)
            </header>
            <div className="min-h-0 flex-1">
              <Editor value={input} onChange={setInput} language="log" />
            </div>
          </div>
          <div className="flex min-h-0 flex-col bg-neutral-950">
            <header className="border-b border-neutral-800 px-3 py-1 text-xs uppercase tracking-wide text-neutral-400">
              Output
            </header>
            <div className="min-h-0 flex-1">
              <OutputPanel result={result} isRunning={isRunning} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
