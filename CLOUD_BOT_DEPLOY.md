# CareerOS Cloud Bot Deploy

The Discord bot runs inside the backend process. To keep it online while the laptop is closed, deploy the backend as an always-on cloud service.

## Best Option: Render Blueprint

1. Go to Render and create a new Blueprint from this GitHub repo.
2. Render will read `render.yaml`.
3. Choose a paid always-on instance if you want the bot and scheduler to stay awake.
4. Add the private environment variables Render marks as `sync: false`.

Required secrets:

```text
CAREEROS_API_KEY=<private dashboard key>
ALLOWED_ORIGINS=<your frontend URL>
DASHBOARD_URL=<your frontend URL>
DATABASE_URL=/data/careeros.sqlite
DISCORD_BOT_TOKEN=<rotated Discord bot token>
DISCORD_CHAT_WEBHOOK_URL=<bot chat webhook>
DISCORD_WEBHOOK_URL=<alerts webhook>
CANDIDATE_PROFILE_TEXT=<private candidate profile>
CANDIDATE_RESUME_SUMMARY=<private resume summary>
CANDIDATE_PORTFOLIO_URL=<optional portfolio URL>
```

AI provider secrets:

```text
AI_PROVIDER=openai
OPENAI_API_KEY=<key>
```

or use Anthropic/Gemini instead.

## Railway Option

Railway can use the included `Dockerfile`.

1. Connect the GitHub repo.
2. Use the repo root.
3. Add a persistent volume mounted at `/data`.
4. Add the same environment variables listed above.
5. Verify `/health`.

## Important Security Step

Rotate any Discord bot token that was pasted into chat, screenshots, logs, or GitHub. Use the rotated token in cloud env vars only.

## Verify The Bot

After cloud deploy:

1. Open `/health` for the cloud backend.
2. Mention the bot in Discord with `help`.
3. Try `status`.
4. Try `prefer implementation operations`.
5. Check Bot Logs in the dashboard.
