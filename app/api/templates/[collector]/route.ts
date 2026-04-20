import { NextRequest, NextResponse } from "next/server";
import { isCollectorId } from "@/lib/collectors";
import { TEMPLATES } from "@/lib/templates";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ collector: string }> },
) {
  const { collector } = await params;
  if (!isCollectorId(collector)) {
    return NextResponse.json({ error: "unknown collector" }, { status: 404 });
  }
  return NextResponse.json(TEMPLATES[collector]);
}
