# CareerOS Deployment Guide

This guide is intentionally generic so personal paths, usernames, domains, and secrets are not published.

## Backend Cloud Service

Deploy `backend/` as a long-running Node service on Railway or Render. The Discord bot runs inside the backend process, so it stays online whenever this cloud service is healthy.

Build command:

```bash
npm ci --omit=dev
```

Start command:

```bash
npm start
```

Recommended environment variables:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Persistent SQLite path or provider database URL |
| `CAREEROS_API_KEY` | Long private dashboard key |
| `ALLOWED_ORIGINS` | Your deployed frontend origin |
| `DASHBOARD_URL` | Your deployed frontend URL |
| `AI_PROVIDER` | `openai`, `anthropic`, or `gemini` |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `GEMINI_API_KEY` | Provider key |
| `DISCORD_WEBHOOK_URL` | Optional alert webhook |
| `DISCORD_CHAT_WEBHOOK_URL` | Optional bot-chat webhook |
| `DISCORD_BOT_TOKEN` | Optional two-way Discord bot token |
| `CANDIDATE_PROFILE_TEXT` | Private candidate profile text |
| `CANDIDATE_RESUME_SUMMARY` | Private resume summary |
| `CANDIDATE_PORTFOLIO_URL` | Optional portfolio URL |
| `SCAN_CRON` | Default: `0 7,11,15,19 * * *` |
| `URL_CHECK_CRON` | Default: `25 6 * * *` |
| `SYSTEM_CHECK_CRON` | Default: `45 6 * * *` |
| `TZ` | Example: `America/Los_Angeles` |

## Frontend Cloud Service

Deploy `frontend/` as a static site.

Build command:

```bash
npm run build
```

Publish directory:

```bash
dist
```

Set `VITE_API_URL` only if your host does not proxy `/api` and `/health`.

## Security Checklist

- Rotate any key that was pasted into chat, logs, screenshots, or GitHub.
- Keep backend secrets only in cloud environment variables or ignored local `.env`.
- Do not put AI keys, Discord tokens, webhook URLs, or private candidate profile text in frontend variables.
- Use `CAREEROS_API_KEY`.
- Restrict `ALLOWED_ORIGINS` to the frontend origin.
- Keep the repository private if it contains historical private commits.

## Verify

- Backend `/health` returns `{"status":"ok"}`
- Frontend loads and prompts for the access key
- `POST /api/jobs/scan` works with `X-CareerOS-Key`
- Discord bot logs in if `DISCORD_BOT_TOKEN` is configured
