import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { ServiceId } from "@/lib/types";

export const dynamic = "force-dynamic";

const ALL_SERVICES: ServiceId[] = ["oura", "whoop", "withings", "chronometer", "macrofactor", "ladder"];

export function GET() {
  const db = getDb();
  const rows = db.prepare("SELECT service, enabled FROM service_config").all() as { service: string; enabled: number }[];
  const map = Object.fromEntries(rows.map(r => [r.service, r.enabled === 1]));

  // Default all to enabled if not yet configured
  const result = Object.fromEntries(
    ALL_SERVICES.map(s => [s, s in map ? map[s] : true])
  );

  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const body = await req.json() as Record<string, boolean>;
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO service_config (service, enabled, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(service) DO UPDATE SET enabled = excluded.enabled, updated_at = datetime('now')
  `);

  for (const [service, enabled] of Object.entries(body)) {
    if (ALL_SERVICES.includes(service as ServiceId)) {
      stmt.run(service, enabled ? 1 : 0);
    }
  }

  return NextResponse.json({ ok: true });
}
