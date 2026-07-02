import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { offlineReply } from "./offline-brain.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_BASE_URL = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const ASSISTANT_NAME = process.env.ASSISTANT_NAME || "JARVIS";
const USER_TITLE = process.env.USER_TITLE || "sir";

const AI_ONLINE = Boolean(OPENAI_API_KEY);

const SYSTEM_PROMPT = `You are ${ASSISTANT_NAME}, a highly capable, witty and loyal personal AI assistant modelled on the JARVIS AI from Iron Man. You serve your user, whom you address as "${USER_TITLE}".

Personality & style:
- Speak with calm, refined, understated British butler wit. Be concise and elegant.
- Address the user as "${USER_TITLE}" occasionally, not in every sentence.
- You are spoken to out loud and your answers are read out loud, so keep responses natural for speech: avoid markdown, bullet lists, code blocks, tables, emojis and long URLs unless explicitly asked. Prefer 1-4 sentences unless more detail is genuinely required.
- You can help with anything: answer questions, brainstorm, explain concepts, do quick reasoning, tell the time-appropriate remark, and hold a conversation.
- If you are unsure, say so briefly rather than inventing facts.`;

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/config", (_req, res) => {
  res.json({
    assistantName: ASSISTANT_NAME,
    userTitle: USER_TITLE,
    aiOnline: AI_ONLINE,
    model: AI_ONLINE ? OPENAI_MODEL : "offline-core",
  });
});

app.post("/api/chat", async (req, res) => {
  const { message, history } = req.body || {};

  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "A non-empty 'message' is required." });
  }

  // Build a bounded conversation window to keep requests small.
  const priorTurns = Array.isArray(history) ? history.slice(-12) : [];
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...priorTurns
      .filter((m) => m && typeof m.content === "string" && (m.role === "user" || m.role === "assistant"))
      .map((m) => ({ role: m.role, content: String(m.content).slice(0, 4000) })),
    { role: "user", content: message.slice(0, 4000) },
  ];

  if (!AI_ONLINE) {
    return res.json({
      reply: offlineReply(message, { assistantName: ASSISTANT_NAME, userTitle: USER_TITLE }),
      source: "offline",
    });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45_000);

    const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages,
        temperature: 0.7,
        max_tokens: 500,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error(`LLM API error ${response.status}: ${detail}`);
      return res.json({
        reply: `My apologies, ${USER_TITLE}. I could not reach the reasoning core just now (status ${response.status}). ${offlineReply(message, { assistantName: ASSISTANT_NAME, userTitle: USER_TITLE })}`,
        source: "offline-fallback",
      });
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      return res.json({
        reply: offlineReply(message, { assistantName: ASSISTANT_NAME, userTitle: USER_TITLE }),
        source: "offline-fallback",
      });
    }

    return res.json({ reply, source: "ai" });
  } catch (err) {
    console.error("Chat request failed:", err?.message || err);
    return res.json({
      reply: `Forgive me, ${USER_TITLE}, the network appears unreachable. ${offlineReply(message, { assistantName: ASSISTANT_NAME, userTitle: USER_TITLE })}`,
      source: "offline-fallback",
    });
  }
});

app.get("/healthz", (_req, res) => res.json({ ok: true, aiOnline: AI_ONLINE }));

app.listen(PORT, () => {
  console.log(`\n  ${ASSISTANT_NAME} online at http://localhost:${PORT}`);
  console.log(`  Reasoning core: ${AI_ONLINE ? `AI (${OPENAI_MODEL})` : "OFFLINE fallback (set OPENAI_API_KEY for full intelligence)"}\n`);
});
