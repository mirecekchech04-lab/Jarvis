# AGENTS.md

## Cursor Cloud specific instructions

J.A.R.V.I.S. is a single Node.js/Express app (no monorepo, no build step, no database). See `README.md` for full docs and `package.json` for scripts.

### Running the app
- Dev server (hot reload): `npm run dev` (`node --watch server.js`). Prod: `npm start`. Serves on `http://localhost:3000` (override with `PORT`).
- No lint or automated test scripts are defined in this repo.

### Non-obvious notes
- The app runs fully without any config: with `OPENAI_API_KEY` unset it uses the built-in `offline-brain.js` fallback (`/api/config` reports `"aiOnline": false`, `"model": "offline-core"`). Set `OPENAI_API_KEY` in `.env` (copy from `.env.example`) to enable the real LLM.
- The offline brain only understands a few intents (time, date, simple math, greetings). Math must be phrased with operators/keywords it parses — e.g. `12 * 8` works, but conversational phrasings may fall through to a generic/time-ish reply. This is expected offline behavior, not an environment bug.
- Voice input requires a real Chromium browser (Chrome/Edge) with mic access over localhost/HTTPS and cannot be exercised headlessly. Typed input and the HTTP API (`/api/chat`, `/api/config`, `/healthz`) fully exercise the backend for testing.
- Quick backend smoke test: `curl -s -X POST localhost:3000/api/chat -H 'Content-Type: application/json' -d '{"message":"what time is it"}'`.

### Real AI-online test run
- To exercise the real reasoning-core path (`/api/chat` returns `"source":"ai"`, `/api/config` reports `"aiOnline": true`), set `OPENAI_API_KEY` in `.env` (plus optional `OPENAI_BASE_URL`/`OPENAI_MODEL`) and restart the server. `.env` changes are NOT picked up by `--watch`, so restart the `npm run dev` process after editing it.
- No external key required for local verification: point `OPENAI_BASE_URL` at any local OpenAI-compatible `/chat/completions` endpoint (any non-empty `OPENAI_API_KEY` flips the app into AI-online mode). Any upstream error/timeout gracefully degrades to the offline core (`source":"offline-fallback"`).
