import { getDb } from "./db";

const WITHINGS_AUTH_URL = "https://account.withings.com/oauth2_user/authorize2";
const WITHINGS_TOKEN_URL = "https://wbsapi.withings.net/v2/oauth2";
const WITHINGS_API_URL = "https://wbsapi.withings.net";

export function getWithingsClientId(): string {
  return process.env.WITHINGS_CLIENT_ID || "";
}

function getWithingsClientSecret(): string {
  return process.env.WITHINGS_CLIENT_SECRET || "";
}

export function getWithingsAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: getWithingsClientId(),
    redirect_uri: redirectUri,
    scope: "user.metrics",
    state,
  });
  return `${WITHINGS_AUTH_URL}?${params}`;
}

export async function exchangeCode(code: string, redirectUri: string) {
  const res = await fetch(WITHINGS_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      action: "requesttoken",
      grant_type: "authorization_code",
      client_id: getWithingsClientId(),
      client_secret: getWithingsClientSecret(),
      code,
      redirect_uri: redirectUri,
    }),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`);
  const json = await res.json();
  if (json.status !== 0) throw new Error(`Withings error: ${json.error}`);
  const data = json.body;

  const db = getDb();
  db.prepare(`
    INSERT INTO withings_auth (id, access_token, refresh_token, expires_at, updated_at)
    VALUES (1, ?, ?, ?, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      access_token = excluded.access_token,
      refresh_token = excluded.refresh_token,
      expires_at = excluded.expires_at,
      updated_at = datetime('now')
  `).run(data.access_token, data.refresh_token, Math.floor(Date.now() / 1000) + data.expires_in);

  return data;
}

async function refreshToken(): Promise<string> {
  const db = getDb();
  const row = db.prepare("SELECT * FROM withings_auth WHERE id = 1").get() as Record<string, unknown> | undefined;
  if (!row?.refresh_token) throw new Error("No Withings refresh token");

  const res = await fetch(WITHINGS_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      action: "requesttoken",
      grant_type: "refresh_token",
      client_id: getWithingsClientId(),
      client_secret: getWithingsClientSecret(),
      refresh_token: row.refresh_token as string,
    }),
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);
  const json = await res.json();
  if (json.status !== 0) throw new Error(`Withings refresh error: ${json.error}`);
  const data = json.body;

  db.prepare(`
    UPDATE withings_auth SET
      access_token = ?,
      refresh_token = ?,
      expires_at = ?,
      updated_at = datetime('now')
    WHERE id = 1
  `).run(data.access_token, data.refresh_token, Math.floor(Date.now() / 1000) + data.expires_in);

  return data.access_token;
}

export async function getAccessToken(): Promise<string> {
  const db = getDb();
  const row = db.prepare("SELECT * FROM withings_auth WHERE id = 1").get() as Record<string, unknown> | undefined;
  if (!row?.access_token) throw new Error("Withings not connected");

  const expiresAt = row.expires_at as number;
  if (Date.now() / 1000 > expiresAt - 300) {
    return refreshToken();
  }
  return row.access_token as string;
}

// Withings uses POST with action params rather than REST GET
export async function withingsPost(path: string, params: Record<string, string>) {
  const token = await getAccessToken();
  const body = new URLSearchParams(params);
  const res = await fetch(`${WITHINGS_API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Bearer ${token}`,
    },
    body,
  });
  if (!res.ok) throw new Error(`Withings API error: ${res.status}`);
  const json = await res.json();
  if (json.status !== 0) throw new Error(`Withings API error: ${json.error}`);
  return json.body;
}
