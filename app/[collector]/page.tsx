import { notFound } from "next/navigation";
import { CollectorTabs } from "@/components/CollectorTabs";
import { Playground } from "@/components/Playground";
import { isCollectorId, COLLECTOR_IDS } from "@/lib/collectors";
import { TEMPLATES } from "@/lib/templates";

export function generateStaticParams() {
  return COLLECTOR_IDS.map((id) => ({ collector: id }));
}

export default async function CollectorPage({
  params,
}: {
  params: Promise<{ collector: string }>;
}) {
  const { collector } = await params;
  if (!isCollectorId(collector)) notFound();
  const initial = TEMPLATES[collector];
  return (
    <div className="flex h-screen flex-col">
      <CollectorTabs active={collector} />
      <Playground collector={collector} initial={initial} />
    </div>
  );
}
