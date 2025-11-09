// src/hooks/useGhost.js
import { useState } from "react";
import { ghostSuggestAPI } from "../lib/api";

function planFor(text = "") {
  const t = text.toLowerCase().trim();

  // Extract leading verb and the rest as a lightweight "object"
  const m = t.match(/^(\w+)\s+(.*)$/); // e.g., "make lemonade"
  const verb = m?.[1] ?? "";
  const obj = (m?.[2] ?? "").trim();

  // 0) Verb → concrete micro-actions (fast path)
  const verbMap = {
    start: [
      `Open the place you'll work on: ${obj || "the task context"}.`,
      "Create a scratch note/todo for this task.",
      "Do the first visible action and save/progress.",
    ],
    setup: [
      "Open the repo/app where you’ll set this up.",
      `Create/verify the config/file for “${obj || text}”.`,
      "Run once to confirm it boots without errors.",
    ],
    plan: [
      `Open a note titled "Plan: ${obj || "Task"}".`,
      "List 3 bullets: Goal • First step • Blockers.",
      "Turn the first bullet into a 10-minute action.",
    ],
    research: [
      `Open one authoritative source on ${obj || "the topic"}.`,
      "Capture 3 key facts in your notes.",
      "Write one follow-up question to investigate.",
    ],
    read: [
      `Open the document/source${obj ? ` for “${obj}”` : ""}.`,
      "Skim headings and write a 2-line summary.",
      "Flag one section to read deeply next.",
    ],
    find: [
      `Search for “${obj || text}” in a new tab.`,
      "Open only the first relevant result.",
      "Write 1 next step you can execute now.",
    ],
    write: [
      "Make a 3-bullet outline.",
      "Draft the first paragraph without editing.",
      "Stop and note the next paragraph’s topic.",
    ],
    fix: [
      "Reproduce the error and copy its message.",
      "Add a log/print right before the failure.",
      "Change one line, re-run, and compare output.",
    ],
    code: [
      "Reproduce the issue (copy the exact error/output).",
      "Add a micro-test or log right before the failure.",
      "Change ONE thing, re-run, and note the delta.",
    ],
  };
  if (verbMap[verb]) return verbMap[verb];

  // 1) Task-specific buckets
  // --- food / drink / recipes ---
  if (
    /\b(make|cook|brew|bake|prepare|mix)\b/.test(t) ||
    /\b(recipe|lemonade|sandwich|coffee|tea|smoothie|meal|drink)\b/.test(t)
  ) {
    return [
      `Gather basics for “${text}” (ingredients + tools).`,
      `Do step 1: ${obj || "prep ingredients"} (wash/slice/measure).`,
      "Combine core parts, taste once, adjust one thing (sweet/sour/salt).",
    ];
  }

  // --- search / research ---
  if (/\b(find|search|research|look up)\b/.test(t)) {
    return [
      `Open a new tab and search: “${text}”.`,
      "Skim only the top 3 results; no scrolling.",
      "Write 1 concrete next action in your notes.",
    ];
  }

  // --- writing ---
  if (/\b(write|draft|essay|email|message|post)\b/.test(t)) {
    return [
      "Make a 3-bullet outline (Intro • Body • Close).",
      "Write one ugly paragraph without editing.",
      "Do a 5-minute cleanup pass and stop.",
    ];
  }

  // --- coding / debugging ---
  if (/\b(code|bug|debug|fix|implement|refactor|test)\b/.test(t)) {
    return [
      "Reproduce the issue (copy the exact error/output).",
      "Add a micro-test or log right before the failure.",
      "Change ONE thing, re-run, and note the delta.",
    ];
  }

  // --- studying ---
  if (
    /\b(study|studying|read|reading|review|reviewing|revise|revising|notes?|flashcards?|anki|practice|practicing|prep|learn|learning|hw|homework|chapter|chapters|lecture|lectures|quiz|quizzes|midterm|final)\b/.test(
      t
    )
  ) {
    return [
      "Set a 25-minute timer (Pomodoro).",
      "Skim once, then write a 3-line summary from memory.",
      "Create 3 recall Qs (or 5 flashcards) and mark what to revisit.",
    ];
  }

  // --- product/design ---
  if (/\b(design|ui|mock|sketch|figma|wireframe)\b/.test(t)) {
    return [
      "List 3 constraints (screen • user • goal).",
      "Sketch 2 tiny variations in 5 minutes.",
      "Pick one and label the primary action.",
    ];
  }

  // 2) Short/vague fallback — only for art/design-ish phrases
  const looksArtRef =
    /\b(reference|pose|concept|style|inspiration|moodboard)\b/.test(t) ||
    /\b(draw|sketch|paint|illustrate|character|logo)\b/.test(t);
  if (t.split(" ").length <= 3 && looksArtRef) {
    return [
      `Search images for “${text} reference”.`,
      "Pick ONE image that fits—don’t scroll forever.",
      "Save it + write a 1-sentence note about why.",
    ];
  }

  // 3) Generic fallback
  return [
    `Break “${text}” into 3 sub-steps in a bullet list.`,
    "Do the first bullet without overthinking it.",
    "Update the list after doing that one step.",
  ];
}



function linesToSpeech(taskText, steps) {
  const numbered = steps.map((s, i) => `${i + 1}) ${s}`).join("\n"); 
  return `Focus on: ${taskText}.\nThen:\n${numbered}`;
}

function isQuestion(text = "") {
  const raw = text.trim().toLowerCase();
  if (!raw) return false;

  if (raw.endsWith("?")) return true;

  if (
    /^(how|what|why|who|when|where|which|can|should|could|would|best|tips|help|advice)\b/.test(
      raw
    )
  ) {
    return true;
  }

  if (/\b(how do|how to|what is|why is|best way|tips for)\b/.test(raw)) {
    return true;
  }

  // NEW: short intents → treat as question unless it's obvious chit-chat
  const words = raw.split(/\s+/);
  if (words.length <= 3) {
    const stoplist = new Set([
      "yo",
      "hi",
      "hello",
      "ok",
      "okay",
      "thanks",
      "thank",
      "lol",
      "lmao",
      "bruh",
      "bro",
    ]);
    if (!stoplist.has(raw)) return true;
  }

  return false;
}



export function useGhost({ tasks, activeId, setActive }) {
  const [ghostPos, setGhostPos] = useState(null);
  const [ghostGrab, setGhostGrab] = useState(null);
  const [ghostThinking, setGhostThinking] = useState(false);
  const [ghostCaption, setGhostCaption] = useState("");
  const [ghostSpeaking, setGhostSpeaking] = useState(false);
  const [ghostTopic, setGhostTopic] = useState(""); // short label for deaf-access panel

  const [dragging, setDragging] = useState(false);

async function speak(text) {
  return new Promise(async (resolve) => {
    setGhostSpeaking(true);
    setGhostCaption(text);

    try {
      const r = await fetch("http://localhost:5174/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const audio = await r.arrayBuffer();
      const blob = new Blob([audio], { type: "audio/mpeg" });
      const url = URL.createObjectURL(blob);
      const a = new Audio(url);

      a.onended = () => {
        setGhostSpeaking(false);
        resolve(); // <-- THIS is what allows await speak() to wait
      };

      a.play();
    } catch {
      const u = new SpeechSynthesisUtterance(text);
      u.onend = () => {
        setGhostSpeaking(false);
        resolve(); // <-- Wait for web speech end too
      };
      window.speechSynthesis.speak(u);
    }
  });
}


  // Helper: set topic (short) then narrate (long)
  async function narrate(topic, steps) {
    setGhostTopic(topic || "your next task");
    await speak(linesToSpeech(topic, steps));
  }

async function ghostSuggest() {
  setGhostThinking(true);

  const score = (p = "none") => ({ high: 3, med: 2, low: 1, none: 0 }[p] ?? 0);

const todos = tasks.filter((t) => t.col === "backlog");
  const active =
    tasks.find((t) => t.id === activeId) ||
    tasks.find((t) => t.col === "doing");

  // ✅ 1. If there's an active task
  if (active) {
    // If it looks like a question → ask API
    if (isQuestion(active.text)) {
      try {
        const r = await fetch("http://localhost:5174/api/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: active.text }),
        });
        const { say } = await r.json();
        setGhostTopic(active.text);
        await speak(say || "Try one small actionable idea first.");
      } catch {
        await speak("Try one small actionable idea first.");
      }
      setGhostThinking(false);
      return;
    }

    // Otherwise → planFor fallback
    const steps = planFor(active.text);
    await narrate(active.text, steps);
    setGhostThinking(false);
    return;
  }

  // ✅ 2. If no active task, pick best TODO task
  if (todos.length > 0) {
    const pick = todos
      .slice()
      .sort(
        (a, b) =>
          score(b.priority) - score(a.priority) || a.text.length - b.text.length
      )[0];

    setActive(pick.id);

    // If it's a question → ask API
    if (isQuestion(pick.text)) {
      try {
        const r = await fetch("http://localhost:5174/api/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: pick.text }),
        });
        const { say } = await r.json();
        setGhostTopic(pick.text);
        await speak(say || "Start with one practical improvement.");
      } catch {
        await speak("Start with one practical improvement.");
      }
      setGhostThinking(false);
      return;
    }

    // Otherwise → structured micro steps
    const steps = planFor(pick.text);
    await narrate(pick.text, steps);
    setGhostThinking(false);
    return;
  }

  // ✅ 3. If absolutely no tasks → fallback to ghostSuggestAPI
  try {
    const ai = await ghostSuggestAPI(tasks);
    if (ai?.id) setActive(ai.id);

    const aiLine = (ai?.say || "").trim();
    const caughtUpRe =
      /\b(caught up|all (tasks )?(complete(d)?|done)|all done|all completed|no tasks|nothing to do|no pending|board is empty)\b/i;

    if (ai?.id && !caughtUpRe.test(aiLine)) {
      const picked = tasks.find((t) => t.id === ai.id) || {
        text: aiLine || "your next task",
      };
      const steps = planFor(picked.text);
      await narrate(picked.text, steps);
    } else {
      setGhostTopic("—");
      await speak("You're all caught up. Nice!");
    }
  } catch {
    setGhostTopic("—");
    await speak("You're all caught up. Nice!");
  } finally {
    setGhostThinking(false);
  }
}


  return {
    ghostPos,
    setGhostPos,
    ghostGrab,
    setGhostGrab,
    ghostThinking,
    setGhostThinking,
    ghostSpeaking,
    ghostTopic,
    setGhostTopic,
    ghostCaption,  
    dragging,
    setDragging,
    speak,
    ghostSuggest,
  };
}