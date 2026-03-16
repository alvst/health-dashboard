import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export function GET() {
  const db = getDb();
  const rows = db.prepare("SELECT source, enabled FROM source_settings ORDER BY source").all() as {
    source: string;
    enabled: number;
  }[];
  return NextResponse.json(rows.map((r) => ({ source: r.source, enabled: r.enabled === 1 })));
}

export async function PATCH(req: NextRequest) {
  const { source, enabled } = (await req.json()) as { source: string; enabled: boolean };
  const db = getDb();
  db.prepare("UPDATE source_settings SET enabled = ? WHERE source = ?").run(enabled ? 1 : 0, source);
  return NextResponse.json({ ok: true });
}
