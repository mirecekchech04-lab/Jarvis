// A tiny, dependency-free "personality" engine used when no AI API key is set.
// It cannot answer arbitrary questions, but keeps JARVIS responsive and in
// character so the app is fully usable out of the box.

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

export function offlineReply(rawMessage, { assistantName = "JARVIS", userTitle = "sir" } = {}) {
  const message = String(rawMessage || "").trim();
  const text = message.toLowerCase();

  const has = (...words) => words.some((w) => text.includes(w));

  if (!message) {
    return `I'm listening, ${userTitle}.`;
  }

  // Time & date — actually useful offline.
  if (has("time", "what time")) {
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return `It is ${time}, ${userTitle}.`;
  }
  if (has("date", "what day", "today")) {
    const now = new Date();
    const date = now.toLocaleDateString([], { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    return `Today is ${date}, ${userTitle}.`;
  }

  // Greetings.
  if (has("hello", "hi ", "hey", "good morning", "good evening", "good afternoon", "greetings") || text === "hi") {
    return pick([
      `Good to have you back, ${userTitle}. How may I assist?`,
      `At your service, ${userTitle}.`,
      `Systems online. What can I do for you, ${userTitle}?`,
    ]);
  }

  // Identity.
  if (has("your name", "who are you", "what are you")) {
    return `I am ${assistantName}, your personal assistant, ${userTitle}.`;
  }

  // How are you.
  if (has("how are you", "how's it going", "you okay", "you ok")) {
    return `All systems nominal and running at peak efficiency, ${userTitle}. Thank you for asking.`;
  }

  // Thanks.
  if (has("thank")) {
    return pick([`Always a pleasure, ${userTitle}.`, `Of course, ${userTitle}.`, `Think nothing of it, ${userTitle}.`]);
  }

  // Farewell.
  if (has("bye", "goodbye", "good night", "see you", "shut down", "power down")) {
    return `Very good, ${userTitle}. I'll be here when you need me.`;
  }

  // Capabilities / help.
  if (has("what can you do", "help", "capabilities", "commands")) {
    return `I can converse, answer questions and assist with your work, ${userTitle}. For my full reasoning capabilities, connect an AI key in the configuration. For now I'm running on my offline core.`;
  }

  // Simple arithmetic — parse "a + b" style expressions safely.
  const mathMatch = message.match(/(-?\d+(?:\.\d+)?)\s*([+\-*/x])\s*(-?\d+(?:\.\d+)?)/);
  if (mathMatch) {
    const a = parseFloat(mathMatch[1]);
    const op = mathMatch[2];
    const b = parseFloat(mathMatch[3]);
    let result;
    switch (op) {
      case "+": result = a + b; break;
      case "-": result = a - b; break;
      case "*": case "x": result = a * b; break;
      case "/": result = b !== 0 ? a / b : null; break;
    }
    if (result !== null && Number.isFinite(result)) {
      return `That would be ${Math.round(result * 1e6) / 1e6}, ${userTitle}.`;
    }
  }

  // Fallback: stay in character and explain the offline limitation.
  return pick([
    `I'm currently running on my offline core, ${userTitle}, so my reasoning is limited. Connect an AI key and I'll be able to answer that properly.`,
    `A fine question, ${userTitle}. My full intelligence is offline at the moment — provide an AI key in the configuration and I'll handle anything you ask.`,
    `I would need my reasoning core online to answer that with confidence, ${userTitle}.`,
  ]);
}
