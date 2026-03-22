import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const TEMPLATE = `<style>
  .metric { display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1; padding: 8px; }
  .metric .val { font-size: 42px; font-weight: 700; line-height: 1; }
  .metric .lbl { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 4px; opacity: 0.6; }
  .metric .sub { font-size: 13px; margin-top: 2px; opacity: 0.5; }
  .divider-v { width: 1px; background: currentColor; opacity: 0.15; margin: 12px 0; }
  .divider-h { height: 1px; background: currentColor; opacity: 0.15; margin: 0 12px; }
  .row { display: flex; flex-direction: row; align-items: stretch; flex: 1; }
  .macro { display: flex; flex-direction: column; align-items: center; flex: 1; }
  .macro .val { font-size: 22px; font-weight: 600; }
  .macro .lbl { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; opacity: 0.5; margin-top: 2px; }
  .section { display: flex; flex-direction: column; align-items: stretch; padding: 0 4px; }
  .section-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.45; margin-bottom: 6px; padding-left: 4px; }
</style>

<div class="layout layout--col layout--stretch">

  <!-- TOP ROW: Recovery + Sleep + HRV + Strain -->
  <div class="row" style="flex: 1.2;">
    <div class="metric">
      {% if recovery_score %}
        <span class="val">{{ recovery_score }}</span>
        <span class="lbl">Recovery</span>
        <span class="sub">%</span>
      {% else %}
        <span class="val" style="opacity:0.25;">—</span>
        <span class="lbl">Recovery</span>
      {% endif %}
    </div>
    <div class="divider-v"></div>
    <div class="metric">
      {% if sleep_score %}
        <span class="val">{{ sleep_score }}</span>
        <span class="lbl">Sleep Score</span>
        {% if sleep_hours %}<span class="sub">{{ sleep_hours }}h</span>{% endif %}
      {% else %}
        <span class="val" style="opacity:0.25;">—</span>
        <span class="lbl">Sleep</span>
      {% endif %}
    </div>
    <div class="divider-v"></div>
    <div class="metric">
      {% if hrv %}
        <span class="val">{{ hrv }}</span>
        <span class="lbl">HRV</span>
        <span class="sub">ms</span>
      {% else %}
        <span class="val" style="opacity:0.25;">—</span>
        <span class="lbl">HRV</span>
      {% endif %}
    </div>
    <div class="divider-v"></div>
    <div class="metric">
      {% if strain %}
        <span class="val">{{ strain }}</span>
        <span class="lbl">Strain</span>
        {% if rhr %}<span class="sub">{{ rhr }} rhr</span>{% endif %}
      {% else %}
        <span class="val" style="opacity:0.25;">—</span>
        <span class="lbl">Strain</span>
      {% endif %}
    </div>
  </div>

  <div class="divider-h"></div>

  <!-- BOTTOM ROW: Body + Activity + Nutrition -->
  <div class="row" style="flex: 1;">

    <!-- Body -->
    <div class="section" style="flex: 1; justify-content: center;">
      <div class="section-label">Body</div>
      <div style="display:flex; flex-direction:row; align-items:center; gap: 16px; padding: 0 8px;">
        {% if weight_lbs %}
          <div class="macro">
            <span class="val">{{ weight_lbs }}</span>
            <span class="lbl">lbs</span>
          </div>
        {% endif %}
        {% if body_fat %}
          <div class="macro">
            <span class="val">{{ body_fat }}%</span>
            <span class="lbl">Body Fat</span>
          </div>
        {% endif %}
        {% if weight_lbs == blank and body_fat == blank %}
          <span style="opacity:0.25; font-size:13px;">No data</span>
        {% endif %}
      </div>
    </div>

    <div class="divider-v"></div>

    <!-- Activity -->
    <div class="section" style="flex: 1; justify-content: center;">
      <div class="section-label">Activity</div>
      <div style="display:flex; flex-direction:row; align-items:center; gap: 16px; padding: 0 8px;">
        {% if steps %}
          <div class="macro">
            <span class="val">{{ steps | divided_by: 1000.0 | round: 1 }}k</span>
            <span class="lbl">Steps</span>
          </div>
        {% endif %}
        <div class="macro">
          <span class="val">{{ weekly_workouts }}</span>
          <span class="lbl">Workouts / 7d</span>
        </div>
        {% if avg_daily_steps %}
          <div class="macro">
            <span class="val">{{ avg_daily_steps | divided_by: 1000.0 | round: 1 }}k</span>
            <span class="lbl">Avg Steps</span>
          </div>
        {% endif %}
      </div>
    </div>

    <div class="divider-v"></div>

    <!-- Nutrition -->
    <div class="section" style="flex: 1; justify-content: center;">
      <div class="section-label">Nutrition</div>
      <div style="display:flex; flex-direction:row; align-items:center; gap: 12px; padding: 0 8px;">
        {% if food_calories %}
          <div class="macro">
            <span class="val">{{ food_calories }}</span>
            <span class="lbl">kcal</span>
          </div>
        {% endif %}
        {% if protein_g %}
          <div class="macro">
            <span class="val">{{ protein_g }}g</span>
            <span class="lbl">Protein</span>
          </div>
        {% endif %}
        {% if water_oz %}
          <div class="macro">
            <span class="val">{{ water_oz }}</span>
            <span class="lbl">oz H₂O</span>
          </div>
        {% endif %}
        {% if food_calories == blank and protein_g == blank %}
          <span style="opacity:0.25; font-size:13px;">No data</span>
        {% endif %}
      </div>
    </div>

  </div>

</div>

<div class="title_bar">
  <span class="title">{% if name %}{{ name }}'s Health{% else %}Health Dashboard{% endif %}</span>
  <span class="instance">{{ date }}</span>
</div>`;

export function GET() {
  return new NextResponse(TEMPLATE, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
