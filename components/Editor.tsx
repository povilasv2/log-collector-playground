"use client";

import dynamic from "next/dynamic";

const MonacoEditor = dynamic(() => import("@monaco-editor/react").then((m) => m.default), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-neutral-500">Loading editor…</div>,
});

interface Props {
  value: string;
  onChange: (v: string) => void;
  language: string;
  readOnly?: boolean;
}

export function Editor({ value, onChange, language, readOnly }: Props) {
  return (
    <MonacoEditor
      value={value}
      language={language}
      theme="vs-dark"
      onChange={(v) => onChange(v ?? "")}
      options={{
        readOnly,
        minimap: { enabled: false },
        fontSize: 13,
        scrollBeyondLastLine: false,
        wordWrap: "on",
        renderWhitespace: "selection",
        automaticLayout: true,
      }}
    />
  );
}
