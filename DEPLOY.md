# CareerOS — Deployment Guide

## Overview
- **Backend** → Railway (Node.js + SQLite volume)
- **Frontend** → Netlify (static React build)

---

## Step 1 — Push to GitHub

Run the setup script from your CareerOS folder in PowerShell:

```powershell
cd "C:\Users\Keand\OneDrive\Desktop\AI Op\CareerOS"
.\github-setup.ps1
```

Then create a repo at https://github.com/new named `careeros`, and push:

```powershell
git remote add origin https://github.com/keandrajm/careeros.git
git push -u origin main
```

---

## Step 2 — Deploy Backend to Railway

1. Go to https://railway.app and sign in with GitHub
2. Click **New Project → Deploy from GitHub repo** → select `careeros`
3. Railway will detect the `backend/` folder — set **Root Directory** to `backend`
4. Add a **Volume** (for SQLite persistence):
   - Mount path: `/data`
5. Set these **Environment Variables** in Railway:

| Variable | Value |
|---|---|
| `PORT` | `3001` |
| `DATABASE_URL` | `/data/careeros.sqlite` |
| `OPENAI_API_KEY` | your key |
| `DISCORD_WEBHOOK_URL` | your webhook |
| `AI_PROVIDER` | `openai` |
| `DASHBOARD_URL` | your Netlify URL |
| `ALLOWED_ORIGINS` | your Netlify URL |
| `CAREEROS_API_KEY` | a long private dashboard access key |
| `RATE_LIMIT_MAX` | `300` |
| `MUTATION_RATE_LIMIT_MAX` | `40` |
| `NODE_ENV` | `production` |
| `TZ` | `America/Los_Angeles` |

6. Click **Deploy**. Railway will give you a URL like `https://careeros-backend-xyz.railway.app`

---

## Step 3 — Deploy Frontend to Netlify

1. Go to https://netlify.com and sign in with GitHub
2. Click **Add new site → Import an existing project** → select `careeros`
3. Set **Base directory** to `frontend`
4. Build command: `npm run build`
5. Publish directory: `dist`
6. Open `frontend/netlify.toml` and **replace** `YOUR-RAILWAY-URL` with your actual Railway URL
7. Commit and push that change:
   ```powershell
   git add frontend/netlify.toml
   git commit -m "Set Railway backend URL in Netlify config"
   git push
   ```
8. Netlify will auto-deploy. Your dashboard will be live at `https://your-site.netlify.app`

## Security Checklist

- Rotate any key that was ever exposed locally or in deployment logs.
- Set `CAREEROS_API_KEY` in Railway and enter that same value when the dashboard asks for access.
- Set `DASHBOARD_URL` and `ALLOWED_ORIGINS` in Railway to your exact Netlify URL.
- Do not put OpenAI, Gemini, Anthropic, or Discord secrets in Netlify.
- Keep Netlify indexing disabled with the included `X-Robots-Tag` header.

---

## Step 4 — Verify Everything Works

1. Visit `https://careeros-backend-xyz.railway.app/health` — should return `{"status":"ok"}`
2. Visit your Netlify URL — CareerOS dashboard should load
3. Click **Run Scan** — check Bot Logs for scan activity
4. Check your Discord channel for scan completion notification

---

## Updating the App

Any `git push` to `main` will auto-redeploy both Railway and Netlify.

```powershell
git add -A
git commit -m "your change"
git push
```
