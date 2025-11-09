// server.js
import "dotenv/config";
import express from "express";
import cors from "cors";
import OpenAI from "openai";
import axios from "axios";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5174;

// --- OpenAI client (optional if you set OPENAI_API_KEY) ---
const hasKey = !!process.env.OPENAI_API_KEY;
const openai = hasKey
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// Utility: score priority
function prioScore(priority = "none") {
  return { high: 3, med: 2, low: 1, none: 0 }[priority] ?? 0;
}
// POST /api/suggest  -> returns {id?, say}
app.post("/api/suggest", async (req, res) => {
  const { tasks = [] } = req.body || {};

  const score = (p = "none") => ({ high:3, med:2, low:1, none:0 }[p] ?? 0);
  const pickFrom = (list) =>
    list
      .slice()
      .sort(
        (a, b) => score(b.priority) - score(a.priority) || a.text.length - b.text.length
      )[0];

  // Candidates include both todo and next-up style columns
  const candidates = tasks.filter(
    (t) => t.col === "todo" || t.col === "next" || t.col === "backlog"
  );

  // If you have an API key, let the model try first.
  if (hasKey && openai) {
    try {
      const system = `You are Kanban Ghost. Pick ONE task ID from the user's list to start now.
Return strict JSON: {"id":"<taskId>","say":"<short encouraging message>"}.
Prefer higher priority; among equals, pick shorter text. If no candidates, return {"say":"You’re all caught up. Nice!"}.`;

      const user = `Tasks JSON: ${JSON.stringify(tasks)}`;

      const resp = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.3,
      });

      let content = resp.choices?.[0]?.message?.content?.trim() || "";
      let parsed = {};
      try { parsed = JSON.parse(content); } catch {}

      const idOkay = candidates.some((t) => t.id === parsed?.id);
      let id = idOkay ? parsed.id : undefined;

      if (!id && candidates.length) id = pickFrom(candidates)?.id;

      if (id) {
        const t = tasks.find((x) => x.id === id);
        return res.json({
          id,
          say: parsed?.say || (t ? `Focus on: ${t.text}` : "Let’s get it."),
        });
      }
      return res.json({ say: "You’re all caught up. Nice!" });
    } catch (e) {
      // fall through to heuristic
    }
  }

  // Heuristic fallback
  if (!candidates.length) return res.json({ say: "You’re all caught up. Nice!" });
  const pick = pickFrom(candidates);
  return res.json({ id: pick?.id, say: pick ? `Focus on: ${pick.text}` : "Let’s get it." });
});


// POST /api/ask -> returns {say}
app.post("/api/ask", async (req, res) => {
  const { text = "" } = req.body || {};
  if (hasKey && openai) {
    try {
      const resp = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a short, kind motivator called Kanban Ghost.",
          },
          {
            role: "user",
            content: `User says: ${text}\nReply in <= 18 words.`,
          },
        ],
        temperature: 0.7,
      });
      const say =
        resp.choices?.[0]?.message?.content?.trim() ||
        "I believe in you. Start with one tiny step.";
      return res.json({ say });
    } catch (e) {
      // fall through
    }
  }
  // Fallback
  return res.json({ say: "I believe in you. Start with one tiny step." });
});

// POST /api/speak -> ElevenLabs TTS proxy
app.post("/api/speak", async (req, res) => {
  const { text } = req.body;

  try {
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVEN_VOICE_ID}`,
      {
        text,
        model_id: "eleven_multilingual_v2",
      },
      {
        headers: {
          "xi-api-key": process.env.ELEVEN_API_KEY,
          "Content-Type": "application/json",
        },
        responseType: "arraybuffer",
      }
    );

    res.set({
      "Content-Type": "audio/mpeg",
    });

    return res.send(response.data);
  } catch (err) {
    console.error("TTS FAILED:", err.response?.data || err);
    res.status(500).json({ error: "TTS failed" });
  }
});

app.listen(PORT, () => {
  console.log(`Kanban Ghost server on http://localhost:${PORT}`);
});
