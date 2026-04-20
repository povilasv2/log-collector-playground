"use client";

import Link from "next/link";
import { COLLECTORS, COLLECTOR_IDS, type CollectorId } from "@/lib/collectors";

export function CollectorTabs({ active }: { active: CollectorId }) {
  return (
    <nav className="flex gap-1 border-b border-neutral-800 px-4 py-2">
      <div className="mr-auto flex items-center font-semibold">
        <span className="text-neutral-400">Log Collector</span>
        <span className="mx-2 text-neutral-600">/</span>
        <span>Playground</span>
      </div>
      {COLLECTOR_IDS.map((id) => (
        <Link
          key={id}
          href={`/${id}`}
          className={`rounded px-3 py-1 text-sm transition ${
            id === active
              ? "bg-neutral-100 text-neutral-900"
              : "text-neutral-300 hover:bg-neutral-800"
          }`}
        >
          {COLLECTORS[id].displayName}
        </Link>
      ))}
    </nav>
  );
}
