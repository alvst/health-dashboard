import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

function rand(min: number, max: number, decimals = 0) {
  const v = min + Math.random() * (max - min);
  return decimals === 0 ? Math.round(v) : Math.round(v * 10 ** decimals) / 10 ** decimals;
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// Seeded workout names for ladder
const WORKOUT_NAMES = ["Back/Biceps", "Chest/Triceps", "Legs", "Shoulders", "Full Body", "Push", "Pull"];

export async function POST(req: NextRequest) {
  const { source } = (await req.json()) as { source: string };
  const db = getDb();
  const days = 30;

  if (source === "oura") {
    const stmt = db.prepare(`
      INSERT INTO daily_log (day, active_calories, total_calories, steps, sleep_hours, sleep_score, readiness_score, oura_synced_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      ON CONFLICT(day) DO UPDATE SET
        active_calories = excluded.active_calories,
        total_calories = excluded.total_calories,
        steps = excluded.steps,
        sleep_hours = excluded.sleep_hours,
        sleep_score = excluded.sleep_score,
        readiness_score = excluded.readiness_score,
        oura_synced_at = datetime('now'),
        updated_at = datetime('now')
    `);
    for (let i = 0; i < days; i++) {
      stmt.run(
        daysAgo(i),
        rand(300, 700),
        rand(1600, 2400),
        rand(4000, 14000),
        rand(5.5, 9, 1),
        rand(55, 95),
        rand(50, 95),
      );
    }
    return NextResponse.json({ ok: true, source, days });
  }

  if (source === "whoop") {
    const stmt = db.prepare(`
      INSERT INTO daily_log (day, whoop_recovery_score, whoop_strain, whoop_hrv, whoop_rhr, whoop_sleep_performance, whoop_synced_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      ON CONFLICT(day) DO UPDATE SET
        whoop_recovery_score = excluded.whoop_recovery_score,
        whoop_strain = excluded.whoop_strain,
        whoop_hrv = excluded.whoop_hrv,
        whoop_rhr = excluded.whoop_rhr,
        whoop_sleep_performance = excluded.whoop_sleep_performance,
        whoop_synced_at = datetime('now'),
        updated_at = datetime('now')
    `);
    for (let i = 0; i < days; i++) {
      stmt.run(
        daysAgo(i),
        rand(30, 99),
        rand(5, 18, 1),
        rand(30, 100, 1),
        rand(45, 65),
        rand(50, 100),
      );
    }
    return NextResponse.json({ ok: true, source, days });
  }

  if (source === "withings") {
    const stmt = db.prepare(`
      INSERT INTO daily_log (day, withings_weight_kg, withings_fat_pct, withings_muscle_kg, withings_synced_at, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
      ON CONFLICT(day) DO UPDATE SET
        withings_weight_kg = excluded.withings_weight_kg,
        withings_fat_pct = excluded.withings_fat_pct,
        withings_muscle_kg = excluded.withings_muscle_kg,
        withings_synced_at = datetime('now'),
        updated_at = datetime('now')
    `);
    // Simulate a slight downward trend in weight over 30 days
    const baseWeight = rand(78, 95, 1);
    for (let i = 0; i < days; i++) {
      const weight = Math.round((baseWeight - i * 0.05 + rand(-0.3, 0.3, 2)) * 10) / 10;
      stmt.run(
        daysAgo(i),
        weight,
        rand(14, 25, 1),
        rand(35, 50, 1),
      );
    }
    return NextResponse.json({ ok: true, source, days });
  }

  if (source === "chronometer") {
    const stmt = db.prepare(`
      INSERT INTO daily_log (day, food_calories, protein_g, carbs_g, fat_g, water_oz, chrono_synced_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      ON CONFLICT(day) DO UPDATE SET
        food_calories = excluded.food_calories,
        protein_g = excluded.protein_g,
        carbs_g = excluded.carbs_g,
        fat_g = excluded.fat_g,
        water_oz = excluded.water_oz,
        chrono_synced_at = datetime('now'),
        updated_at = datetime('now')
    `);
    for (let i = 0; i < days; i++) {
      const protein = rand(120, 220, 1);
      const carbs = rand(80, 200, 1);
      const fat = rand(40, 90, 1);
      const calories = Math.round(protein * 4 + carbs * 4 + fat * 9);
      stmt.run(daysAgo(i), calories, protein, carbs, fat, rand(64, 160, 1));
    }
    return NextResponse.json({ ok: true, source, days });
  }

  if (source === "ladder") {
    const stmt = db.prepare(`
      INSERT INTO daily_log (day, workout_completed, workout_calories, workout_duration_min, workout_name, ladder_synced_at, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      ON CONFLICT(day) DO UPDATE SET
        workout_completed = excluded.workout_completed,
        workout_calories = excluded.workout_calories,
        workout_duration_min = excluded.workout_duration_min,
        workout_name = excluded.workout_name,
        ladder_synced_at = datetime('now'),
        updated_at = datetime('now')
    `);
    for (let i = 0; i < days; i++) {
      // ~4 workout days per week
      const hasWorkout = Math.random() < 0.57;
      stmt.run(
        daysAgo(i),
        hasWorkout ? 1 : 0,
        hasWorkout ? rand(200, 500) : null,
        hasWorkout ? rand(35, 75) : null,
        hasWorkout ? WORKOUT_NAMES[Math.floor(Math.random() * WORKOUT_NAMES.length)] : null,
      );
    }
    return NextResponse.json({ ok: true, source, days });
  }

  return NextResponse.json({ error: `Unknown source: ${source}` }, { status: 400 });
}
