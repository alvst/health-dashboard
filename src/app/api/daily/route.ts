import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { SOURCE_COLUMNS } from "@/lib/sources";

export const dynamic = "force-dynamic";

function applySourceFilter(
  row: Record<string, unknown>,
  disabledCols: Set<string>
): Record<string, unknown> {
  if (disabledCols.size === 0) return row;
  const out = { ...row };
  for (const col of disabledCols) out[col] = null;
  return out;
}

function getDisabledCols(db: ReturnType<typeof getDb>): Set<string> {
  const disabled = db
    .prepare("SELECT source FROM source_settings WHERE enabled = 0")
    .all() as { source: string }[];
  const cols = new Set<string>();
  for (const { source } of disabled) {
    for (const col of SOURCE_COLUMNS[source] ?? []) cols.add(col);
  }
  return cols;
}

export function GET(req: NextRequest) {
  const db = getDb();
  const disabledCols = getDisabledCols(db);
  const day = req.nextUrl.searchParams.get("day");

  if (day) {
    const row = db.prepare("SELECT * FROM daily_log WHERE day = ?").get(day) as Record<string, unknown> | undefined;
    return NextResponse.json(row ? applySourceFilter(row, disabledCols) : null);
  }

  const rows = db.prepare("SELECT * FROM daily_log ORDER BY day DESC LIMIT 90").all() as Record<string, unknown>[];
  return NextResponse.json(rows.map((r) => applySourceFilter(r, disabledCols)));
}
