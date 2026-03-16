// Maps each source to the daily_log columns it owns.
// Used server-side to null out disabled sources and client-side for labelling.
export const SOURCE_COLUMNS: Record<string, string[]> = {
  oura: [
    "active_calories",
    "total_calories",
    "steps",
    "sleep_hours",
    "sleep_score",
    "readiness_score",
    "oura_workout_calories",
  ],
  whoop: [
    "whoop_recovery_score",
    "whoop_strain",
    "whoop_hrv",
    "whoop_rhr",
    "whoop_sleep_performance",
  ],
  withings: [
    "withings_weight_kg",
    "withings_fat_pct",
    "withings_muscle_kg",
  ],
  chronometer: [
    "food_calories",
    "protein_g",
    "carbs_g",
    "fat_g",
    "water_oz",
  ],
  ladder: [
    "workout_completed",
    "workout_calories",
    "workout_duration_min",
    "workout_name",
  ],
};

export const ALL_SOURCES = Object.keys(SOURCE_COLUMNS);
