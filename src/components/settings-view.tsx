"use client";

import { useState, useCallback } from "react";
import { useSyncStatus, useWhoopStatus, useWithingsStatus, useSources, useDailyLogs } from "@/lib/hooks/use-health-data";

export function SettingsView() {
  const { data: status, mutate } = useSyncStatus();
  const { data: whoopStatus, mutate: mutateWhoop } = useWhoopStatus();
  const { data: withingsStatus, mutate: mutateWithings } = useWithingsStatus();
  const { data: sources, mutate: mutateSources } = useSources();
  const { mutate: mutateLogs } = useDailyLogs();
  const [syncingOura, setSyncingOura] = useState(false);
  const [syncingChrono, setSyncingChrono] = useState(false);
  const [syncingLadder, setSyncingLadder] = useState(false);
  const [syncingWhoop, setSyncingWhoop] = useState(false);
  const [syncingWithings, setSyncingWithings] = useState(false);
  const [seeding, setSeeding] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  function isEnabled(src: string) {
    return sources?.find((s) => s.source === src)?.enabled ?? true;
  }

  const toggleSource = useCallback(async (src: string, enabled: boolean) => {
    await fetch("/api/sources", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: src, enabled }),
    });
    mutateSources();
    mutateLogs();
  }, [mutateSources, mutateLogs]);

  const seedTest = useCallback(async (src: string) => {
    setSeeding(src);
    setResult(null);
    try {
      const res = await fetch("/api/seed-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: src }),
      });
      const data = await res.json();
      setResult(data.error ? data.error : `Loaded ${data.days} days of test data for ${src}`);
      mutateLogs();
    } catch {
      setResult(`Failed to seed ${src} test data`);
    } finally {
      setSeeding(null);
    }
  }, [mutateLogs]);

  const connectOura = useCallback(() => { window.location.href = "/api/oura-auth"; }, []);
  const connectWhoop = useCallback(() => { window.location.href = "/api/whoop-auth"; }, []);
  const connectWithings = useCallback(() => { window.location.href = "/api/withings-auth"; }, []);

  const syncOura = useCallback(async () => {
    setSyncingOura(true); setResult(null);
    try {
      const res = await fetch("/api/sync-oura", { method: "POST" });
      const data = await res.json();
      setResult(data.error ? `Oura: ${data.error}` : "Oura synced");
      mutate(); mutateLogs();
    } catch { setResult("Oura sync failed"); }
    finally { setSyncingOura(false); }
  }, [mutate, mutateLogs]);

  const syncWhoop = useCallback(async () => {
    setSyncingWhoop(true); setResult(null);
    try {
      const res = await fetch("/api/sync-whoop", { method: "POST" });
      const data = await res.json();
      setResult(data.error ? `Whoop: ${data.error}` : `Whoop synced${data.synced?.length ? ` (${data.synced.length} days)` : ""}`);
      mutateWhoop(); mutateLogs();
    } catch { setResult("Whoop sync failed"); }
    finally { setSyncingWhoop(false); }
  }, [mutateWhoop, mutateLogs]);

  const syncWithings = useCallback(async () => {
    setSyncingWithings(true); setResult(null);
    try {
      const res = await fetch("/api/sync-withings", { method: "POST" });
      const data = await res.json();
      setResult(data.error ? `Withings: ${data.error}` : `Withings synced${data.synced?.length ? ` (${data.synced.length} days)` : ""}`);
      mutateWithings(); mutateLogs();
    } catch { setResult("Withings sync failed"); }
    finally { setSyncingWithings(false); }
  }, [mutateWithings, mutateLogs]);

  const syncChrono = useCallback(async () => {
    setSyncingChrono(true); setResult(null);
    try {
      const res = await fetch("/api/sync-chrono", { method: "POST" });
      const data = await res.json();
      setResult(data.error ? `Chrono: ${data.error}` : `Chronometer synced${data.data?.water_oz != null ? ` (${data.data.water_oz}oz water)` : ""}`);
      mutateLogs();
    } catch { setResult("Chronometer sync failed"); }
    finally { setSyncingChrono(false); }
  }, [mutateLogs]);

  const syncLadder = useCallback(async () => {
    setSyncingLadder(true); setResult(null);
    try {
      const res = await fetch("/api/sync-ladder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "scan" }) });
      const data = await res.json();
      if (data.error) { setResult(`Ladder: ${data.error}`); }
      else {
        const msg = data.processed?.length ? `Ladder: ${data.processed.length} workout${data.processed.length > 1 ? "s" : ""} synced` : "Ladder: no new screenshots";
        setResult(data.errors?.length ? `${msg} (${data.errors.length} errors)` : msg);
      }
      mutateLogs();
    } catch { setResult("Ladder sync failed"); }
    finally { setSyncingLadder(false); }
  }, [mutateLogs]);

  const reprocessLadder = useCallback(async () => {
    setSyncingLadder(true); setResult(null);
    try {
      const res = await fetch("/api/sync-ladder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "rescan" }) });
      const data = await res.json();
      if (data.error) { setResult(`Ladder: ${data.error}`); }
      else {
        const msg = data.processed?.length ? `Ladder: reprocessed ${data.processed.length} workout${data.processed.length > 1 ? "s" : ""}` : "Ladder: no screenshots found";
        setResult(data.errors?.length ? `${msg} (${data.errors.length} errors)` : msg);
      }
      mutateLogs();
    } catch { setResult("Ladder rescan failed"); }
    finally { setSyncingLadder(false); }
  }, [mutateLogs]);

  return (
    <div style={{ maxWidth: 480 }} className="space-y-6">
      {result && (
        <div className="rounded-lg px-3 py-2 text-[12px]" style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border-color)", color: "var(--text-secondary)" }}>
          {result}
        </div>
      )}

      {/* Oura */}
      <Section title="Oura Ring" source="oura" enabled={isEnabled("oura")} onToggle={toggleSource}>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full" style={{ background: status?.oura_connected ? "var(--positive)" : "var(--negative)" }} />
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{status?.oura_connected ? "Connected" : "Not connected"}</span>
        </div>
        <div className="flex gap-2 mt-3 flex-wrap">
          <SettingsButton onClick={connectOura}>{status?.oura_connected ? "Reconnect" : "Connect Oura"}</SettingsButton>
          {status?.oura_connected && <SettingsButton onClick={syncOura} disabled={syncingOura}>{syncingOura ? "Syncing..." : "Sync Now"}</SettingsButton>}
          <SettingsButton onClick={() => seedTest("oura")} disabled={seeding === "oura"}>{seeding === "oura" ? "Loading..." : "Load Test Data"}</SettingsButton>
        </div>
        {status?.last_oura_sync && <div className="mt-2 text-[11px]" style={{ color: "var(--text-muted)" }}>Last sync: {status.last_oura_sync}</div>}
      </Section>

      {/* Whoop */}
      <Section title="Whoop" source="whoop" enabled={isEnabled("whoop")} onToggle={toggleSource}>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full" style={{ background: whoopStatus?.whoop_connected ? "var(--positive)" : "var(--negative)" }} />
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{whoopStatus?.whoop_connected ? "Connected" : "Not connected"}</span>
        </div>
        <div className="flex gap-2 mt-3 flex-wrap">
          <SettingsButton onClick={connectWhoop}>{whoopStatus?.whoop_connected ? "Reconnect" : "Connect Whoop"}</SettingsButton>
          {whoopStatus?.whoop_connected && <SettingsButton onClick={syncWhoop} disabled={syncingWhoop}>{syncingWhoop ? "Syncing..." : "Sync Now"}</SettingsButton>}
          <SettingsButton onClick={() => seedTest("whoop")} disabled={seeding === "whoop"}>{seeding === "whoop" ? "Loading..." : "Load Test Data"}</SettingsButton>
        </div>
        {whoopStatus?.last_whoop_sync && <div className="mt-2 text-[11px]" style={{ color: "var(--text-muted)" }}>Last sync: {whoopStatus.last_whoop_sync}</div>}
      </Section>

      {/* Withings */}
      <Section title="Withings" source="withings" enabled={isEnabled("withings")} onToggle={toggleSource}>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full" style={{ background: withingsStatus?.withings_connected ? "var(--positive)" : "var(--negative)" }} />
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{withingsStatus?.withings_connected ? "Connected" : "Not connected"}</span>
        </div>
        <div className="flex gap-2 mt-3 flex-wrap">
          <SettingsButton onClick={connectWithings}>{withingsStatus?.withings_connected ? "Reconnect" : "Connect Withings"}</SettingsButton>
          {withingsStatus?.withings_connected && <SettingsButton onClick={syncWithings} disabled={syncingWithings}>{syncingWithings ? "Syncing..." : "Sync Now"}</SettingsButton>}
          <SettingsButton onClick={() => seedTest("withings")} disabled={seeding === "withings"}>{seeding === "withings" ? "Loading..." : "Load Test Data"}</SettingsButton>
        </div>
        {withingsStatus?.last_withings_sync && <div className="mt-2 text-[11px]" style={{ color: "var(--text-muted)" }}>Last sync: {withingsStatus.last_withings_sync}</div>}
      </Section>

      {/* Chronometer */}
      <Section title="Chronometer" source="chronometer" enabled={isEnabled("chronometer")} onToggle={toggleSource}>
        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>Syncs food calories, macros, and water intake</div>
        <div className="flex gap-2 flex-wrap">
          <SettingsButton onClick={syncChrono} disabled={syncingChrono}>{syncingChrono ? "Scraping..." : "Sync Now"}</SettingsButton>
          <SettingsButton onClick={() => seedTest("chronometer")} disabled={seeding === "chronometer"}>{seeding === "chronometer" ? "Loading..." : "Load Test Data"}</SettingsButton>
        </div>
        {status?.last_chrono_sync && <div className="mt-2 text-[11px]" style={{ color: "var(--text-muted)" }}>Last sync: {status.last_chrono_sync}</div>}
      </Section>

      {/* Ladder */}
      <Section title="Ladder" source="ladder" enabled={isEnabled("ladder")} onToggle={toggleSource}>
        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>
          Scans workout screenshots from iCloud &rarr; Workout Pics folder.
          {process.env.NEXT_PUBLIC_GEMINI_CONFIGURED === "1"
            ? <span style={{ color: "var(--accent)", marginLeft: 6 }}>Using Gemini Vision</span>
            : <span style={{ color: "var(--text-muted)", marginLeft: 6 }}>Using Tesseract OCR (add GEMINI_API_KEY to .env for better results)</span>
          }
        </div>
        <div className="flex gap-2 flex-wrap">
          <SettingsButton onClick={syncLadder} disabled={syncingLadder}>{syncingLadder ? "Scanning..." : "Sync New"}</SettingsButton>
          <SettingsButton onClick={reprocessLadder} disabled={syncingLadder}>Reprocess All</SettingsButton>
          <SettingsButton onClick={() => seedTest("ladder")} disabled={seeding === "ladder"}>{seeding === "ladder" ? "Loading..." : "Load Test Data"}</SettingsButton>
        </div>
        {status?.last_ladder_sync && <div className="mt-2 text-[11px]" style={{ color: "var(--text-muted)" }}>Last sync: {status.last_ladder_sync}</div>}
      </Section>
    </div>
  );
}

function Section({
  title,
  source,
  enabled,
  onToggle,
  children,
}: {
  title: string;
  source: string;
  enabled: boolean;
  onToggle: (src: string, enabled: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-lg p-4"
      style={{
        background: "var(--bg-primary)",
        border: "1px solid var(--border-color)",
        opacity: enabled ? 1 : 0.6,
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{title}</div>
        <Toggle enabled={enabled} onChange={(v) => onToggle(source, v)} />
      </div>
      {enabled && children}
      {!enabled && (
        <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>
          Source disabled — data hidden from dashboard
        </div>
      )}
    </div>
  );
}

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      style={{
        width: 36,
        height: 20,
        borderRadius: 10,
        border: "none",
        cursor: "pointer",
        position: "relative",
        background: enabled ? "var(--accent, #4ade80)" : "var(--border-color)",
        transition: "background 0.15s",
        flexShrink: 0,
      }}
      aria-label={enabled ? "Disable source" : "Enable source"}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: enabled ? 19 : 3,
          width: 14,
          height: 14,
          borderRadius: "50%",
          background: "white",
          transition: "left 0.15s",
        }}
      />
    </button>
  );
}

function SettingsButton({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: "var(--bg-tertiary)",
        border: "1px solid var(--border-color)",
        color: "var(--text-secondary)",
        fontSize: 12,
        fontFamily: "inherit",
        padding: "0.4rem 0.8rem",
        borderRadius: 4,
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? "default" : "pointer",
      }}
    >
      {children}
    </button>
  );
}
