# Health Dashboard

A local-first personal health dashboard built with Next.js and SQLite. Track weight, food, workouts, sleep, recovery, body composition, and blood work — all in one place.

Ships with pre-built connectors for **Oura Ring**, **Whoop**, **Withings**, **Chronometer**, and **Ladder** workout screenshots. Each source can be toggled on/off independently, with test data available for every source so you can explore the dashboard before connecting real accounts.

## Quick Start

```bash
git clone https://github.com/alvst/health-dashboard.git
cd health-dashboard
npm install
npm run dev     # http://localhost:3000
```

Go to Settings and click "Load Test Data" on any source to populate the dashboard with 30 days of realistic sample data.

## Data Sources

### Oura Ring
Syncs sleep score, readiness, steps, active calories, and workout calories via OAuth.

1. Create a developer account at [cloud.ouraring.com](https://cloud.ouraring.com/v2/docs)
2. Create a new application with redirect URI `http://localhost:3000/api/oura-callback`
3. Add your credentials to `.env`:
   ```
   OURA_CLIENT_ID=your-client-id
   OURA_CLIENT_SECRET=your-client-secret
   ```
4. Go to Settings → Oura Ring → Connect Oura

### Whoop
Syncs recovery score, HRV, resting heart rate, strain, sleep performance, sleep hours, and workout calories via OAuth.

1. Create a developer account at [developer.whoop.com](https://developer.whoop.com)
2. Register redirect URI `http://localhost:3000/api/whoop-callback` in your app settings
3. Add your credentials to `.env`:
   ```
   WHOOP_CLIENT_ID=your-client-id
   WHOOP_CLIENT_SECRET=your-client-secret
   ```
4. Go to Settings → Whoop → Connect Whoop
5. Use **Sync Now** for the last 3 days or **30-Day Sync** for full history (Whoop limits access to 30 days)

### Withings
Syncs weight, body fat percentage, and muscle mass from smart scales via OAuth.

1. Register at [developer.withings.com](https://developer.withings.com)
2. Create an app with redirect URI `http://localhost:3000/api/withings-callback`
3. Add your credentials to `.env`:
   ```
   WITHINGS_CLIENT_ID=your-client-id
   WITHINGS_CLIENT_SECRET=your-client-secret
   ```
4. Go to Settings → Withings → Connect Withings

### Chronometer
Syncs food calories, macros (protein/carbs/fat), and water intake via browser automation.

1. Add your Chronometer credentials to `.env`:
   ```
   CHRONO_EMAIL=your-email
   CHRONO_PASS=your-password
   ```
2. Install Playwright browsers: `npx playwright install chromium`
3. Go to Settings → Chronometer → Sync Now

### Ladder (Workout Screenshots)
Scans workout screenshots from an iCloud folder and extracts duration, calories, and date using OCR.

- **Default folder**: `~/Library/Mobile Documents/com~apple~CloudDocs/Workout Pics`
- **With Gemini Vision** (recommended): Add `GEMINI_API_KEY` to `.env` and set `NEXT_PUBLIC_GEMINI_CONFIGURED=1` for much better accuracy
- **Without Gemini**: Falls back to Tesseract.js OCR
- Use **Sync New** to process only new screenshots, or **Reprocess All** to re-run OCR on everything

### Blood Work
Upload CSV reports with columns `marker,value,unit,reference_range,status,time`.

- Click the **+** button on the Blood Work page to upload a CSV
- Or bulk import: `npx tsx scripts/import-bloodwork.ts /path/to/csv/folder`

## Dashboard

The dashboard is split into a **Summary** section and per-source sections:

- **Summary** — key metrics averaged across sources (e.g. Recovery averages Oura readiness + Whoop recovery score)
- **Oura** — sleep, readiness, activity
- **Whoop** — recovery, strain, HRV
- **Withings** — weight, body fat, muscle mass
- **Chronometer** — calories, macros, water
- **Ladder** — workout history and frequency

Each tile header shows colored dots indicating which sources feed into it. Hover a dot to see the source name. Disabling a source in Settings hides its data from the dashboard entirely.

## Source Toggle System

Every source can be enabled/disabled from the Settings page. When a source is disabled:
- Its data is hidden from all dashboard tiles
- Its sync buttons are disabled
- The toggle can be re-enabled at any time without data loss

## Environment Variables

Copy `.env.example` to `.env` and fill in the values you need:

```bash
cp .env.example .env
```

| Variable | Required for | Description |
|----------|-------------|-------------|
| `OURA_CLIENT_ID` | Oura sync | Oura developer app client ID |
| `OURA_CLIENT_SECRET` | Oura sync | Oura developer app client secret |
| `WHOOP_CLIENT_ID` | Whoop sync | Whoop developer app client ID |
| `WHOOP_CLIENT_SECRET` | Whoop sync | Whoop developer app client secret |
| `WITHINGS_CLIENT_ID` | Withings sync | Withings developer app client ID |
| `WITHINGS_CLIENT_SECRET` | Withings sync | Withings developer app client secret |
| `CHRONO_EMAIL` | Chronometer sync | Chronometer login email |
| `CHRONO_PASS` | Chronometer sync | Chronometer login password |
| `GEMINI_API_KEY` | Ladder OCR | Google AI Studio API key |
| `NEXT_PUBLIC_GEMINI_CONFIGURED` | Ladder OCR | Set to `1` when Gemini key is added |

## Stack

- **Next.js** with App Router
- **React**
- **SQLite** via better-sqlite3 (local file, no server needed)
- **SWR** for client-side data fetching
- **Tailwind CSS**

## License

MIT
