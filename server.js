// DuksiText generic chatbot backend
// Express server that exposes /api/chat for three different bots:
// - Duksi
// - Micic
// - Skad
//
// Frontend calls this at http://localhost:3000/api/chat (see script.js).
// This backend is "bring your own model": you can either:
//   - Plug in an external chat API via MODEL_API_URL, or
//   - Use the built-in simple rule-based replies (no external services).

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

// ---- Config ----
const PORT = process.env.PORT || 3000;
const MODEL_API_URL = process.env.MODEL_API_URL || ""; // optional external chat API endpoint

// Per-bot configuration: you can tweak personality / instructions here.
const BOT_CONFIG = {
  Duksi: {
    systemInstruction:
      "You are Duksi, a concise, friendly assistant. " +
      "Keep answers short, practical, and helpful. " +
      "You are chatting in an app called DuksiText.",
  },
  Micic: {
    systemInstruction:
      "You are Micic, a more detailed, analytical assistant. " +
      "Explain your reasoning clearly and provide step-by-step guidance when appropriate.",
  },
  Skad: {
    systemInstruction:
      "You are Skad, a creative brainstorm partner. " +
      "Offer imaginative ideas, multiple options, and alternative angles.",
  },
};

// Simple local reply generator (no external API).
// You can replace this with calls to Rasa, Botpress, etc. while keeping the same interface.
function generateLocalReply(botName, message, history) {
  const lower = message.toLowerCase();
  const lastUser = history
    .filter((h) => h.role === "user")
    .slice(-1)
    .map((h) => h.content)[0];

  if (lower.includes("hello") || lower.includes("hi")) {
    return `Hi from ${botName}! How can I help you today?`;
  }
  if (lower.includes("help")) {
    return `${botName} here. Tell me a bit more about what you need help with.`;
  }

  switch (botName) {
    case "Duksi":
      return `Duksi: ${message.length > 160 ? "Let me summarize that." : "Got it."} ` +
        "I prefer short, direct answers, so here’s my take: " +
        (message.length > 0 ? `you said "${message.slice(0, 120)}"...` : "ask me anything.");
    case "Micic":
      return "Micic: I'll walk you through this step by step. " +
        "First, clarify your goal, then list any constraints you have. " +
        (lastUser ? `From what you said last: "${lastUser.slice(0, 80)}"...` : "");
    case "Skad":
      return "Skad: here are a few ideas for you:\n" +
        "1) Try a simple approach first.\n" +
        "2) Experiment with a slightly crazy alternative.\n" +
        "3) Combine pieces from both and see what happens.";
    default:
      return `I'm ${botName}. I heard: "${message.slice(0, 160)}". Tell me more.`;
  }
}

async function callExternalModel(botName, message, history) {
  if (!MODEL_API_URL) return null;
  try {
    const resp = await fetch(MODEL_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bot: botName, message, history }),
    });
    if (!resp.ok) {
      const text = await resp.text();
      console.error("External model API error:", resp.status, text);
      return null;
    }
    const data = await resp.json();
    if (data && typeof data.reply === "string") {
      return data.reply;
    }
    return null;
  } catch (err) {
    console.error("Error calling external model API:", err);
    return null;
  }
}

// ---- Server setup ----
const app = express();
app.use(cors());
app.use(express.json());

// Serve static files (HTML, CSS, JS) from the current directory
app.use(express.static(__dirname));

// Health check
app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// Chat endpoint used by the frontend
app.post("/api/chat", async (req, res) => {
  try {
    const { contact, message, history = [] } = req.body || {};

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        error: "bad_request",
        details: "Field 'message' is required and must be a string.",
      });
    }

    const botName = contact && BOT_CONFIG[contact] ? contact : "Duksi";

    // Normalize history from frontend [{ role, content }] to pass to external or local.
    const normalizedHistory = Array.isArray(history)
      ? history
          .filter(
            (h) =>
              h &&
              (h.role === "user" || h.role === "assistant") &&
              typeof h.content === "string"
          )
          .map((h) => ({ role: h.role, content: h.content }))
      : [];

    // Try external model first if configured, otherwise fall back to local rules.
    let replyText = await callExternalModel(botName, message, normalizedHistory);
    if (!replyText) {
      replyText = generateLocalReply(botName, message, normalizedHistory);
    }

    res.json({ reply: replyText, bot: botName });
  } catch (err) {
    console.error("Chat handler error:", err);

    res.status(500).json({
      error: "chat_error",
      details: err.message || String(err),
    });
  }
});

app.listen(PORT, () => {
  console.log(
    `DuksiText chat backend listening on http://localhost:${PORT} (MODEL_API_URL=${MODEL_API_URL || "none"})`
  );
});
