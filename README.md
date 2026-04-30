# CareerOS

Private, review-first job-search automation dashboard.

CareerOS scans approved public job-board APIs, filters and scores roles, creates application packets, drafts resume/cover-letter content from a private candidate profile, and loads everything into a dashboard for human review. It never submits applications automatically.

## Features

- Express backend with SQLite
- React/Vite dashboard
- Greenhouse, Lever, and Ashby public job-board integrations
- Review-first scoring, packet generation, approval/rejection tracking, and bot logs
- Optional AI drafts through OpenAI, Anthropic, or Gemini
- Optional Discord alerts and two-way Discord bot commands
- Scheduled scans, URL checks, and preference learning

## Privacy Model

Do not commit private candidate details, API keys, webhook URLs, bot tokens, access keys, local machine paths, or personal deployment URLs.

Private candidate details are loaded from either:

- `CANDIDATE_PROFILE_TEXT`
- `CANDIDATE_RESUME_SUMMARY`
- `CANDIDATE_PORTFOLIO_URL`
- ignored local files in `backend/private/`

The repository includes only generic templates.

## Local Setup

```bash
cd careeros
cd backend
npm install
copy .env.example .env
npm start
```

In another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

## Required Environment Variables

See `backend/.env.example` and `backend/.env.production.example`.

Important production variables:

- `DATABASE_URL`
- `CAREEROS_API_KEY`
- `ALLOWED_ORIGINS`
- `DASHBOARD_URL`
- `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or `GEMINI_API_KEY`
- `DISCORD_WEBHOOK_URL`
- `DISCORD_CHAT_WEBHOOK_URL`
- `DISCORD_BOT_TOKEN`
- `CANDIDATE_PROFILE_TEXT`
- `CANDIDATE_RESUME_SUMMARY`
- `CANDIDATE_PORTFOLIO_URL`

## Cloud

The backend can run on Railway or Render as a long-running Node service. When deployed with `DISCORD_BOT_TOKEN`, the Discord bot can stay online while your laptop is closed.

The frontend can run on Netlify, Render static sites, Vercel, or any static host.

## Safety

- No auto-apply
- No password storage
- No CAPTCHA bypass
- No prohibited scraping
- No committed secrets
- Dashboard API protected by `CAREEROS_API_KEY` when configured

## Useful Commands

```bash
cd backend
npm run ingest
npm run rescore
npm start
```

```bash
cd frontend
npm run build
```
