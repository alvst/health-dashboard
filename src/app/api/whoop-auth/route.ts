import { NextRequest, NextResponse } from "next/server";
import { getWhoopAuthUrl, getWhoopClientId } from "@/lib/whoop";
import { getDb } from "@/lib/db";
import { localToday } from "@/lib/date";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  const accept = req.headers.get("accept") || "";
  if (accept.includes("text/html")) {
    const redirectUri = `${req.nextUrl.origin}/api/whoop-callback`;
    const state = crypto.randomBytes(16).toString("hex");
    const url = getWhoopAuthUrl(redirectUri, state);
    return NextResponse.redirect(url);
  }

  const db = getDb();
  const auth = db.prepare("SELECT * FROM whoop_auth WHERE id = 1").get() as Record<string, unknown> | undefined;
  const today = localToday();
  const log = db.prepare("SELECT whoop_synced_at FROM daily_log WHERE day = ?").get(today) as Record<string, unknown> | undefined;

  return NextResponse.json({
    whoop_connected: !!auth?.access_token,
    whoop_client_id: getWhoopClientId() ? true : false,
    last_whoop_sync: log?.whoop_synced_at || null,
  });
}
