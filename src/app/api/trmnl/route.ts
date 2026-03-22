import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { pushToTrmnl, getTrmnlPluginUuid } from "@/lib/trmnl";
import { localToday, localDaysAgo } from "@/lib/date";

export const dynamic = "force-dynamic";

function avg(...vals: (number | null | undefined)[]): number | null {
  const nums = vals.filter((v): v is number => v != null && !isNaN(v));
  if (!nums.length) return null;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

function buildVariables(log: Record<string, unknown>, week: Record<string, unknown>[]): Record<string, unknown> {
  const recovery = avg(
    log.readiness_score as number,
    log.whoop_recovery_score as number
  );
  const sleep = avg(
    log.sleep_score as number,
    log.whoop_sleep_performance as number
  );

  const weeklyWorkouts = week.filter((d) => d.workout_completed).length;
  const weeklySteps = week
    .map((d) => d.steps as number | null)
    .filter((v): v is number => v != null);
  const avgSteps = weeklySteps.length
    ? Math.round(weeklySteps.reduce((a, b) => a + b, 0) / weeklySteps.length)
    : null;

  return {
    date: log.day,
    recovery_score: recovery,
    sleep_score: sleep,
    sleep_hours: log.sleep_hours ?? log.whoop_sleep_hours ?? null,
    hrv: log.whoop_hrv != null ? Math.round(log.whoop_hrv as number) : null,
    rhr: log.whoop_rhr != null ? Math.round(log.whoop_rhr as number) : null,
    strain: log.whoop_strain != null ? (log.whoop_strain as number).toFixed(1) : null,
    steps: log.steps ?? null,
    weight_lbs: log.weight_lbs != null ? (log.weight_lbs as number).toFixed(1) : (log.withings_weight_kg != null ? ((log.withings_weight_kg as number) * 2.205).toFixed(1) : null),
    body_fat: log.withings_fat_pct != null ? (log.withings_fat_pct as number).toFixed(1) : null,
    food_calories: log.food_calories ?? null,
    protein_g: log.protein_g != null ? Math.round(log.protein_g as number) : null,
    carbs_g: log.carbs_g != null ? Math.round(log.carbs_g as number) : null,
    fat_g: log.fat_g != null ? Math.round(log.fat_g as number) : null,
    water_oz: log.water_oz != null ? Math.round(log.water_oz as number) : null,
    weekly_workouts: weeklyWorkouts,
    avg_daily_steps: avgSteps,
  };
}

export async function POST() {
  try {
    if (!getTrmnlPluginUuid()) {
      return NextResponse.json({ error: "TRMNL_PLUGIN_UUID not configured" }, { status: 400 });
    }

    const db = getDb();
    const today = localToday();
    const weekAgo = localDaysAgo(7);

    const log = db.prepare("SELECT * FROM daily_log WHERE day = ?").get(today) as Record<string, unknown> | undefined;
    const week = db.prepare("SELECT * FROM daily_log WHERE day >= ? AND day <= ? ORDER BY day DESC").all(weekAgo, today) as Record<string, unknown>[];

    if (!log) {
      return NextResponse.json({ error: "No data for today" }, { status: 404 });
    }

    const variables = buildVariables(log, week);
    await pushToTrmnl(variables);

    return NextResponse.json({ ok: true, pushed: variables });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export function GET() {
  const configured = !!getTrmnlPluginUuid();
  return NextResponse.json({ configured });
}
