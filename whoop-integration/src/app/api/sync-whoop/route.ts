import { NextRequest, NextResponse } from "next/server";
import { whoopGet, whoopGetAll, toLocalDate } from "@/lib/whoop";
import { getDb } from "@/lib/db";
import { localToday, localDaysAgo, localTomorrow } from "@/lib/date";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const days = (body as Record<string, unknown>).days as number || 3;

    const today = localToday();
    const start = localDaysAgo(days);
    const tomorrow = localTomorrow();

    const startTs = `${start}T00:00:00.000Z`;
    const endTs = `${tomorrow}T00:00:00.000Z`;
    const params = { start: startTs, end: endTs };

    const debug = (body as Record<string, unknown>).debug as boolean;

    if (debug) {
      const [rawCycle, rawRecovery, rawSleep, rawWorkout] = await Promise.allSettled([
        whoopGet("/cycle", params),
        whoopGet("/recovery", params),
        whoopGet("/activity/sleep", params),
        whoopGet("/activity/workout", params),
      ]);
      const r = (v: PromiseSettledResult<Record<string, unknown>>) =>
        v.status === "fulfilled" ? v.value : { error: (v as PromiseRejectedResult).reason?.message };
      return NextResponse.json({
        params,
        cycle: r(rawCycle),
        recovery: r(rawRecovery),
        sleep: r(rawSleep),
        workout: r(rawWorkout),
      });
    }

    const [recoveryRecords, sleepRecords, cycleRecords, workoutRecords] = await Promise.all([
      whoopGetAll("/recovery", params),
      whoopGetAll("/activity/sleep", params),
      whoopGetAll("/cycle", params),
      whoopGetAll("/activity/workout", params),
    ]);

    // Recovery: keyed by created_at date (day scores are attributed to)
    const recoveryByDay: Record<string, Record<string, unknown>> = {};
    for (const r of recoveryRecords) {
      const day = toLocalDate(r.created_at as string, r.timezone_offset as string | undefined);
      if (r.score_state === "SCORED" && r.score) recoveryByDay[day] = r.score as Record<string, unknown>;
    }

    // Sleep: keyed by end date (wake-up day), skip naps
    const sleepByDay: Record<string, { hours: number; score: number | null }> = {};
    for (const s of sleepRecords) {
      if (s.nap) continue;
      if (s.score_state !== "SCORED" || !s.score) continue;
      const day = toLocalDate(s.end as string, s.timezone_offset as string | undefined);
      const summary = (s.score as Record<string, unknown>).stage_summary as Record<string, number> | undefined;
      if (!summary) continue;
      const sleepMs =
        (summary.total_light_sleep_time_milli || 0) +
        (summary.total_slow_wave_sleep_time_milli || 0) +
        (summary.total_rem_sleep_time_milli || 0);
      const hours = Math.round((sleepMs / 3600000) * 10) / 10;
      const score = ((s.score as Record<string, unknown>).sleep_performance_percentage as number) ?? null;
      sleepByDay[day] = { hours, score };
    }

    // Cycles: keyed by start date — total calories for the day
    const cycleByDay: Record<string, Record<string, unknown>> = {};
    for (const c of cycleRecords) {
      if (c.score_state !== "SCORED" || !c.score) continue;
      const day = toLocalDate(c.start as string, c.timezone_offset as string | undefined);
      cycleByDay[day] = c.score as Record<string, unknown>;
    }

    // Workouts: sum calories + duration per day, track avg HR
    const workoutByDay: Record<string, { calories: number; duration_min: number; avg_hr: number | null }> = {};
    for (const w of workoutRecords) {
      if (w.score_state !== "SCORED" || !w.score) continue;
      const day = toLocalDate(w.start as string, w.timezone_offset as string | undefined);
      const score = w.score as Record<string, unknown>;
      const cal = Math.round(((score.kilojoule as number) || 0) / 4.184);
      const durationMs = new Date(w.end as string).getTime() - new Date(w.start as string).getTime();
      const duration = Math.round(durationMs / 60000);
      const avgHr = (score.average_heart_rate as number) || null;
      const prev = workoutByDay[day];
      if (prev) {
        workoutByDay[day] = {
          calories: prev.calories + cal,
          duration_min: prev.duration_min + duration,
          avg_hr: avgHr,
        };
      } else {
        workoutByDay[day] = { calories: cal, duration_min: duration, avg_hr: avgHr };
      }
    }

    const allDays = new Set<string>([
      ...Object.keys(recoveryByDay),
      ...Object.keys(sleepByDay),
      ...Object.keys(cycleByDay),
      ...Object.keys(workoutByDay),
    ].filter(d => d >= start && d <= today));

    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO daily_log (day, total_calories, sleep_hours, sleep_score, readiness_score, whoop_workout_calories, avg_hr, whoop_synced_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      ON CONFLICT(day) DO UPDATE SET
        total_calories = CASE WHEN excluded.total_calories IS NOT NULL THEN excluded.total_calories ELSE daily_log.total_calories END,
        sleep_hours = CASE WHEN excluded.sleep_hours IS NOT NULL THEN excluded.sleep_hours ELSE daily_log.sleep_hours END,
        sleep_score = CASE WHEN excluded.sleep_score IS NOT NULL THEN excluded.sleep_score ELSE daily_log.sleep_score END,
        readiness_score = CASE WHEN excluded.readiness_score IS NOT NULL THEN excluded.readiness_score ELSE daily_log.readiness_score END,
        whoop_workout_calories = CASE WHEN excluded.whoop_workout_calories IS NOT NULL THEN excluded.whoop_workout_calories ELSE daily_log.whoop_workout_calories END,
        avg_hr = CASE WHEN excluded.avg_hr IS NOT NULL THEN excluded.avg_hr ELSE daily_log.avg_hr END,
        whoop_synced_at = datetime('now'),
        updated_at = datetime('now')
    `);

    const synced: string[] = [];
    for (const day of allDays) {
      const recovery = recoveryByDay[day];
      const sleep = sleepByDay[day];
      const cycle = cycleByDay[day];
      const workout = workoutByDay[day];

      const totalCal = cycle?.kilojoule
        ? Math.round((cycle.kilojoule as number) / 4.184)
        : null;

      stmt.run(
        day,
        totalCal,
        sleep?.hours ?? null,
        sleep?.score ?? null,
        (recovery?.recovery_score as number) ?? null,
        workout?.calories ?? null,
        workout?.avg_hr ?? (recovery?.resting_heart_rate as number) ?? null,
      );
      synced.push(day);
    }

    return NextResponse.json({ ok: true, synced: synced.sort() });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
