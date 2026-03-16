import { NextRequest, NextResponse } from "next/server";
import { getWithingsAuthUrl, getWithingsClientId } from "@/lib/withings";
import { getDb } from "@/lib/db";
import { localToday } from "@/lib/date";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  const accept = req.headers.get("accept") || "";
  if (accept.includes("text/html")) {
    const redirectUri = `${req.nextUrl.origin}/api/withings-callback`;
    const state = crypto.randomBytes(16).toString("hex");
    const url = getWithingsAuthUrl(redirectUri, state);
    return NextResponse.redirect(url);
  }

  const db = getDb();
  const auth = db.prepare("SELECT * FROM withings_auth WHERE id = 1").get() as Record<string, unknown> | undefined;
  const today = localToday();
  const log = db.prepare("SELECT withings_synced_at FROM daily_log WHERE day = ?").get(today) as Record<string, unknown> | undefined;

  return NextResponse.json({
    withings_connected: !!auth?.access_token,
    withings_client_id: getWithingsClientId() ? true : false,
    last_withings_sync: log?.withings_synced_at || null,
  });
}
