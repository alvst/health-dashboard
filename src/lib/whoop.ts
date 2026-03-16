import { getDb } from "./db";

const WHOOP_API_V1 = "https://api.prod.whoop.com/developer/v1";
const WHOOP_API_V2 = "https://api.prod.whoop.com/developer/v2";
const WHOOP_AUTH_URL = "https://api.prod.whoop.com/oauth/oauth2/auth";
const WHOOP_TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token";

export function getWhoopClientId(): string {
  return process.env.WHOOP_CLIENT_ID || "";
}

function getWhoopClientSecret(): string {
  return process.env.WHOOP_CLIENT_SECRET || "";
}

export function getWhoopAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: getWhoopClientId(),
    redirect_uri: redirectUri,
    scope: "read:recovery read:sleep read:workout read:cycles read:body_measurement read:profile",
    state,
  });
  return `${WHOOP_AUTH_URL}?${params}`;
}

export async function exchangeCode(code: string, redirectUri: string) {
  const res = await fetch(WHOOP_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: getWhoopClientId(),
      client_secret: getWhoopClientSecret(),
      redirect_uri: redirectUri,
    }),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`);
  const data = await res.json();

  const db = getDb();
  db.prepare(`
    INSERT INTO whoop_auth (id, access_token, refresh_token, expires_at, updated_at)
    VALUES (1, ?, ?, ?, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      access_token = excluded.access_token,
      refresh_token = excluded.refresh_token,
      expires_at = excluded.expires_at,
      updated_at = datetime('now')
  `).run(data.access_token, data.refresh_token ?? null, Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600));

  return data;
}

async function refreshToken(): Promise<string> {
  const db = getDb();
  const row = db.prepare("SELECT * FROM whoop_auth WHERE id = 1").get() as Record<string, unknown> | undefined;
  if (!row?.refresh_token) throw new Error("No Whoop refresh token");

  const res = await fetch(WHOOP_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: row.refresh_token as string,
      client_id: getWhoopClientId(),
      client_secret: getWhoopClientSecret(),
    }),
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);
  const data = await res.json();

  db.prepare(`
    UPDATE whoop_auth SET
      access_token = ?,
      refresh_token = COALESCE(?, refresh_token),
      expires_at = ?,
      updated_at = datetime('now')
    WHERE id = 1
  `).run(data.access_token, data.refresh_token ?? null, Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600));

  return data.access_token;
}

export async function getAccessToken(): Promise<string> {
  const db = getDb();
  const row = db.prepare("SELECT * FROM whoop_auth WHERE id = 1").get() as Record<string, unknown> | undefined;
  if (!row?.access_token) throw new Error("Whoop not connected");

  const expiresAt = row.expires_at as number;
  if (Date.now() / 1000 > expiresAt - 300) {
    if (row.refresh_token) return refreshToken();
    throw new Error("Whoop token expired — please reconnect");
  }
  return row.access_token as string;
}

export async function whoopGet(path: string, params?: Record<string, string>, version: "v1" | "v2" = "v2") {
  const token = await getAccessToken();
  const base = version === "v2" ? WHOOP_API_V2 : WHOOP_API_V1;
  const url = new URL(base + path);
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  }
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) return { records: [], next_token: null };
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Whoop API error: ${res.status} ${url} — ${body}`);
  }
  return res.json();
}

// Fetch all pages of a paginated Whoop endpoint
export async function whoopGetAll(path: string, params: Record<string, string> = {}, version: "v1" | "v2" = "v2"): Promise<Record<string, unknown>[]> {
  const records: Record<string, unknown>[] = [];
  let nextToken: string | null = null;

  do {
    const p = nextToken ? { ...params, nextToken } : params;
    const data = await whoopGet(path, p, version);
    const items = (data.records || []) as Record<string, unknown>[];
    records.push(...items);
    nextToken = (data.next_token as string) || null;
  } while (nextToken);

  return records;
}

// Convert Whoop's ISO timestamp + timezone offset to YYYY-MM-DD local date
export function toLocalDate(isoTimestamp: string, tzOffset?: string): string {
  if (!tzOffset) return isoTimestamp.slice(0, 10);
  const utc = new Date(isoTimestamp).getTime();
  const match = tzOffset.match(/([+-])(\d{2}):(\d{2})/);
  if (!match) return isoTimestamp.slice(0, 10);
  const sign = match[1] === "+" ? 1 : -1;
  const offsetMs = sign * (parseInt(match[2]) * 60 + parseInt(match[3])) * 60000;
  const local = new Date(utc + offsetMs);
  return local.toISOString().slice(0, 10);
}
