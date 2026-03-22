import { localToday } from "@/lib/date";
import { NextRequest, NextResponse } from "next/server";
import { getWhoopAuthUrl, getWhoopClientId } from "@/lib/whoop";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  // If this is a browser navigation (Accept: text/html), redirect to Whoop OAuth
  const accept = req.headers.get("accept") || "";
  if (accept.includes("text/html")) {
    const redirectUri = `${req.nextUrl.origin}/api/whoop-callback`;
    const state = crypto.randomUUID().replace(/-/g, "");
    const url = getWhoopAuthUrl(redirectUri, state);
    return NextResponse.redirect(url);
  }

  // Otherwise return status JSON for SWR
  const db = getDb();
  const auth = db.prepare("SELECT * FROM whoop_auth WHERE id = 1").get() as Record<string, unknown> | undefined;
  const whoopConnected = !!auth?.access_token;

  const today = localToday();
  const log = db.prepare("SELECT whoop_synced_at, macrofactor_synced_at, ladder_synced_at FROM daily_log WHERE day = ?").get(today) as Record<string, unknown> | undefined;

  return NextResponse.json({
    whoop_connected: whoopConnected,
    whoop_client_id: getWhoopClientId() ? true : false,
    last_whoop_sync: log?.whoop_synced_at || null,
    last_macrofactor_sync: log?.macrofactor_synced_at || null,
    last_ladder_sync: log?.ladder_synced_at || null,
  });
}
