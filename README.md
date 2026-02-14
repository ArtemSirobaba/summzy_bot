# Summzy Telegram Bot

![Summzy Logo](public/summzy.png)

Telegram bot for:
- summarizing a URL
- chatting about the summarized document
- resetting context with `/newchat`
- using `/summzy <url>` in groups for explicit summarize trigger
- tuning extraction behavior per chat (`/preview*` commands, admin-only)

## Core flow
1. Private chat: send a URL (or use `/summzy <url>`).
2. Group chat: use `/summzy <url>`.
3. Bot fetches content and returns a concise summary.
4. Ask follow-up questions about that document.
5. Use `/newchat` to clear session and start over.

When you send a new URL, current document context is replaced automatically.

## Commands
- `/start`
- `/help`
- `/summzy <url>` - summarize a URL (required in group/supergroup chats)
- `/newchat`
- `/features` - show env-driven extractor capabilities (admin-only)
- `/preview` - show active extraction options for current chat (admin-only)
- `/previewset <key> <value>` - override one extraction option (admin-only)
- `/previewpreset <fast|balanced|deep|media>` - apply a preset profile (admin-only)
- `/previewreset` - clear per-chat extraction overrides (admin-only)

## Summary throttling
- Non-admin users: up to 1 summary per hour (global per Telegram user id).
- Admin users (`TELEGRAM_USER_ID` / `TELEGRAM_USER_IDS`): unlimited summaries.

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
- `TELEGRAM_USER_ID` (optional single admin user id for preview controls and summary throttle exemption)
- `TELEGRAM_USER_IDS` (optional JSON array like `[123,456]` or comma-separated `123,456`; same admin uses)
- `MAX_TELEGRAM_MESSAGE_LENGTH` (optional, default `4000`)
- `APIFY_API_TOKEN` (optional, enables YouTube transcript fallback via Apify)
- `YT_DLP_PATH` (optional, enables yt-dlp transcript workflows)
- `FIRECRAWL_API_KEY` (optional, enables Firecrawl scraping)
- `GROQ_API_KEY` (optional, enables Groq transcription backend)
- `FAL_KEY` or `FAL_API_KEY` (optional, enables FAL transcription backend)
- `LINK_PREVIEW_TIMEOUT_MS` (optional, default `120000`)
- `LINK_PREVIEW_MAX_CHARACTERS` (optional, default `8000`)
- `LINK_PREVIEW_CACHE_MODE` (optional: `default`, `bypass`)
- `LINK_PREVIEW_YOUTUBE_TRANSCRIPT_MODE` (optional: `auto`, `web`, `apify`, `yt-dlp`, `no-auto`)
- `LINK_PREVIEW_MEDIA_TRANSCRIPT_MODE` (optional: `auto`, `prefer`)
- `LINK_PREVIEW_TRANSCRIPT_TIMESTAMPS` (optional boolean, default `false`)
- `LINK_PREVIEW_FIRECRAWL_MODE` (optional: `off`, `auto`, `always`)
- `LINK_PREVIEW_FORMAT` (optional: `text`, `markdown`; default `markdown`)
- `LINK_PREVIEW_MARKDOWN_MODE` (optional: `off`, `auto`, `llm`, `readability`)
- `LINK_PREVIEW_DEBUG_PROGRESS` (optional boolean, logs extractor progress events)

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
  handlers/
    message.ts
  models/
    anthropic.ts
    index.ts
    minimax.ts
    openai.ts
    openrouter.ts
    xai.ts
  prompts/
    system.ts
  services/
    ai.ts
    document.ts
    session-store.ts
  types/
    chat.ts
  utils/
    chunk.ts
    url.ts
  index.ts
```

## Scripts
- `pnpm dev` - run bot in development
- `pnpm build` - compile TypeScript
- `pnpm typecheck` - run TypeScript checks
