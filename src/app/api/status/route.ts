import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { localToday } from "@/lib/date";

export const dynamic = "force-dynamic";

export function GET() {
  const db = getDb();

  const ouraAuth = db.prepare("SELECT access_token FROM oura_auth WHERE id = 1").get() as Record<string, unknown> | undefined;
  const whoopAuth = db.prepare("SELECT access_token FROM whoop_auth WHERE id = 1").get() as Record<string, unknown> | undefined;
  const withingsAuth = db.prepare("SELECT access_token FROM withings_auth WHERE id = 1").get() as Record<string, unknown> | undefined;

  const today = localToday();
  const log = db.prepare(`
    SELECT oura_synced_at, whoop_synced_at, chrono_synced_at, withings_synced_at, ladder_synced_at
    FROM daily_log WHERE day = ?
  `).get(today) as Record<string, unknown> | undefined;

  return NextResponse.json({
    oura_connected: !!ouraAuth?.access_token,
    whoop_connected: !!whoopAuth?.access_token,
    withings_connected: !!withingsAuth?.access_token,
    last_oura_sync: log?.oura_synced_at ?? null,
    last_whoop_sync: log?.whoop_synced_at ?? null,
    last_chrono_sync: log?.chrono_synced_at ?? null,
    last_withings_sync: log?.withings_synced_at ?? null,
    last_ladder_sync: log?.ladder_synced_at ?? null,
  });
}
