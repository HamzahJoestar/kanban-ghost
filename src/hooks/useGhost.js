// src/hooks/useGhost.js - FIXED VERSION
import { useState } from "react";
import { ghostAskAPI, ghostSpeakAPI, ghostSuggestAPI } from "../lib/api";

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

  // Short intents → treat as question unless it's obvious chit-chat
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

function formatSay(input = "") {
  if (!input) return "";

  // normalize whitespace
  let s = input
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();

  // If it already looks like "1) ..." steps, ensure each is on its own line
  if (/\b1\)\s/.test(s)) {
    s = s
      // split on n) markers while keeping them
      .split(/(?=\b\d+\)\s)/g)
      .map((part) => part.trim())
      .filter(Boolean)
      .join("\n");
    return s;
  }

  // If it has bullets like "-" or "•", line them up
  if (/[•\-—]\s/.test(s)) {
    s = s
      .split(/(?= [•\-—]\s)|\n/g)
      .map((x) => x.trim())
      .filter(Boolean)
      .join("\n");
    return s;
  }

  // Fallback: split into short steps by sentences
  const sentences = s
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])/g)
    .map((x) => x.trim())
    .filter(Boolean);

  if (sentences.length > 1) {
    // number them
    return sentences.map((line, i) => `${i + 1}) ${line}`).join("\n");
  }

  return s;
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
      const pretty = formatSay(text);
      setGhostSpeaking(true);
      setGhostCaption(pretty);

      try {
        const audioBuffer = await ghostSpeakAPI(text);
        const blob = new Blob([audioBuffer], { type: "audio/mpeg" });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);

        audio.onerror = () => {
          // Fallback to web speech if audio fails
          console.warn("Audio playback failed, using web speech");
          const u = new SpeechSynthesisUtterance(pretty);
          u.onend = () => {
            setGhostSpeaking(false);
            resolve();
          };
          window.speechSynthesis.speak(u);
        };

        audio.onended = () => {
          setGhostSpeaking(false);
          resolve();
        };

        await audio.play();
      } catch (err) {
        console.error("TTS error:", err);
        // Always fall back to web speech
        const u = new SpeechSynthesisUtterance(text);
        u.onend = () => {
          setGhostSpeaking(false);
          resolve();
        };
        window.speechSynthesis.speak(u);
      }
    });
  }

  // Helper function to get board state for API calls
  function getBoardState() {
    return {
      backlogCount: tasks.filter((t) => t.col === "backlog").length,
      doingCount: tasks.filter((t) => t.col === "doing").length,
      reviewCount: tasks.filter((t) => t.col === "review").length,
      doneCount: tasks.filter((t) => t.col === "done").length,
      doneToday: tasks.filter(
        (t) =>
          t.col === "done" &&
          new Date(t.completedAt || 0).toDateString() ===
            new Date().toDateString()
      ).length,
    };
  }

  async function ghostSuggest() {
    setGhostThinking(true);

    const score = (p = "none") =>
      ({ high: 3, med: 2, low: 1, none: 0 }[p] ?? 0);

    const todos = tasks.filter((t) => t.col === "backlog");
    const active =
      tasks.find((t) => t.id === activeId) ||
      tasks.find((t) => t.col === "doing");

    const boardState = getBoardState();

    // ✅ 1. If there's an active task
    if (active) {
      try {
        // Call the improved API with board context
        const response = await ghostAskAPI(active.text, boardState);
        const say = response?.say || "Let's tackle this step by step!";

        setGhostTopic(active.text);
        await speak(say);
      } catch (err) {
        console.error("Ghost API failed:", err);
        await speak("Let's focus on this task together!");
      }
      setGhostThinking(false);
      return;
    }

    // ✅ 2. If no active task, pick best TODO task
    if (todos.length > 0) {
      const pick = todos
        .slice()
        .sort(
          (a, b) =>
            score(b.priority) - score(a.priority) ||
            a.text.length - b.text.length
        )[0];

      setActive(pick.id);

      try {
        // Call the improved API with board context
        const response = await ghostAskAPI(pick.text, boardState);
        const say = response?.say || "Let's get started on this!";

        setGhostTopic(pick.text);
        await speak(say);
      } catch (err) {
        console.error("Ghost API failed:", err);
        await speak("Let's tackle this task together!");
      }
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
        setGhostTopic(ai.id);
        await speak(aiLine || "Let's work on this next!");
      } else {
        setGhostTopic("—");
        await speak(aiLine || "You're all caught up! Great work! 🎉");
      }
    } catch (err) {
      console.error("Ghost suggest failed:", err);
      setGhostTopic("—");
      await speak("You're all caught up! Nice work!");
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
