const TRMNL_WEBHOOK_BASE = "https://usetrmnl.com/api/custom_plugins";

export function getTrmnlPluginUuid(): string {
  return process.env.TRMNL_PLUGIN_UUID || "";
}

export async function pushToTrmnl(variables: Record<string, unknown>): Promise<void> {
  const uuid = getTrmnlPluginUuid();
  if (!uuid) return; // silently skip if not configured

  const res = await fetch(`${TRMNL_WEBHOOK_BASE}/${uuid}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ merge_variables: variables }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`TRMNL webhook failed: ${res.status} — ${body}`);
  }
}
