import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const origin = new URL(req.url).origin;
  const results: Record<string, unknown> = {};

  // Check which services are enabled
  const db = getDb();
  const rows = db.prepare("SELECT service, enabled FROM service_config").all() as { service: string; enabled: number }[];
  const enabled = (service: string) => {
    const row = rows.find(r => r.service === service);
    return row ? row.enabled === 1 : true; // default enabled
  };

  const syncs: Promise<void>[] = [];

  if (enabled("oura")) {
    syncs.push(
      fetch(`${origin}/api/sync-oura`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })
        .then(r => r.json()).then(v => { results.oura = v; }).catch(e => { results.oura = { error: String(e) }; })
    );
  }

  if (enabled("whoop")) {
    syncs.push(
      fetch(`${origin}/api/sync-whoop`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })
        .then(r => r.json()).then(v => { results.whoop = v; }).catch(e => { results.whoop = { error: String(e) }; })
    );
  }

  if (enabled("chronometer")) {
    syncs.push(
      fetch(`${origin}/api/sync-chrono`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })
        .then(r => r.json()).then(v => { results.chrono = v; }).catch(e => { results.chrono = { error: String(e) }; })
    );
  }

  if (enabled("withings")) {
    syncs.push(
      fetch(`${origin}/api/sync-withings`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })
        .then(r => r.json()).then(v => { results.withings = v; }).catch(e => { results.withings = { error: String(e) }; })
    );
  }

  if (enabled("ladder")) {
    syncs.push(
      fetch(`${origin}/api/sync-ladder`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "scan" }) })
        .then(r => r.json()).then(v => { results.ladder = v; }).catch(e => { results.ladder = { error: String(e) }; })
    );
  }

  await Promise.all(syncs);
  return NextResponse.json(results);
}
