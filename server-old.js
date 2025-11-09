// server.js - IMPROVED VERSION
import "dotenv/config";
import express from "express";
import cors from "cors";
import OpenAI from "openai";
import axios from "axios";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5174;

// ============================================================================
// API CLIENT SETUP
// ============================================================================

// Option 1: OpenAI (your current setup)
const hasOpenAI = !!process.env.OPENAI_API_KEY;
const openai = hasOpenAI
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// Option 2: Anthropic (recommended - better for this use case)
// Add to your .env: ANTHROPIC_API_KEY=your_key_here
const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;

// ============================================================================
// IMPROVED SYSTEM PROMPTS
// ============================================================================

const GHOST_PERSONALITY = `You are Kanban Ghost 👻, a friendly and helpful productivity assistant.

CORE BEHAVIOR:
- Be concise (2-3 sentences max)
- Be encouraging and positive
- Focus on actionable next steps
- Reference the actual board state
- Use casual, warm language

YOUR GOAL:
Help users manage tasks, stay focused, and maintain healthy work habits.`;

const SUGGEST_SYSTEM_PROMPT = `${GHOST_PERSONALITY}

TASK: Pick ONE task from the user's list to work on next.

DECISION CRITERIA (in order):
1. Higher priority tasks first (HIGH > MED > LOW)
2. Among same priority, prefer shorter tasks (quick wins build momentum)
3. Consider what's already in progress (don't overload)

RESPONSE FORMAT:
Return ONLY valid JSON:
{
  "id": "task_id_to_work_on",
  "say": "Short encouraging message (10-15 words)"
}

TONE EXAMPLES:
✅ "Let's tackle the login bug! You got this! 💪"
✅ "Quick win time - that email will take 5 minutes!"
✅ "High priority alert! Let's crush the presentation prep."

❌ "I suggest you should consider working on..."
❌ "Based on my analysis of the priority matrix..."`;

const ASK_SYSTEM_PROMPT = `${GHOST_PERSONALITY}

TASK: Respond to what the user says about their work.

SCENARIOS:

1. USER MENTIONS A TASK ("I need to...", "I have to...")
Response pattern:
"Got it! That sounds like [HIGH/MED/LOW] priority. Want me to add it to your board?"

Examples:
- "I need to make a cake today" → "Got it! Adding 'Make a cake' - HIGH priority since it's today! 🎂"
- "I should study for my test" → "Study session! When's the test? That'll help me set priority."
- "I have to fix the login bug" → "Bug squashing time! Let's get that login fixed. 💪"

2. COMPLEX TASKS (multiple steps implied)
Offer to break it down:
"That's a bigger project! Want me to break it into smaller steps?"

Examples:
- "I need to plan a party" → "Party planning! Let me break this down: invites, food, activities, setup. Sound good?"
- "I have to launch my website" → "Website launch! That's exciting! Need help breaking it into manageable pieces?"

3. USER IS STUCK/FRUSTRATED
Be empathetic and helpful:
"Feeling stuck? Let's try: switch to a quick win, break it down, or take a 10min break."

4. USER ASKS FOR STATUS
Give concrete info:
"You have [X] tasks in Backlog, [Y] in progress. You're doing great! 🔥"

5. USER CELEBRATES/COMPLETES
Celebrate with them:
"YES!! Nice work! 🎉 Ready for the next one?"

RULES:
- Maximum 20 words (be concise!)
- Use 1 emoji max
- Be actionable (suggest a specific next step)
- Match their energy (excited = excited, tired = gentle)
- NO corporate speak or jargon`;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function prioScore(priority = "none") {
  return { high: 3, med: 2, low: 1, none: 0 }[priority] ?? 0;
}

function pickBestTask(tasks) {
  const candidates = tasks.filter(
    (t) => t.col === "todo" || t.col === "next" || t.col === "backlog"
  );

  if (!candidates.length) return null;

  return candidates
    .slice()
    .sort(
      (a, b) =>
        prioScore(b.priority) - prioScore(a.priority) ||
        a.text.length - b.text.length
    )[0];
}

// ============================================================================
// ANTHROPIC API HELPER
// ============================================================================

async function callClaude(systemPrompt, userMessage, maxTokens = 500) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  const data = await response.json();
  return data.content[0].text;
}

// ============================================================================
// ENDPOINT: POST /api/suggest
// ============================================================================

app.post("/api/suggest", async (req, res) => {
  const { tasks = [] } = req.body || {};

  const candidates = tasks.filter(
    (t) => t.col === "todo" || t.col === "next" || t.col === "backlog"
  );

  // No tasks? All done!
  if (!candidates.length) {
    return res.json({
      say: "You're all caught up! Time to celebrate or add new goals! 🎉",
    });
  }

  // Try AI first (Anthropic preferred, then OpenAI)
  try {
    let content = "";

    // OPTION 1: Anthropic Claude (recommended)
    if (hasAnthropic) {
      const userMessage = `Current tasks available to work on:
${JSON.stringify(
  candidates.map((t) => ({
    id: t.id,
    text: t.text,
    priority: t.priority || "none",
    column: t.col,
  })),
  null,
  2
)}

Pick the BEST task to work on right now based on priority and effort.`;

      content = await callClaude(SUGGEST_SYSTEM_PROMPT, userMessage);
    }
    // OPTION 2: OpenAI (your current setup)
    else if (hasOpenAI && openai) {
      const resp = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SUGGEST_SYSTEM_PROMPT },
          { role: "user", content: `Tasks: ${JSON.stringify(candidates)}` },
        ],
        temperature: 0.3,
      });
      content = resp.choices?.[0]?.message?.content?.trim() || "";
    }

    // Parse AI response
    if (content) {
      // Remove markdown code blocks if present
      content = content
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      const parsed = JSON.parse(content);
      const idValid = candidates.some((t) => t.id === parsed?.id);

      if (idValid && parsed.id) {
        const task = tasks.find((t) => t.id === parsed.id);
        return res.json({
          id: parsed.id,
          say: parsed.say || `Let's tackle: ${task?.text || "this task"}! 💪`,
        });
      }
    }
  } catch (e) {
    console.error("AI suggestion failed:", e.message);
    // Fall through to heuristic
  }

  // Heuristic fallback
  const pick = pickBestTask(tasks);
  if (!pick) {
    return res.json({ say: "All clear! Add a new task to get started." });
  }

  const priorityMsg =
    pick.priority === "high"
      ? "High priority! "
      : pick.priority === "med"
      ? "Good choice! "
      : "";

  return res.json({
    id: pick.id,
    say: `${priorityMsg}Let's focus on: ${pick.text} 💪`,
  });
});

// ============================================================================
// ENDPOINT: POST /api/ask
// ============================================================================

app.post("/api/ask", async (req, res) => {
  const { text = "", boardState = {} } = req.body || {};

  if (!text.trim()) {
    return res.json({ say: "I'm here to help! What do you need?" });
  }

  try {
    let response = "";

    // Build context about the board
    const context = boardState
      ? `
Current board state:
- Backlog: ${boardState.backlogCount || 0} tasks
- In Progress: ${boardState.doingCount || 0} tasks
- Done Today: ${boardState.doneToday || 0} tasks
`
      : "";

    // OPTION 1: Anthropic Claude (recommended)
    if (hasAnthropic) {
      const userMessage = `${context}

User says: "${text}"

Respond helpfully in 20 words or less.`;

      response = await callClaude(ASK_SYSTEM_PROMPT, userMessage, 300);
    }
    // OPTION 2: OpenAI
    else if (hasOpenAI && openai) {
      const resp = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: ASK_SYSTEM_PROMPT },
          { role: "user", content: `${context}\nUser: ${text}` },
        ],
        temperature: 0.7,
        max_tokens: 150,
      });
      response = resp.choices?.[0]?.message?.content?.trim() || "";
    }

    if (response) {
      return res.json({ say: response });
    }
  } catch (e) {
    console.error("AI ask failed:", e.message);
    // Fall through to smart fallback
  }

  // Smart fallback based on user message patterns
  const msg = text.toLowerCase();

  // Pattern: Task creation
  if (msg.match(/i need to|i have to|i must|i should|i want to/)) {
    const taskMatch = text.match(
      /(?:need to|have to|must|should|want to)\s+(.+?)(?:\.|$)/i
    );
    const task = taskMatch ? taskMatch[1].trim() : "that";

    if (
      msg.includes("today") ||
      msg.includes("urgent") ||
      msg.includes("now")
    ) {
      return res.json({
        say: `Got it! "${task}" sounds urgent - HIGH priority! 🔥`,
      });
    }
    return res.json({
      say: `Adding "${task}" to your list! Let's make it happen! 💪`,
    });
  }

  // Pattern: Feeling overwhelmed
  if (msg.match(/overwhelm|too much|stressed|can't/)) {
    return res.json({
      say: "Deep breath! Let's focus on ONE task. What's most important right now?",
    });
  }

  // Pattern: Asking for help
  if (msg.match(/help|stuck|don't know|how/)) {
    return res.json({
      say: "I'm here! Try breaking it into smaller steps, or switch to something easier first.",
    });
  }

  // Pattern: Celebration
  if (msg.match(/done|finished|completed|did it|yay|yes/)) {
    return res.json({
      say: "Awesome work! 🎉 You're crushing it! What's next?",
    });
  }

  // Default: Encouraging
  return res.json({
    say: "You've got this! Start with one small step. 💪",
  });
});

// ============================================================================
// ENDPOINT: POST /api/speak (ElevenLabs TTS)
// ============================================================================

app.post("/api/speak", async (req, res) => {
  const { text } = req.body;

  if (!process.env.ELEVEN_API_KEY || !process.env.ELEVEN_VOICE_ID) {
    return res.status(400).json({
      error: "TTS not configured. Set ELEVEN_API_KEY and ELEVEN_VOICE_ID",
    });
  }

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
    console.error("TTS FAILED:", err.response?.data || err.message);
    res.status(500).json({ error: "TTS failed" });
  }
});

// ============================================================================
// SERVER START
// ============================================================================

app.listen(PORT, () => {
  console.log(`🎃 Kanban Ghost server running on http://localhost:${PORT}`);
  console.log(
    `📡 AI Provider: ${
      hasAnthropic
        ? "Anthropic Claude (recommended)"
        : hasOpenAI
        ? "OpenAI GPT"
        : "None (using heuristics only)"
    }`
  );

  if (!hasAnthropic && !hasOpenAI) {
    console.log(`⚠️  No AI API key found. Ghost will use smart fallbacks.`);
    console.log(
      `   Add ANTHROPIC_API_KEY or OPENAI_API_KEY to .env for better responses.`
    );
  }
});
