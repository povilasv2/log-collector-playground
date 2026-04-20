import { NextRequest, NextResponse } from "next/server";
import { isCollectorId } from "@/lib/collectors";
import { checkRateLimit } from "@/lib/rate-limit";
import { LIMITS, runCollector } from "@/lib/runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

function byteLen(s: string): number {
  return Buffer.byteLength(s, "utf8");
}

export async function POST(req: NextRequest) {
  let body: { collector?: unknown; config?: unknown; input?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const { collector, config, input } = body;
  if (typeof collector !== "string" || !isCollectorId(collector)) {
    return NextResponse.json({ error: "unknown collector" }, { status: 400 });
  }
  if (typeof config !== "string" || typeof input !== "string") {
    return NextResponse.json({ error: "config and input must be strings" }, { status: 400 });
  }
  if (byteLen(config) > LIMITS.configBytes) {
    return NextResponse.json(
      { error: `config exceeds ${LIMITS.configBytes} bytes` },
      { status: 413 },
    );
  }
  if (byteLen(input) > LIMITS.inputBytes) {
    return NextResponse.json(
      { error: `input exceeds ${LIMITS.inputBytes} bytes` },
      { status: 413 },
    );
  }

  const ip = clientIp(req);
  const rl = checkRateLimit(ip);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate limit exceeded", retryAfterMs: rl.retryAfterMs },
      { status: 429, headers: { "retry-after": String(Math.ceil(rl.retryAfterMs / 1000)) } },
    );
  }

  const result = await runCollector(collector, config, input);
  return NextResponse.json(result);
}
