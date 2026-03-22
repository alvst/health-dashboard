import { NextResponse } from "next/server";
import { pushToTrmnl, getTrmnlPluginUuid } from "@/lib/trmnl";
import { getDb } from "@/lib/db";
import { localToday, localDaysAgo } from "@/lib/date";

export const dynamic = "force-dynamic";

function avg(...vals: (number | null | undefined)[]): number | null {
  const nums = vals.filter((v): v is number => v != null && !isNaN(v));
  if (!nums.length) return null;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

export async function POST(req: Request) {
  const origin = new URL(req.url).origin;
  const results: Record<string, unknown> = {};

  // Run all syncs in parallel, don't fail on individual errors
  const [oura, chrono, ladder, withings] = await Promise.allSettled([
    fetch(`${origin}/api/sync-oura`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).then((r) => r.json()),
    fetch(`${origin}/api/sync-chrono`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).then((r) => r.json()),
    fetch(`${origin}/api/sync-ladder`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "scan" }) }).then((r) => r.json()),
    fetch(`${origin}/api/sync-withings`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).then((r) => r.json()),
  ]);

  results.oura = oura.status === "fulfilled" ? oura.value : { error: String(oura.reason) };
  results.chrono = chrono.status === "fulfilled" ? chrono.value : { error: String(chrono.reason) };
  results.ladder = ladder.status === "fulfilled" ? ladder.value : { error: String(ladder.reason) };
  results.withings = withings.status === "fulfilled" ? withings.value : { error: String(withings.reason) };

  // Push to TRMNL if configured
  if (getTrmnlPluginUuid()) {
    try {
      const db = getDb();
      const today = localToday();
      const weekAgo = localDaysAgo(7);
      const log = db.prepare("SELECT * FROM daily_log WHERE day = ?").get(today) as Record<string, unknown> | undefined;
      const week = db.prepare("SELECT * FROM daily_log WHERE day >= ? AND day <= ?").all(weekAgo, today) as Record<string, unknown>[];

      if (log) {
        const weeklyWorkouts = week.filter((d) => d.workout_completed).length;
        const weeklySteps = week.map((d) => d.steps as number | null).filter((v): v is number => v != null);
        const avgSteps = weeklySteps.length ? Math.round(weeklySteps.reduce((a, b) => a + b, 0) / weeklySteps.length) : null;
        const weightKg = log.withings_weight_kg as number | null;

        await pushToTrmnl({
          date: log.day,
          recovery_score: avg(log.readiness_score as number, log.whoop_recovery_score as number),
          sleep_score: avg(log.sleep_score as number, log.whoop_sleep_performance as number),
          sleep_hours: log.sleep_hours ?? log.whoop_sleep_hours ?? null,
          hrv: log.whoop_hrv != null ? Math.round(log.whoop_hrv as number) : null,
          rhr: log.whoop_rhr != null ? Math.round(log.whoop_rhr as number) : null,
          strain: log.whoop_strain != null ? (log.whoop_strain as number).toFixed(1) : null,
          steps: log.steps ?? null,
          weight_lbs: log.weight_lbs ?? (weightKg != null ? parseFloat((weightKg * 2.205).toFixed(1)) : null),
          body_fat: log.withings_fat_pct != null ? parseFloat((log.withings_fat_pct as number).toFixed(1)) : null,
          food_calories: log.food_calories ?? null,
          protein_g: log.protein_g != null ? Math.round(log.protein_g as number) : null,
          water_oz: log.water_oz != null ? Math.round(log.water_oz as number) : null,
          weekly_workouts: weeklyWorkouts,
          avg_daily_steps: avgSteps,
        });
        results.trmnl = { ok: true };
      }
    } catch (e) {
      results.trmnl = { error: e instanceof Error ? e.message : "Unknown error" };
    }
  }

  return NextResponse.json(results);
}
