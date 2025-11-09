// src/hooks/useKanbanState.js
import { useEffect, useMemo, useState } from "react";
import { autoPriority } from "../utils/priority";


export function useKanbanState() {
  const [tasks, setTasks] = useState(() => {
    const saved = localStorage.getItem("kg_tasks");
    const seed = saved
      ? JSON.parse(saved)
      : [
          {
            id: "t1",
            text: "Set up project",
            col: "backlog",
            priority: "none",
          },
          { id: "t2", text: "Design ghost UI", col: "doing", priority: "med" },
          { id: "t3", text: "Win Hackathon 😈", col: "done", priority: "high" },
        ];

    // 🔧 migrate any old records "todo" -> "backlog"
    return seed.map((t) => (t.col === "todo" ? { ...t, col: "backlog" } : t));
  });

  const [activeId, setActiveId] = useState(null);
  const [newTask, setNewTask] = useState("");
  const [studyMode, setStudyMode] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const [dragId, setDragId] = useState(null);

  useEffect(() => {
    localStorage.setItem("kg_tasks", JSON.stringify(tasks));
  }, [tasks]);

  const columns = useMemo(
    () => [
      { id: "backlog", name: "Backlog" }, // unlimited
      { id: "doing", name: "Doing", wip: 2 }, // ≤2
      { id: "review", name: "Review", wip: 2 }, // ≤2
      { id: "done", name: "Done" }, // unlimited
    ],
    []
  );

  const focusTask =
    tasks.find((t) => t.id === activeId) ||
    tasks.find((t) => t.col === "doing");
function setActive(taskId) {
  setTasks((prev) =>
    prev.map((t) => {
      if (t.id === taskId) {
        return { ...t, col: "doing" }; // promote chosen task
      }
      if (t.col === "doing") {
        return { ...t, col: "backlog" }; // demote any previously doing
      }
      return t;
    })
  );
  setActiveId(taskId);
}
  // Heuristic priority inference: returns "high" | "med" | "low" | "none"
  function inferPriority(text = "") {
    const t = text.toLowerCase();

    const highWords = [
      "urgent",
      "asap",
      "today",
      "tonight",
      "deadline",
      "due",
      "presentation",
      "demo",
      "fix",
      "bug",
      "fail",
      "broken",
      "crash",
      "error",
      "pay",
      "payment",
      "interview",
      "exam",
      "midterm",
      "final",
    ];
    const medWords = [
      "implement",
      "write",
      "draft",
      "study",
      "research",
      "prepare",
      "setup",
      "refactor",
      "design",
      "deploy",
      "optimize",
      "configure",
      "connect",
    ];
    const lowWords = [
      "nice to have",
      "later",
      "someday",
      "maybe",
      "cleanup",
      "polish",
      "read",
      "idea",
    ];

    if (highWords.some((w) => t.includes(w))) return "high";
    if (medWords.some((w) => t.includes(w))) return "med";
    if (lowWords.some((w) => t.includes(w))) return "low";
    return "none";
  }

  // Optional: refine with your API if you add one later
  async function refinePriorityWithAI(id, text, setTasks) {
    try {
      const r = await fetch("http://localhost:5174/api/priority", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const { priority } = await r.json(); // "high" | "med" | "low" | "none"
      if (priority && ["high", "med", "low", "none"].includes(priority)) {
        setTasks((prev) =>
          prev.map((t) => (t.id === id ? { ...t, priority } : t))
        );
      }
    } catch {
      /* ignore if server not running */
    }
  }

  // ➕ add task to Backlog (and auto-promote if Study Mode & nothing active)
function addTask() {
  if (!newTask.trim()) return;

  const id = crypto.randomUUID();
  const startingPriority = autoPriority(newTask.trim()); // 👈 AI-ish guess

  const newT = {
    id,
    text: newTask.trim(),
    col: "backlog", // or "todo" if that's your default lane
    priority: startingPriority,
  };

  const hadDoing = tasks.some((t) => t.col === "doing");

  setTasks((prev) => {
    const next = [...prev, newT];

    // If Study Mode and nothing was active, promote the new one to doing
    if (studyMode && !hadDoing) {
      return next.map((t) => (t.id === id ? { ...t, col: "doing" } : t));
    }
    return next;
  });

  if (studyMode && !hadDoing) {
    setActiveId(id);
  }

  setNewTask("");
}



  // helpers for WIP-aware moves
  function countInCol(colId, arr) {
    return arr.filter((t) => t.col === colId).length;
  }
  function findCol(colId) {
    return columns.find((c) => c.id === colId);
  }

  // WIP-aware move
  function moveTask(id, targetColId) {
    setTasks((prev) => {
      const col = findCol(targetColId);
      const limit = col?.wip;
      const nextCount = countInCol(targetColId, prev);

      if (typeof limit === "number" && nextCount >= limit) {
        return prev; // block move – at limit
      }
      return prev.map((t) => (t.id === id ? { ...t, col: targetColId } : t));
    });
  }

  function updateTask(id, patch) {
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  function removeTask(id) {
    setTasks((ts) => ts.filter((t) => t.id !== id));
  }

function cyclePriority(id) {
  const order = ["none", "low", "med", "high"];
  setTasks((prev) =>
    prev.map((t) => {
      if (t.id !== id) return t;
      const cur = t.priority ?? "none";
      const next = order[(order.indexOf(cur) + 1) % order.length];
      return { ...t, priority: next };
    })
  );
}

  function toggleDone(id) {
    setTasks((ts) =>
      ts.map((t) =>
        t.id === id ? { ...t, col: t.col === "done" ? "backlog" : "done" } : t
      )
    );
    if (id === activeId) setActiveId(null);
  }

  return {
    tasks,
    setTasks,
    activeId,
    setActive,
    newTask,
    setNewTask,
    studyMode,
    setStudyMode,
    askOpen,
    setAskOpen,
    dragId,
    setDragId,
    columns,
    focusTask,
    addTask,
    moveTask,
    updateTask,
    removeTask,
    cyclePriority,
    toggleDone,
  };
}
