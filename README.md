# 🚀 CareerOS

**Private job-search automation dashboard for Keandra Morris.**

CareerOS scans job boards, scores listings against your candidate profile, generates tailored resume drafts and cover letters, and loads everything into a review dashboard — so you decide what to apply to. It never submits applications automatically.

---

## What CareerOS Does (MVP)

- Scans Greenhouse, Lever, and Ashby job board APIs
- Filters by: remote, full-time, salary ≥ $80K, US-eligible, no heavy coding/ML required
- Scores each job 0–100 across 6 dimensions
- Labels: 🟢 Green Light (80+) / 🟡 Yellow (65–79) / 🔴 Red (below 65)
- Drafts tailored resumes and cover letters using OpenAI or Claude API
- Builds complete application packets (resume, cover letter, app answers)
- Logs all activity to a bot log
- Sends Discord notifications for green jobs and scan summaries
- Runs daily at 9 AM (server time) or on demand

## MVP Limitations

- Does NOT auto-apply to any job (by design)
- Greenhouse/Lever/Ashby boards require you to add company tokens/slugs in service files
- LinkedIn and Indeed are NOT scanned (terms of service)
- AI drafts require a valid OpenAI or Anthropic API key
- SQLite database — fine for personal use; not for multi-user production

---

## Setup Instructions

### Prerequisites
- Node.js 18+
- npm
- OpenAI API key OR Anthropic API key (at least one)
- Discord webhook URL (optional but recommended)
- GitHub account (for deployment)
- Railway or Render account (for cloud hosting)

---

### 1. Clone / Download

```bash
cd "C:\Users\Keand\OneDrive\Desktop\AI Op"
# If using git:
git clone https://github.com/YOUR_USERNAME/careeros.git
cd careeros
```

---

### 2. Backend Setup

```bash
cd backend
npm install
```

Copy the example env file and fill in your values:
```bash
copy .env.example .env
```

Edit `.env`:
```
PORT=3000
DATABASE_URL=./src/data/careeros.sqlite
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
AI_PROVIDER=openai             # or: anthropic
DISCORD_WEBHOOK_URL=your-discord-webhook-url
DASHBOARD_URL=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173
CAREEROS_API_KEY=change-this-private-dashboard-key
RATE_LIMIT_MAX=300
MUTATION_RATE_LIMIT_MAX=40
SCAN_CRON=0 7,11,15,19 * * *
URL_CHECK_CRON=25 6 * * *
SYSTEM_CHECK_CRON=45 6 * * *
URL_CHECK_LIMIT=150
NODE_ENV=development
```

---

### 3. Frontend Setup

```bash
cd ../frontend
npm install
```

---

### 4. Run Locally

**Terminal 1 — Backend:**
```bash
cd backend
npm start
# or for dev with auto-restart:
npm run dev
```
Backend runs at: http://localhost:3000
Health check: http://localhost:3000/health

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```
Dashboard runs at: http://localhost:5173

---

### 5. Load Sample Jobs (for testing)

```bash
# In a third terminal or via the dashboard sidebar button:
curl -X POST http://localhost:3000/api/jobs/ingest/sample
```
Or click **"📥 Load Sample Jobs"** in the dashboard sidebar.

This loads 5 realistic sample jobs (2 green, 2 yellow, 1 red) so you can test all dashboard features without external APIs.

---

### 6. Trigger a Manual Scan

```bash
curl -X POST http://localhost:3000/api/jobs/scan
```
Or click **"🔍 Run Scan"** in the dashboard sidebar.

> Note: The scan will return immediately but run in the background. Watch Bot Logs for progress.
> The scan will find no jobs until you add company board tokens in the service files (see below).

---

### 7. Add Company Job Board Tokens

To scan real jobs, add company tokens to each service file:

**Greenhouse** — `backend/src/services/greenhouseService.js`:
```js
const COMPANY_BOARDS = [
  { token: 'stripe',    name: 'Stripe' },
  { token: 'hubspot',   name: 'HubSpot' },
  { token: 'shopify',   name: 'Shopify' },
  // Find tokens at: https://boards.greenhouse.io/{token}/jobs
];
```

**Lever** — `backend/src/services/leverService.js`:
```js
const COMPANY_SLUGS = [
  { slug: 'netflix',  name: 'Netflix' },
  { slug: 'airbnb',   name: 'Airbnb' },
  // Find slugs at: https://jobs.lever.co/{slug}
];
```

**Ashby** — `backend/src/services/ashbyService.js`:
```js
const COMPANY_SLUGS = [
  { slug: 'linear',   name: 'Linear' },
  { slug: 'ramp',     name: 'Ramp' },
  // Find slugs at: https://jobs.ashbyhq.com/{slug}
];
```

---

### 8. Discord Webhook Setup

1. Open your Discord server
2. Go to **Server Settings → Integrations → Webhooks**
3. Click **New Webhook**, name it "CareerOS Bot"
4. Copy the webhook URL
5. Paste it into your `.env` as `DISCORD_WEBHOOK_URL`

---

## Deploy to Railway

1. Push your code to GitHub:
```bash
git init
git add .
git commit -m "Initial CareerOS build"
git remote add origin https://github.com/YOUR_USERNAME/careeros.git
git push -u origin main
```

2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Select your `careeros` repo
4. Set the **root directory** to `backend`
5. Set environment variables in Railway dashboard (same as your `.env`)
6. Add `TZ=America/Los_Angeles` to ensure 9 AM Pacific cron
7. Railway auto-detects Node.js and runs `npm start`

**For the frontend:**
- Option A: Deploy frontend to Railway as a second service (root dir: `frontend`, build: `npm run build`, serve `dist/`)
- Option B: Deploy frontend to Netlify or Vercel (connect GitHub, set root dir to `frontend`)
- Update `DASHBOARD_URL` in backend env to the deployed frontend URL
- Update frontend's `vite.config.js` proxy target to the deployed backend URL

---

## Required Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Backend port (default: 3000) |
| `DATABASE_URL` | No | SQLite path (default: ./src/data/careeros.sqlite) |
| `OPENAI_API_KEY` | If using OpenAI | Your OpenAI API key |
| `ANTHROPIC_API_KEY` | If using Anthropic | Your Anthropic API key |
| `AI_PROVIDER` | No | `openai` or `anthropic` (default: openai) |
| `DISCORD_WEBHOOK_URL` | No | Discord webhook for notifications |
| `DASHBOARD_URL` | No | Frontend URL for Discord links |
| `ALLOWED_ORIGINS` | Recommended | Comma-separated allowed dashboard origins |
| `CAREEROS_API_KEY` | Recommended | Private dashboard access key required by API when set |
| `RATE_LIMIT_MAX` | No | API request limit per 15 minutes |
| `MUTATION_RATE_LIMIT_MAX` | No | Write request limit per minute |
| `SCAN_CRON` | No | Live job feed refresh schedule; default 7 AM, 11 AM, 3 PM, 7 PM Pacific |
| `URL_CHECK_CRON` | No | Daily job URL validation schedule |
| `SYSTEM_CHECK_CRON` | No | Daily learning/system check schedule |
| `URL_CHECK_LIMIT` | No | Max active jobs checked for broken URLs each day |
| `NODE_ENV` | No | `development` or `production` |
| `TZ` | Recommended | `America/Los_Angeles` for Pacific cron timing |

---

## Job Board Terms of Service Notes

- **Greenhouse**: Public job board API is designed for job seekers and integrations. Respect rate limits.
- **Lever**: Public postings API is intended for job aggregators. Respect rate limits.
- **Ashby**: Public job board API — intended for external access. Respect rate limits.
- **LinkedIn**: Not scanned. Their terms prohibit scraping.
- **Indeed**: Not scanned. Their terms prohibit scraping.
- CareerOS never auto-applies. You always review and submit manually.

---

## Verify Everything Works

- [ ] `npm start` in backend shows "CareerOS API running on http://localhost:3000"
- [ ] `http://localhost:3000/health` returns `{"status":"ok"}`
- [ ] `npm run dev` in frontend opens dashboard at `http://localhost:5173`
- [ ] "Load Sample Jobs" button loads 5 jobs into New Jobs view
- [ ] Green Light page shows 2 green jobs
- [ ] Yellow Light page shows 2 yellow jobs
- [ ] Rejected page shows 1 rejected job
- [ ] "Score" button on a job updates its score
- [ ] "Generate Packet" creates a packet (requires AI API key)
- [ ] Bot Logs page shows scan, URL check, and system learning activity entries
- [ ] Approve / Reject / Save / Self-Applied buttons update job status
- [ ] Discord notification received on scan complete (if webhook configured)

## Automation Rhythm

- Live job feeds refresh four times daily by default: 7 AM, 11 AM, 3 PM, and 7 PM Pacific.
- URL accuracy checks run daily and log `broken_link` events for job or company career links that fail.
- System learning runs daily, reads your approved, rejected, packet-ready, and self-applied jobs, and stores preference signals that can slightly boost or reduce future scores.
- Learning is conservative: it only adjusts scores after enough review history exists and never auto-applies.

---

## Future Phases (Not in MVP)

- **Phase 2**: Reminders and follow-up tracking (7/14-day follow-ups)
- **Phase 3**: Additional job sources (Workday, SmartRecruiters, AngelList/Wellfound)
- **Phase 4**: Auto-apply for select platforms (Greenhouse apply API, with full review gate)
- **Phase 5**: Analytics dashboard (application rate, response rate, pipeline health)
- **Phase 6**: Multi-user support with authentication
- **Phase 7**: Mobile notifications (SMS or push)

---

*Built for Keandra Morris — CareerOS v1.0 MVP*
