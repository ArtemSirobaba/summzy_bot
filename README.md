# Summarize Telegram Bot

Telegram bot for:
- summarizing a URL
- chatting about the summarized document
- resetting context with `/newchat`

## Core flow
1. Send a URL.
2. Bot fetches content and returns a concise summary.
3. Ask follow-up questions about that document.
4. Use `/newchat` to clear session and start over.

When you send a new URL, current document context is replaced automatically.

## Commands
- `/start`
- `/help`
- `/newchat`

## Requirements
- Node.js 22+
- `pnpm`
- Telegram bot token
- At least one model provider API key:
  - `OPENROUTER_API_KEY`
  - `OPENAI_API_KEY`
  - `ANTHROPIC_API_KEY`
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
- `XAI_API_KEY` (optional)
- `DEFAULT_PROVIDER` (optional: `openrouter`, `openai`, `anthropic`, `xai`)
- `DEFAULT_MODEL` (optional)
- `MAX_TELEGRAM_MESSAGE_LENGTH` (optional, default `4000`)

## Model selection
- Available providers are discovered from keys present in `.env`.
- Default model selection:
  1. Use `DEFAULT_PROVIDER` + `DEFAULT_MODEL` when valid and available.
  2. Otherwise use first available provider in this order: `openrouter`, `openai`, `anthropic`, `xai`.

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
