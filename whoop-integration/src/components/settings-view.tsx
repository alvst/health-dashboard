"use client";

import { useState, useCallback, useRef } from "react";
import { useSyncStatus, useServices } from "@/lib/hooks/use-health-data";

export function SettingsView() {
  const { data: status, mutate: mutateStatus } = useSyncStatus();
  const { data: services, mutate: mutateServices } = useServices();
  const [syncingOura, setSyncingOura] = useState(false);
  const [syncingWhoop, setSyncingWhoop] = useState(false);
  const [syncingWithings, setSyncingWithings] = useState(false);
  const [syncingChrono, setSyncingChrono] = useState(false);
  const [uploadingMacro, setUploadingMacro] = useState(false);
  const [syncingLadder, setSyncingLadder] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const macroFileRef = useRef<HTMLInputElement>(null);

  const isEnabled = (service: string) => !services || services[service] !== false;

  const toggleService = useCallback(async (service: string, enabled: boolean) => {
    await fetch("/api/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [service]: enabled }),
    });
    mutateServices();
  }, [mutateServices]);

  const connectOura = useCallback(() => { window.location.href = "/api/oura-auth"; }, []);
  const connectWhoop = useCallback(() => { window.location.href = "/api/whoop-auth"; }, []);
  const connectWithings = useCallback(() => { window.location.href = "/api/withings-auth"; }, []);

  const syncOura = useCallback(async () => {
    setSyncingOura(true); setResult(null);
    try {
      const res = await fetch("/api/sync-oura", { method: "POST" });
      const data = await res.json();
      setResult(data.error ? `Oura: ${data.error}` : "Oura synced");
      mutateStatus();
    } catch { setResult("Oura sync failed"); }
    finally { setSyncingOura(false); }
  }, [mutateStatus]);

  const syncWhoop = useCallback(async (days = 3) => {
    setSyncingWhoop(true); setResult(null);
    try {
      const res = await fetch("/api/sync-whoop", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ days }) });
      const data = await res.json();
      setResult(data.error ? `Whoop: ${data.error}` : `Whoop synced (${data.synced?.length ?? 0} days)`);
      mutateStatus();
    } catch { setResult("Whoop sync failed"); }
    finally { setSyncingWhoop(false); }
  }, [mutateStatus]);

  const syncWithings = useCallback(async () => {
    setSyncingWithings(true); setResult(null);
    try {
      const res = await fetch("/api/sync-withings", { method: "POST" });
      const data = await res.json();
      setResult(data.error ? `Withings: ${data.error}` : `Withings: synced ${data.count} days of weight`);
      mutateStatus();
    } catch { setResult("Withings sync failed"); }
    finally { setSyncingWithings(false); }
  }, [mutateStatus]);

  const syncChrono = useCallback(async () => {
    setSyncingChrono(true); setResult(null);
    try {
      const res = await fetch("/api/sync-chrono", { method: "POST" });
      const data = await res.json();
      setResult(data.error ? `Chrono: ${data.error}` : `Chronometer synced${data.data?.water_oz != null ? ` (${data.data.water_oz}oz water)` : ""}`);
    } catch { setResult("Chronometer sync failed"); }
    finally { setSyncingChrono(false); }
  }, []);

  const uploadMacrofactor = useCallback(async (file: File) => {
    setUploadingMacro(true); setResult(null);
    try {
      const csv = await file.text();
      const res = await fetch("/api/sync-macrofactor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv }),
      });
      const data = await res.json();
      setResult(data.error ? `Macrofactor: ${data.error}` : `Macrofactor: imported ${data.count} days`);
      mutateStatus();
    } catch { setResult("Macrofactor import failed"); }
    finally {
      setUploadingMacro(false);
      if (macroFileRef.current) macroFileRef.current.value = "";
    }
  }, [mutateStatus]);

  const syncLadder = useCallback(async (mode: "scan" | "rescan") => {
    setSyncingLadder(true); setResult(null);
    try {
      const res = await fetch("/api/sync-ladder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode }) });
      const data = await res.json();
      if (data.error) {
        setResult(`Ladder: ${data.error}`);
      } else {
        const count = data.processed?.length ?? 0;
        const label = mode === "rescan" ? "reprocessed" : "synced";
        const msg = count ? `Ladder: ${count} workout${count > 1 ? "s" : ""} ${label}` : `Ladder: no ${mode === "rescan" ? "" : "new "}screenshots`;
        setResult(data.errors?.length ? `${msg} (${data.errors.length} errors)` : msg);
      }
    } catch { setResult("Ladder sync failed"); }
    finally { setSyncingLadder(false); }
  }, []);

  return (
    <div style={{ maxWidth: 520 }} className="space-y-4">
      {result && (
        <div className="rounded-lg px-3 py-2 text-[12px]"
          style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border-color)", color: "var(--text-secondary)" }}>
          {result}
        </div>
      )}

      {/* Oura Ring */}
      <Section
        title="Oura Ring"
        enabled={isEnabled("oura")}
        onToggle={e => toggleService("oura", e)}
      >
        <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>
          Syncs sleep, readiness, steps, and active calories via OAuth.
        </p>
        <div className="flex items-center gap-3 mb-3">
          <Dot on={!!status?.oura_connected} />
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            {status?.oura_connected ? "Connected" : "Not connected"}
          </span>
        </div>
        <div className="flex gap-2">
          <SettingsButton onClick={connectOura} disabled={!isEnabled("oura")}>
            {status?.oura_connected ? "Reconnect" : "Connect Oura"}
          </SettingsButton>
          {status?.oura_connected && (
            <SettingsButton onClick={syncOura} disabled={syncingOura || !isEnabled("oura")}>
              {syncingOura ? "Syncing..." : "Sync Now"}
            </SettingsButton>
          )}
        </div>
        {status?.last_oura_sync && (
          <div className="mt-2 text-[11px]" style={{ color: "var(--text-muted)" }}>Last sync: {status.last_oura_sync}</div>
        )}
      </Section>

      {/* Whoop */}
      <Section
        title="Whoop"
        enabled={isEnabled("whoop")}
        onToggle={e => toggleService("whoop", e)}
      >
        <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>
          Syncs sleep, recovery score, strain, and workout calories via OAuth. Whoop limits historical data access to the last 30 days.
        </p>
        <div className="flex items-center gap-3 mb-3">
          <Dot on={!!status?.whoop_connected} />
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            {status?.whoop_connected ? "Connected" : "Not connected"}
          </span>
        </div>
        <div className="flex gap-2">
          <SettingsButton onClick={connectWhoop} disabled={!isEnabled("whoop")}>
            {status?.whoop_connected ? "Reconnect" : "Connect Whoop"}
          </SettingsButton>
          {status?.whoop_connected && (<>
            <SettingsButton onClick={() => syncWhoop(3)} disabled={syncingWhoop || !isEnabled("whoop")}>
              {syncingWhoop ? "Syncing..." : "Sync Now"}
            </SettingsButton>
            <SettingsButton onClick={() => syncWhoop(30)} disabled={syncingWhoop || !isEnabled("whoop")}>
              30-Day Sync
            </SettingsButton>
          </>)}
        </div>
        {status?.last_whoop_sync && (
          <div className="mt-2 text-[11px]" style={{ color: "var(--text-muted)" }}>Last sync: {status.last_whoop_sync}</div>
        )}
      </Section>

      {/* Withings */}
      <Section
        title="Withings"
        enabled={isEnabled("withings")}
        onToggle={e => toggleService("withings", e)}
      >
        <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>
          Syncs weight from Withings smart scales via OAuth.
        </p>
        <div className="flex items-center gap-3 mb-3">
          <Dot on={!!status?.withings_connected} />
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            {status?.withings_connected ? "Connected" : "Not connected"}
          </span>
        </div>
        <div className="flex gap-2">
          <SettingsButton onClick={connectWithings} disabled={!isEnabled("withings")}>
            {status?.withings_connected ? "Reconnect" : "Connect Withings"}
          </SettingsButton>
          {status?.withings_connected && (
            <SettingsButton onClick={syncWithings} disabled={syncingWithings || !isEnabled("withings")}>
              {syncingWithings ? "Syncing..." : "Sync Now"}
            </SettingsButton>
          )}
        </div>
        {status?.last_withings_sync && (
          <div className="mt-2 text-[11px]" style={{ color: "var(--text-muted)" }}>Last sync: {status.last_withings_sync}</div>
        )}
      </Section>

      {/* Chronometer */}
      <Section
        title="Chronometer"
        enabled={isEnabled("chronometer")}
        onToggle={e => toggleService("chronometer", e)}
      >
        <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>
          Scrapes food calories, macros, and water intake using your login credentials.
        </p>
        <div className="flex gap-2">
          <SettingsButton onClick={syncChrono} disabled={syncingChrono || !isEnabled("chronometer")}>
            {syncingChrono ? "Scraping..." : "Sync Now"}
          </SettingsButton>
        </div>
        {status?.last_chrono_sync && (
          <div className="mt-2 text-[11px]" style={{ color: "var(--text-muted)" }}>Last sync: {status.last_chrono_sync}</div>
        )}
      </Section>

      {/* Macrofactor */}
      <Section
        title="Macrofactor"
        enabled={isEnabled("macrofactor")}
        onToggle={e => toggleService("macrofactor", e)}
      >
        <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>
          Import food diary from a Macrofactor CSV export (Settings &rarr; Export Data in the app).
        </p>
        <input
          ref={macroFileRef}
          type="file"
          accept=".csv"
          style={{ display: "none" }}
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) uploadMacrofactor(file);
          }}
        />
        <div className="flex gap-2">
          <SettingsButton onClick={() => macroFileRef.current?.click()} disabled={uploadingMacro || !isEnabled("macrofactor")}>
            {uploadingMacro ? "Importing..." : "Upload CSV"}
          </SettingsButton>
        </div>
        {status?.last_macrofactor_sync && (
          <div className="mt-2 text-[11px]" style={{ color: "var(--text-muted)" }}>Last import: {status.last_macrofactor_sync}</div>
        )}
      </Section>

      {/* Ladder */}
      <Section
        title="Ladder"
        enabled={isEnabled("ladder")}
        onToggle={e => toggleService("ladder", e)}
      >
        <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>
          Scans workout screenshots from iCloud &rarr; Workout Pics folder.{" "}
          {process.env.NEXT_PUBLIC_GEMINI_CONFIGURED === "1"
            ? <span style={{ color: "var(--accent)" }}>Using Gemini Vision</span>
            : <span style={{ color: "var(--text-muted)" }}>Using Tesseract OCR (add GEMINI_API_KEY for better results)</span>
          }
        </p>
        <div className="flex gap-2">
          <SettingsButton onClick={() => syncLadder("scan")} disabled={syncingLadder || !isEnabled("ladder")}>
            {syncingLadder ? "Scanning..." : "Sync New"}
          </SettingsButton>
          <SettingsButton onClick={() => syncLadder("rescan")} disabled={syncingLadder || !isEnabled("ladder")}>
            Reprocess All
          </SettingsButton>
        </div>
        {status?.last_ladder_sync && (
          <div className="mt-2 text-[11px]" style={{ color: "var(--text-muted)" }}>Last sync: {status.last_ladder_sync}</div>
        )}
      </Section>
    </div>
  );
}

function Dot({ on }: { on: boolean }) {
  return <div className="w-2 h-2 rounded-full" style={{ background: on ? "var(--positive)" : "var(--negative)" }} />;
}

function Section({ title, enabled, onToggle, children }: {
  title: string; enabled: boolean; onToggle: (v: boolean) => void; children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg p-4" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", opacity: enabled ? 1 : 0.5, transition: "opacity 0.2s" }}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{title}</div>
        <Toggle enabled={enabled} onChange={onToggle} />
      </div>
      {enabled && children}
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
        background: enabled ? "var(--accent)" : "var(--bg-tertiary)",
        position: "relative",
        cursor: "pointer",
        transition: "background 0.2s",
        flexShrink: 0,
      }}
    >
      <span style={{
        position: "absolute",
        top: 3,
        left: enabled ? 18 : 3,
        width: 14,
        height: 14,
        borderRadius: "50%",
        background: "#fff",
        transition: "left 0.2s",
      }} />
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
