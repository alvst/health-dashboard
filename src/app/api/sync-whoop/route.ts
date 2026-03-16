import { NextRequest, NextResponse } from "next/server";
import { whoopGetAll, toLocalDate } from "@/lib/whoop";
import { getDb } from "@/lib/db";
import { localToday, localDaysAgo } from "@/lib/date";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const days = (body as Record<string, unknown>).days as number || 7;
    const start = localDaysAgo(days);
    const today = localToday();

    const startIso = `${start}T00:00:00.000Z`;
    const endIso = `${today}T23:59:59.000Z`;

    const [recoveries, cycles, sleeps] = await Promise.all([
      whoopGetAll("/v1/recovery", { start: startIso, end: endIso }),
      whoopGetAll("/v1/cycle", { start: startIso, end: endIso }),
      whoopGetAll("/v1/sleep", { start: startIso, end: endIso }),
    ]);

    // Key recovery by day
    const recoveryByDay: Record<string, Record<string, unknown>> = {};
    for (const r of recoveries) {
      const score = r.score as Record<string, unknown> | null;
      if (!score) continue;
      const created = (r.created_at as string) || (r.start as string);
      const tzOffset = r.timezone_offset as string | undefined;
      const day = toLocalDate(created, tzOffset);
      if (day >= start && day <= today) recoveryByDay[day] = score;
    }

    // Key strain by day from cycles
    const strainByDay: Record<string, number> = {};
    for (const c of cycles) {
      const score = c.score as Record<string, unknown> | null;
      if (!score) continue;
      const tzOffset = c.timezone_offset as string | undefined;
      const day = toLocalDate(c.start as string, tzOffset);
      if (day >= start && day <= today) {
        strainByDay[day] = score.strain as number;
      }
    }

    // Key sleep performance by day
    const sleepPerfByDay: Record<string, number> = {};
    for (const s of sleeps) {
      if (s.nap) continue;
      const score = s.score as Record<string, unknown> | null;
      if (!score) continue;
      const tzOffset = s.timezone_offset as string | undefined;
      const day = toLocalDate(s.start as string, tzOffset);
      if (day >= start && day <= today) {
        sleepPerfByDay[day] = score.sleep_performance_percentage as number;
      }
    }

    const allDays = new Set([
      ...Object.keys(recoveryByDay),
      ...Object.keys(strainByDay),
      ...Object.keys(sleepPerfByDay),
    ]);

    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO daily_log (day, whoop_recovery_score, whoop_strain, whoop_hrv, whoop_rhr, whoop_sleep_performance, whoop_synced_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      ON CONFLICT(day) DO UPDATE SET
        whoop_recovery_score = CASE WHEN excluded.whoop_recovery_score IS NOT NULL THEN excluded.whoop_recovery_score ELSE daily_log.whoop_recovery_score END,
        whoop_strain = CASE WHEN excluded.whoop_strain IS NOT NULL THEN excluded.whoop_strain ELSE daily_log.whoop_strain END,
        whoop_hrv = CASE WHEN excluded.whoop_hrv IS NOT NULL THEN excluded.whoop_hrv ELSE daily_log.whoop_hrv END,
        whoop_rhr = CASE WHEN excluded.whoop_rhr IS NOT NULL THEN excluded.whoop_rhr ELSE daily_log.whoop_rhr END,
        whoop_sleep_performance = CASE WHEN excluded.whoop_sleep_performance IS NOT NULL THEN excluded.whoop_sleep_performance ELSE daily_log.whoop_sleep_performance END,
        whoop_synced_at = datetime('now'),
        updated_at = datetime('now')
    `);

    const synced: string[] = [];
    for (const day of allDays) {
      const rec = recoveryByDay[day];
      stmt.run(
        day,
        rec ? (rec.recovery_score as number) ?? null : null,
        strainByDay[day] ?? null,
        rec ? (rec.hrv_rmssd_milli as number) ?? null : null,
        rec ? (rec.resting_heart_rate as number) ?? null : null,
        sleepPerfByDay[day] ?? null,
      );
      synced.push(day);
    }

    return NextResponse.json({ ok: true, synced: synced.sort() });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
