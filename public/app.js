/* J.A.R.V.I.S. front-end controller
 * Handles voice input (Web Speech API SpeechRecognition), spoken replies
 * (SpeechSynthesis), the reactor audio visualiser, and chat with the AI core.
 */

const $ = (sel) => document.querySelector(sel);

const state = {
  assistantName: "JARVIS",
  userTitle: localStorage.getItem("jarvis.userTitle") || "sir",
  aiOnline: false,
  history: [],
  listening: false,
  speaking: false,
  thinking: false,
  continuous: false,
  speakReplies: true,
  voice: null,
  rate: parseFloat(localStorage.getItem("jarvis.rate") || "1"),
  pitch: parseFloat(localStorage.getItem("jarvis.pitch") || "0.9"),
  preferredVoiceURI: localStorage.getItem("jarvis.voiceURI") || "",
};

// ── Element refs ────────────────────────────────────────────────
const els = {
  reactor: $("#reactor"),
  micBtn: $("#micBtn"),
  micBtnLabel: $("#micBtnLabel"),
  liveTranscript: $("#liveTranscript"),
  messages: $("#messages"),
  textInput: $("#textInput"),
  inputForm: $("#inputForm"),
  continuousToggle: $("#continuousToggle"),
  voiceToggle: $("#voiceToggle"),
  clock: $("#clock"),
  dateReadout: $("#dateReadout"),
  coreStatus: $("#coreStatus"),
  micState: $("#micState"),
  voiceState: $("#voiceState"),
  modelState: $("#modelState"),
  statusText: $("#statusText"),
  statusDot: $("#statusDot"),
  logStream: $("#logStream"),
  assistantName: $("#assistantName"),
  clearLog: $("#clearLog"),
  // settings
  settingsBtn: $("#settingsBtn"),
  settingsModal: $("#settingsModal"),
  closeSettings: $("#closeSettings"),
  userTitleInput: $("#userTitleInput"),
  voiceSelect: $("#voiceSelect"),
  rateInput: $("#rateInput"),
  pitchInput: $("#pitchInput"),
  rateVal: $("#rateVal"),
  pitchVal: $("#pitchVal"),
  testVoiceBtn: $("#testVoiceBtn"),
  aiNote: $("#aiNote"),
};

// ── Boot log flavour ────────────────────────────────────────────
function log(line) {
  const t = new Date().toLocaleTimeString([], { hour12: false });
  els.logStream.textContent = `[${t}] ${line}\n` + els.logStream.textContent;
  els.logStream.textContent = els.logStream.textContent.split("\n").slice(0, 14).join("\n");
}

function setStatus(text, mode) {
  els.statusText.textContent = text;
  els.statusDot.className = "status-dot" + (mode ? " " + mode : "");
}

// ── Clock ───────────────────────────────────────────────────────
function tickClock() {
  const now = new Date();
  els.clock.textContent = now.toLocaleTimeString([], { hour12: false });
  els.dateReadout.textContent = now.toLocaleDateString([], { day: "2-digit", month: "short" }).toUpperCase();
}
setInterval(tickClock, 1000);
tickClock();

// ── Config from server ──────────────────────────────────────────
async function loadConfig() {
  try {
    const res = await fetch("/api/config");
    const cfg = await res.json();
    state.assistantName = cfg.assistantName || "JARVIS";
    state.aiOnline = !!cfg.aiOnline;
    els.assistantName.textContent = spaced(state.assistantName);
    els.coreStatus.textContent = state.aiOnline ? "ONLINE" : "OFFLINE";
    els.coreStatus.style.color = state.aiOnline ? "var(--cyan)" : "var(--gold)";
    els.modelState.textContent = cfg.model || "—";
    els.aiNote.textContent = state.aiOnline
      ? "Reasoning core online. I can answer virtually anything."
      : "Reasoning core offline. I'll run on my built-in personality core. Add an OPENAI_API_KEY on the server for full intelligence.";
    log(`core ${state.aiOnline ? "online" : "offline"} :: ${cfg.model}`);
  } catch (e) {
    log("config fetch failed");
  }
}
function spaced(name) {
  // "JARVIS" -> "J.A.R.V.I.S." for the header only if it isn't already dotted
  if (name.includes(".")) return name;
  return name.toUpperCase().split("").join(".") + ".";
}

// ── Messages / conversation ─────────────────────────────────────
function addMessage(who, text, opts = {}) {
  const div = document.createElement("div");
  div.className = `msg ${who === "user" ? "user" : "bot"}${opts.thinking ? " thinking" : ""}`;
  const label = who === "user" ? state.userTitle.toUpperCase() : state.assistantName.toUpperCase();
  div.innerHTML = `<span class="who">${label}</span>`;
  div.appendChild(document.createTextNode(text));
  els.messages.appendChild(div);
  els.messages.scrollTop = els.messages.scrollHeight;
  return div;
}

async function ask(message) {
  const text = message.trim();
  if (!text) return;

  addMessage("user", text);
  state.history.push({ role: "user", content: text });
  els.liveTranscript.textContent = "";

  const thinkingEl = addMessage("bot", "processing…", { thinking: true });
  setThinking(true);
  setStatus("Processing request…", "busy");

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, history: state.history.slice(0, -1) }),
    });
    const data = await res.json();
    const reply = data.reply || "I'm afraid I have nothing to say to that.";
    thinkingEl.classList.remove("thinking");
    thinkingEl.innerHTML = `<span class="who">${state.assistantName.toUpperCase()}</span>`;
    thinkingEl.appendChild(document.createTextNode(reply));
    els.messages.scrollTop = els.messages.scrollHeight;
    state.history.push({ role: "assistant", content: reply });
    log(`reply via ${data.source || "ai"}`);
    setThinking(false);
    setStatus("Ready.", state.aiOnline ? "online" : "");
    speak(reply);
  } catch (e) {
    thinkingEl.classList.remove("thinking");
    thinkingEl.textContent = "Connection to core failed, " + state.userTitle + ".";
    setThinking(false);
    setStatus("Connection error.", "");
    log("chat request failed");
  }
}

// ── Text-to-speech (Jarvis voice) ───────────────────────────────
const synth = window.speechSynthesis;
let voices = [];

// Ranked preferences for a refined, British, JARVIS-like male voice.
const VOICE_PREFS = [
  "google uk english male",
  "microsoft ryan online (natural) - english (united kingdom)",
  "microsoft george - english (united kingdom)",
  "daniel", // macOS UK male
  "arthur", // macOS UK
  "microsoft guy online (natural) - english (united states)",
  "google us english",
];

function chooseVoice() {
  if (!voices.length) return null;
  // 1. explicit user choice
  if (state.preferredVoiceURI) {
    const found = voices.find((v) => v.voiceURI === state.preferredVoiceURI);
    if (found) return found;
  }
  // 2. ranked preferences
  for (const pref of VOICE_PREFS) {
    const found = voices.find((v) => v.name.toLowerCase().includes(pref));
    if (found) return found;
  }
  // 3. any English (UK) voice
  const uk = voices.find((v) => /en[-_]GB/i.test(v.lang));
  if (uk) return uk;
  // 4. any English voice
  const en = voices.find((v) => /^en/i.test(v.lang));
  return en || voices[0];
}

function loadVoices() {
  voices = synth ? synth.getVoices() : [];
  state.voice = chooseVoice();
  populateVoiceSelect();
  if (state.voice) {
    els.voiceState.textContent = "READY";
    log(`voice :: ${state.voice.name}`);
  }
}
if (synth) {
  loadVoices();
  synth.onvoiceschanged = loadVoices;
}

function populateVoiceSelect() {
  if (!els.voiceSelect) return;
  els.voiceSelect.innerHTML = "";
  voices.forEach((v) => {
    const opt = document.createElement("option");
    opt.value = v.voiceURI;
    opt.textContent = `${v.name} (${v.lang})`;
    if (state.voice && v.voiceURI === state.voice.voiceURI) opt.selected = true;
    els.voiceSelect.appendChild(opt);
  });
}

function speak(text) {
  if (!state.speakReplies || !synth) return;
  synth.cancel();
  // Strip characters that read poorly aloud.
  const clean = text.replace(/[*_`#>|]/g, "").replace(/\s+/g, " ").trim();
  const utter = new SpeechSynthesisUtterance(clean);
  if (state.voice) utter.voice = state.voice;
  utter.rate = state.rate;
  utter.pitch = state.pitch;
  utter.volume = 1;
  utter.onstart = () => { setSpeaking(true); setStatus("Speaking…", "busy"); };
  utter.onend = () => {
    setSpeaking(false);
    setStatus("Ready.", state.aiOnline ? "online" : "");
    // In continuous mode, resume listening after speaking.
    if (state.continuous && !state.listening) startListening();
  };
  utter.onerror = () => setSpeaking(false);
  synth.speak(utter);
}

// ── Speech recognition (voice input) ────────────────────────────
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let recognitionActive = false;

function initRecognition() {
  if (!SR) {
    els.micBtnLabel.textContent = "NO MIC API";
    els.micState.textContent = "UNSUPPORTED";
    setStatus("Voice input not supported in this browser. Use Chrome or Edge, or type below.", "");
    log("SpeechRecognition unsupported");
    return;
  }
  recognition = new SR();
  recognition.lang = "en-US";
  recognition.interimResults = true;
  recognition.continuous = false;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    recognitionActive = true;
    setListening(true);
    setStatus("Listening…", "busy");
  };
  recognition.onresult = (event) => {
    let interim = "";
    let finalText = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) finalText += transcript;
      else interim += transcript;
    }
    els.liveTranscript.textContent = finalText || interim;
    if (finalText.trim()) {
      const q = finalText.trim();
      stopListening();
      ask(q);
    }
  };
  recognition.onerror = (e) => {
    log(`recognition error :: ${e.error}`);
    if (e.error === "not-allowed" || e.error === "service-not-allowed") {
      setStatus("Microphone permission denied. Enable it to use voice.", "");
      state.continuous = false;
      els.continuousToggle.checked = false;
    }
    setListening(false);
  };
  recognition.onend = () => {
    recognitionActive = false;
    setListening(false);
    // auto-restart in continuous mode unless the assistant is speaking/thinking
    if (state.continuous && !state.speaking && !state.thinking) {
      setTimeout(() => { if (state.continuous) startListening(); }, 400);
    }
  };
  log("speech recognition ready");
}

function startListening() {
  if (!recognition || recognitionActive || state.speaking) return;
  try {
    if (synth) synth.cancel();
    recognition.start();
  } catch (e) { /* start() throws if already started */ }
}
function stopListening() {
  if (recognition && recognitionActive) {
    try { recognition.stop(); } catch (e) {}
  }
}

// ── UI state helpers ────────────────────────────────────────────
function setListening(v) {
  state.listening = v;
  els.reactor.classList.toggle("listening", v);
  els.micBtnLabel.textContent = v ? "LISTENING…" : (state.continuous ? "AUTO LISTEN" : "TAP TO SPEAK");
  els.micState.textContent = v ? "LIVE" : "IDLE";
  els.micState.className = v ? "live" : "";
}
function setSpeaking(v) {
  state.speaking = v;
  els.reactor.classList.toggle("speaking", v);
  els.voiceState.textContent = v ? "SPEAKING" : "READY";
  els.voiceState.className = v ? "on" : "";
}
function setThinking(v) {
  state.thinking = v;
  els.reactor.classList.toggle("thinking", v);
}

// ── Reactor visualiser (mic audio → canvas) ─────────────────────
const canvas = $("#viz");
const ctx = canvas.getContext("2d");
let analyser, dataArray, audioCtx;
let vizPhase = 0;

async function initAudioViz() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const src = audioCtx.createMediaStreamSource(stream);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 128;
    dataArray = new Uint8Array(analyser.frequencyBinCount);
    src.connect(analyser);
    log("audio input linked to visualiser");
  } catch (e) {
    log("mic viz unavailable (permission?)");
  }
}

function drawViz() {
  requestAnimationFrame(drawViz);
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2;
  const baseR = w * 0.24;

  let level = 0;
  if (analyser && (state.listening)) {
    analyser.getByteFrequencyData(dataArray);
    level = dataArray.reduce((a, b) => a + b, 0) / dataArray.length / 255;
  } else if (state.speaking) {
    level = 0.35 + Math.abs(Math.sin(vizPhase * 2)) * 0.3;
  } else {
    level = 0.08 + Math.abs(Math.sin(vizPhase)) * 0.05;
  }
  vizPhase += 0.06;

  const bars = 72;
  const color = state.listening ? "#ff4d5e" : state.speaking ? "#f9c74f" : "#35d6ff";
  ctx.save();
  ctx.translate(cx, cy);
  for (let i = 0; i < bars; i++) {
    const angle = (i / bars) * Math.PI * 2;
    let amp;
    if (analyser && state.listening) {
      amp = (dataArray[i % dataArray.length] / 255) * (w * 0.16);
    } else {
      amp = (Math.sin(i * 0.5 + vizPhase * 3) * 0.5 + 0.5) * level * (w * 0.16);
    }
    const r1 = baseR;
    const r2 = baseR + 6 + amp;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * r1, Math.sin(angle) * r1);
    ctx.lineTo(Math.cos(angle) * r2, Math.sin(angle) * r2);
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.5 + level;
    ctx.lineWidth = 2.5;
    ctx.shadowBlur = 8;
    ctx.shadowColor = color;
    ctx.stroke();
  }
  ctx.restore();
}
drawViz();

// ── Event wiring ────────────────────────────────────────────────
els.micBtn.addEventListener("click", () => {
  if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
  if (state.listening) stopListening();
  else startListening();
});

els.inputForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const val = els.textInput.value;
  els.textInput.value = "";
  ask(val);
});

els.continuousToggle.addEventListener("change", (e) => {
  state.continuous = e.target.checked;
  log(`continuous listen ${state.continuous ? "on" : "off"}`);
  if (state.continuous) startListening();
  else stopListening();
});

els.voiceToggle.addEventListener("change", (e) => {
  state.speakReplies = e.target.checked;
  if (!state.speakReplies && synth) synth.cancel();
});

els.clearLog.addEventListener("click", () => {
  els.messages.innerHTML = "";
  state.history = [];
  log("comms log cleared");
});

// ── Settings modal ──────────────────────────────────────────────
function openSettings() {
  els.userTitleInput.value = state.userTitle;
  els.rateInput.value = state.rate;
  els.pitchInput.value = state.pitch;
  els.rateVal.textContent = state.rate.toFixed(2);
  els.pitchVal.textContent = state.pitch.toFixed(2);
  populateVoiceSelect();
  els.settingsModal.hidden = false;
}
els.settingsBtn.addEventListener("click", openSettings);
els.closeSettings.addEventListener("click", () => { els.settingsModal.hidden = true; });
els.settingsModal.addEventListener("click", (e) => { if (e.target === els.settingsModal) els.settingsModal.hidden = true; });

els.userTitleInput.addEventListener("input", (e) => {
  state.userTitle = e.target.value.trim() || "sir";
  localStorage.setItem("jarvis.userTitle", state.userTitle);
});
els.voiceSelect.addEventListener("change", (e) => {
  state.preferredVoiceURI = e.target.value;
  localStorage.setItem("jarvis.voiceURI", state.preferredVoiceURI);
  state.voice = voices.find((v) => v.voiceURI === state.preferredVoiceURI) || state.voice;
});
els.rateInput.addEventListener("input", (e) => {
  state.rate = parseFloat(e.target.value);
  els.rateVal.textContent = state.rate.toFixed(2);
  localStorage.setItem("jarvis.rate", state.rate);
});
els.pitchInput.addEventListener("input", (e) => {
  state.pitch = parseFloat(e.target.value);
  els.pitchVal.textContent = state.pitch.toFixed(2);
  localStorage.setItem("jarvis.pitch", state.pitch);
});
els.testVoiceBtn.addEventListener("click", () => {
  speak(`Voice systems online. Good to see you, ${state.userTitle}.`);
});

// Keyboard shortcut: space toggles listening (when not typing / no modal open)
document.addEventListener("keydown", (e) => {
  if (e.code !== "Space") return;
  if (document.activeElement === els.textInput) return;
  if (!els.settingsModal.hidden) return;
  e.preventDefault();
  els.micBtn.click();
});

// ── Boot sequence ───────────────────────────────────────────────
async function boot() {
  const bootLines = [
    "initialising kernel…",
    "loading neural net…",
    "calibrating sensors…",
    "arc reactor stable…",
    "voice matrix engaged…",
  ];
  bootLines.forEach((l, i) => setTimeout(() => log(l), i * 220));

  await loadConfig();
  initRecognition();
  initAudioViz();

  setTimeout(() => {
    const greeting = state.aiOnline
      ? `All systems are online, ${state.userTitle}. How may I help you today?`
      : `Systems online, ${state.userTitle}. I'm running on my offline core. Ask me anything, or connect a reasoning key for full intelligence.`;
    addMessage("bot", greeting);
    state.history.push({ role: "assistant", content: greeting });
    setStatus("Ready.", state.aiOnline ? "online" : "");
    speak(greeting);
  }, 1200);
}
boot();
