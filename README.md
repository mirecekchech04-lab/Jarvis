# J.A.R.V.I.S.

> *Just A Rather Very Intelligent System* — a personal, voice-driven AI assistant with a Tony Stark style HUD workstation interface.

Talk to JARVIS out loud, and JARVIS talks back in a refined, Iron-Man-inspired voice. Ask it anything — when connected to an AI model it can answer virtually any question, hold a conversation, and help with your work. The interface is a glowing arc-reactor "workstation" with live diagnostics, an audio visualiser, and a comms log.

![JARVIS](https://img.shields.io/badge/status-online-35d6ff) ![node](https://img.shields.io/badge/node-%3E%3D18-1b6f8c)

## Features

- **Voice input** — hands-free speech recognition (Web Speech API). Tap the reactor or hit `Space` to speak.
- **Jarvis voice output** — spoken replies using the best available refined/British male voice, with adjustable rate & pitch.
- **Answers anything** — a backend that connects to any OpenAI-compatible chat model (OpenAI, OpenRouter, Groq, a local LLM, …).
- **Works out of the box** — with no API key it falls back to a built-in offline personality core (time, date, math, greetings, chat).
- **Continuous listen mode** — a true conversational, hands-free loop.
- **Tony Stark HUD** — animated arc reactor, rotating rings, audio-reactive visualiser, system telemetry, scanlines and corner framing.
- **Personalisable** — set what JARVIS calls you ("sir", your name, …) and pick your preferred voice in Settings.

## Quick start

```bash
# 1. Get the code and move INTO the project folder
git clone <this-repo-url>
cd jarvis            # the folder that contains package.json

# 2. Install dependencies
npm install

# 3. (Optional but recommended) add your AI key for full intelligence
cp .env.example .env
#   then edit .env and set OPENAI_API_KEY=...

# 4. Launch JARVIS
npm start
```

Then open **http://localhost:3000** in **Chrome** or **Edge** (best Web Speech API support), allow microphone access, and start talking.

> Tip: for voice input the page must be served over `localhost` or HTTPS — both are satisfied by running it locally as above.

> **`npm install` says "no such file or directory"?** You're almost certainly running it from the wrong folder. See [Troubleshooting](#troubleshooting).

## Configuration

All configuration lives in `.env` (copy from `.env.example`):

| Variable          | Default                     | Description                                                        |
| ----------------- | --------------------------- | ------------------------------------------------------------------ |
| `PORT`            | `3000`                      | Port the server listens on.                                        |
| `OPENAI_API_KEY`  | *(empty)*                   | Your API key. If empty, JARVIS uses its offline personality core.  |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` | Any OpenAI-compatible endpoint (OpenRouter, Groq, local LLM, …).   |
| `OPENAI_MODEL`    | `gpt-4o-mini`               | The model to use for reasoning.                                    |
| `ASSISTANT_NAME`  | `JARVIS`                    | The name your assistant answers to.                                |
| `USER_TITLE`      | `sir`                       | How JARVIS addresses you (can also be changed live in Settings).   |

## Using it

- **Speak:** tap the glowing reactor core (or press `Space`), ask your question, and JARVIS answers aloud.
- **Type:** use the input box at the bottom if you prefer.
- **Continuous Listen:** toggle it on for a fully hands-free back-and-forth conversation.
- **Speak Replies:** toggle spoken output on/off.
- **Settings (⚙):** change how JARVIS addresses you, pick a voice, and tune speech rate & pitch. "Test Voice" previews it.

## How it works

```
Browser (public/)                         Server (Node + Express)
 ├─ SpeechRecognition  ── voice ──▶  text
 ├─ fetch /api/chat  ───────────────▶  ├─ builds JARVIS persona prompt
 │                                     ├─ calls OpenAI-compatible API
 │                                     └─ falls back to offline-brain.js
 ├─ SpeechSynthesis  ◀── reply text ──┘
 └─ Canvas visualiser + HUD
```

- `server.js` — Express server: serves the UI, exposes `/api/config` and `/api/chat`, proxies to the LLM, and gracefully degrades to the offline core on error or when no key is set.
- `offline-brain.js` — dependency-free fallback "personality" so the app is always responsive.
- `public/` — the HUD front-end (`index.html`, `styles.css`, `app.js`).

## Requirements

- Node.js ≥ 18.
- A Chromium-based browser (Chrome/Edge) for voice input. Voice output works in most modern browsers; the assistant also works fully by typing.

## Troubleshooting

### `npm install` → *"no such file or directory"* / `ENOENT: … open '…/package.json'`

This does **not** mean anything is broken in the project — it means `npm` was run somewhere it can't find `package.json`. Fix it with the checks below:

1. **Make sure you're inside the project folder.** `npm install` must be run from the directory that contains `package.json`. Run `ls` (or `dir` on Windows) and confirm you see `package.json`. If you don't, `cd` into the project first:

   ```bash
   cd path/to/jarvis     # the folder with package.json
   ls package.json       # should print: package.json
   npm install
   ```

   A common mistake right after `git clone` is forgetting to `cd` into the newly created folder.

2. **Confirm Node and npm are installed.** `npm install` needs Node.js ≥ 18. Check with:

   ```bash
   node -v    # should print v18.x or newer
   npm -v
   ```

   If these say "command not found", install Node.js from <https://nodejs.org> (the LTS build) and reopen your terminal.

3. **Still stuck? Do a clean install.** A corrupted or partial install can leave things in a bad state. From the project folder:

   ```bash
   rm -rf node_modules package-lock.json   # (Windows PowerShell: Remove-Item -Recurse -Force node_modules, package-lock.json)
   npm install
   ```

If none of the above helps, run `npm install` again and copy the full error text (especially the line that starts with `npm ERR!`) when asking for help — the path shown after `ENOENT` tells you exactly which folder npm was looking in.

## Notes on privacy

Voice recognition is handled by your browser's built-in speech service. When an AI key is configured, your typed/spoken messages are sent to the configured model endpoint to generate replies. With no key set, everything stays local via the offline core.

## License

MIT
