import { NextRequest, NextResponse } from "next/server";
import { withingsPost } from "@/lib/withings";
import { getDb } from "@/lib/db";
import { localToday, localDaysAgo } from "@/lib/date";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const days = (body as Record<string, unknown>).days as number || 30;
    const start = localDaysAgo(days);
    const today = localToday();

    const startdate = Math.floor(new Date(start + "T00:00:00Z").getTime() / 1000).toString();
    const enddate = Math.floor(new Date(today + "T23:59:59Z").getTime() / 1000).toString();

    // meastype 1=weight(kg), 6=fat_ratio(%), 76=muscle_mass(kg)
    const data = await withingsPost("/measure/v2/measure", {
      action: "getmeas",
      meastypes: "1,6,76",
      category: "1",
      startdate,
      enddate,
    });

    const measuregroups = (data.measuregrps || []) as Record<string, unknown>[];

    // Group by day
    const byDay: Record<string, { weight_kg?: number; fat_pct?: number; muscle_kg?: number }> = {};

    for (const grp of measuregroups) {
      const date = new Date((grp.date as number) * 1000);
      const day = date.toISOString().slice(0, 10);
      if (day < start || day > today) continue;
      if (!byDay[day]) byDay[day] = {};

      const measures = (grp.measures || []) as { type: number; value: number; unit: number }[];
      for (const m of measures) {
        const val = m.value * Math.pow(10, m.unit);
        if (m.type === 1) byDay[day].weight_kg = val;
        else if (m.type === 6) byDay[day].fat_pct = val;
        else if (m.type === 76) byDay[day].muscle_kg = val;
      }
    }

    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO daily_log (day, withings_weight_kg, withings_fat_pct, withings_muscle_kg, withings_synced_at, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
      ON CONFLICT(day) DO UPDATE SET
        withings_weight_kg = CASE WHEN excluded.withings_weight_kg IS NOT NULL THEN excluded.withings_weight_kg ELSE daily_log.withings_weight_kg END,
        withings_fat_pct = CASE WHEN excluded.withings_fat_pct IS NOT NULL THEN excluded.withings_fat_pct ELSE daily_log.withings_fat_pct END,
        withings_muscle_kg = CASE WHEN excluded.withings_muscle_kg IS NOT NULL THEN excluded.withings_muscle_kg ELSE daily_log.withings_muscle_kg END,
        withings_synced_at = datetime('now'),
        updated_at = datetime('now')
    `);

    const synced: string[] = [];
    for (const [day, vals] of Object.entries(byDay)) {
      stmt.run(day, vals.weight_kg ?? null, vals.fat_pct ?? null, vals.muscle_kg ?? null);
      synced.push(day);
    }

    return NextResponse.json({ ok: true, synced: synced.sort() });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
