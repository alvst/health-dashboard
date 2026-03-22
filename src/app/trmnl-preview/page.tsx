import { getDb } from "@/lib/db";

export default function TrmnlPreview() {
  const db = getDb();
  const nameSetting = db.prepare("SELECT value FROM app_settings WHERE key = 'name'").get() as { value: string } | undefined;
  const name = nameSetting?.value ?? "";

  // Sample data matching what gets pushed from the dashboard
  const data = {
    date: new Date().toISOString().slice(0, 10),
    recovery_score: 74,
    sleep_score: 82,
    sleep_hours: 7.4,
    hrv: 48,
    rhr: 52,
    strain: "12.3",
    steps: 9200,
    weight_lbs: "183.4",
    body_fat: "18.2",
    food_calories: 2340,
    protein_g: 178,
    water_oz: 72,
    weekly_workouts: 4,
    avg_daily_steps: 8600,
  };

  return (
    <div style={{ background: "#111", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, gap: 16 }}>
      <div style={{ color: "#666", fontSize: 12, fontFamily: "monospace", marginBottom: 8 }}>
        TRMNL Preview — 800 × 480px — 1-bit e-ink (black &amp; white)
      </div>

      {/* E-ink frame */}
      <div style={{
        width: 800,
        height: 480,
        background: "#fff",
        border: "3px solid #333",
        borderRadius: 8,
        fontFamily: "'Inter', system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        boxShadow: "0 0 0 8px #222, 0 0 0 10px #444",
        position: "relative",
      }}>

        {/* TOP ROW — 4 key metrics */}
        <div style={{ display: "flex", flexDirection: "row", flex: "1.2", borderBottom: "1px solid #ddd" }}>

          {/* Recovery */}
          <Metric label="Recovery" value={`${data.recovery_score}`} unit="%" color={getRecoveryColor(data.recovery_score)} />
          <VDivider />

          {/* Sleep */}
          <Metric label="Sleep Score" value={`${data.sleep_score}`} unit="%" sub={`${data.sleep_hours}h`} />
          <VDivider />

          {/* HRV */}
          <Metric label="HRV" value={`${data.hrv}`} unit="ms" sub={`${data.rhr} rhr`} />
          <VDivider />

          {/* Strain */}
          <Metric label="Strain" value={data.strain} sub="whoop" />
        </div>

        {/* BOTTOM ROW — 3 sections */}
        <div style={{ display: "flex", flexDirection: "row", flex: 1 }}>

          {/* Body */}
          <Section label="Body">
            <MiniStat value={`${data.weight_lbs}`} unit="lbs" />
            <MiniStat value={`${data.body_fat}%`} unit="body fat" />
          </Section>
          <VDivider />

          {/* Activity */}
          <Section label="Activity">
            <MiniStat value={`${(data.steps / 1000).toFixed(1)}k`} unit="steps today" />
            <MiniStat value={`${data.weekly_workouts}`} unit="workouts / 7d" />
            <MiniStat value={`${(data.avg_daily_steps / 1000).toFixed(1)}k`} unit="avg steps" />
          </Section>
          <VDivider />

          {/* Nutrition */}
          <Section label="Nutrition">
            <MiniStat value={`${data.food_calories}`} unit="kcal" />
            <MiniStat value={`${data.protein_g}g`} unit="protein" />
            <MiniStat value={`${data.water_oz} oz`} unit="water" />
          </Section>
        </div>

        {/* TITLE BAR */}
        <div style={{
          height: 36,
          borderTop: "1px solid #ddd",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          background: "#f8f8f8",
        }}>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>
            {name ? `${name}'s Health` : "Health Dashboard"}
          </span>
          <span style={{ fontSize: 11, color: "#666" }}>{data.date}</span>
        </div>
      </div>

      <div style={{ color: "#555", fontSize: 11, fontFamily: "monospace", textAlign: "center", lineHeight: 1.8 }}>
        Visit <span style={{ color: "#aaa" }}>/api/trmnl/template</span> to get the Liquid markup to paste into your TRMNL plugin
      </div>
    </div>
  );
}

function getRecoveryColor(score: number) {
  if (score >= 67) return "#000";
  if (score >= 34) return "#555";
  return "#000";
}

function Metric({ label, value, unit, sub, color = "#000" }: {
  label: string; value: string; unit?: string; sub?: string; color?: string;
}) {
  return (
    <div style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: 12,
      color,
    }}>
      <span style={{ fontSize: 52, fontWeight: 700, lineHeight: 1, letterSpacing: "-0.02em" }}>{value}</span>
      {unit && <span style={{ fontSize: 13, marginTop: 2, opacity: 0.45 }}>{unit}</span>}
      <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 6, opacity: 0.5 }}>{label}</span>
      {sub && <span style={{ fontSize: 12, marginTop: 3, opacity: 0.4 }}>{sub}</span>}
    </div>
  );
}

function VDivider() {
  return <div style={{ width: 1, background: "#e0e0e0", margin: "12px 0" }} />;
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      padding: "12px 20px",
      gap: 10,
    }}>
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", opacity: 0.35, marginBottom: 2 }}>{label}</div>
      <div style={{ display: "flex", flexDirection: "row", gap: 20, alignItems: "flex-end" }}>
        {children}
      </div>
    </div>
  );
}

function MiniStat({ value, unit }: { value: string; unit: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
      <span style={{ fontSize: 26, fontWeight: 600, lineHeight: 1 }}>{value}</span>
      <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.07em", opacity: 0.45, marginTop: 3 }}>{unit}</span>
    </div>
  );
}
