# Summzy Telegram Bot

![Summzy Logo](public/summzy.png)

Telegram bot for:
- chatting with an AI agent
- using built-in web tools (web search, page scrape, link summarization)
- resetting context with `/newchat`

## Core flow
1. Private chat: send any text, the agent responds.
2. Group chat: bot responds only if you reply to bot message or mention `@botusername`.
3. Agent may call web tools when helpful.
4. Use `/newchat` to clear conversation history.

## Commands
- `/start`
- `/help`
- `/newchat`

## AI usage throttling
- Non-admin users: up to 5 AI-processed messages per hour (global per Telegram user id).
- Admin users (`TELEGRAM_USER_ID` / `TELEGRAM_USER_IDS`): unlimited usage.

## Requirements
- Node.js 22+
- `pnpm`
- Telegram bot token
- At least one model provider API key:
  - `OPENROUTER_API_KEY`
  - `OPENAI_API_KEY`
  - `ANTHROPIC_API_KEY`
  - `MINIMAX_API_KEY`
  - `XAI_API_KEY`

## Setup
```bash
pnpm install
cp .env.example .env
```

Fill `.env` with required values, then run:

```bash
pnpm dev
```

## Environment variables
- `BOT_TOKEN` (required)
- `OPENROUTER_API_KEY` (optional, but at least one provider key is required)
- `OPENAI_API_KEY` (optional)
- `ANTHROPIC_API_KEY` (optional)
- `MINIMAX_API_KEY` (optional)
- `XAI_API_KEY` (optional)
- `DEFAULT_PROVIDER` (optional: `openrouter`, `openai`, `anthropic`, `minimax`, `xai`)
- `DEFAULT_MODEL` (optional)
- `TELEGRAM_USER_ID` (optional single admin user id for unlimited AI usage)
- `TELEGRAM_USER_IDS` (optional JSON array like `[123,456]` or comma-separated `123,456`; same admin uses)
- `MAX_TELEGRAM_MESSAGE_LENGTH` (optional, default `4000`)
- `APIFY_API_TOKEN` (optional, enables YouTube transcript fallback via Apify)
- `YT_DLP_PATH` (optional, enables yt-dlp transcript workflows)
- `FIRECRAWL_API_KEY` (optional, enables Firecrawl scraping)
- `GROQ_API_KEY` (optional, enables Groq transcription backend)
- `FAL_KEY` or `FAL_API_KEY` (optional, enables FAL transcription backend)

## Model selection
- Available providers are discovered from keys present in `.env`.
- Default model selection:
  1. Use `DEFAULT_PROVIDER` + `DEFAULT_MODEL` when valid and available.
  2. Otherwise use first available provider in this order: `openrouter`, `openai`, `anthropic`, `minimax`, `xai`.

## Project structure
```txt
src/
  bot/
    commands.ts
    createBot.ts
  config/
    env.ts
    models/
      anthropic.ts
      index.ts
      minimax.ts
      openai.ts
      openrouter.ts
      xai.ts
  handlers/
    message.ts
  prompts/
    system.ts
  services/
    ai.ts
    session-store.ts
    summary-throttle.ts
  types/
    chat.ts
  web-tools/
    index.ts
    processor.ts
  utils/
    chunk.ts
  index.ts
```

## Scripts
- `pnpm dev` - run bot in development
- `pnpm build` - compile TypeScript
- `pnpm typecheck` - run TypeScript checks
