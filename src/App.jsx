import { useState, useEffect, useRef } from "react";
import { useKanbanState } from "./hooks/useKanbanState";
import { useGhost } from "./hooks/useGhost";
import Ghost from "./components/Ghost";
import AskModal from "./components/AskModal";
import HeaderBar from "./components/HeaderBar";
import AddTaskBar from "./components/AddTaskBar";
import Board from "./components/Board";
import StudyFocus from "./components/StudyFocus";
import NextUpList from "./components/NextUpList";
import { ghostAskAPI } from "./lib/api";


export default function App() {
  const {
    tasks,
    setTasks,
    activeId,
    setActive,
    newTask,
    setNewTask,
    studyMode,
    setStudyMode,
    dragId,
    setDragId,
    columns,
    focusTask,
    addTask,
    moveTask: _unusedMoveTask,
    updateTask,
    removeTask,
    cyclePriority,
    toggleDone,
  } = useKanbanState();

  const [askOpen, setAskOpen] = useState(false);

  // Music state
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [musicVolume, setMusicVolume] = useState(0.3);
  const audioRef = useRef(null);
  const fadeIntervalRef = useRef(null);

  const {
    ghostPos,
    setGhostPos,
    ghostGrab,
    setGhostGrab,
    ghostThinking,
    setGhostThinking,
    ghostSpeaking,
    ghostTopic,
    ghostCaption,
    dragging,
    setDragging,
    speak,
    ghostSuggest,
    setGhostTopic,
  } = useGhost({ tasks, activeId, setActive });

  /* ---------------------------
   * MUSIC CONTROLS
   * -------------------------*/

  // Initialize audio element
  useEffect(() => {
    const audio = new Audio("/study-loop.mp3");
    audio.loop = true;
    audio.volume = musicVolume;
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, []);

  // Toggle music play/pause
  const toggleMusic = () => {
    if (!audioRef.current) return;

    if (musicPlaying) {
      audioRef.current.pause();
      setMusicPlaying(false);
    } else {
      audioRef.current.play().catch(console.error);
      setMusicPlaying(true);
    }
  };

  // In App.jsx, update the auto-play useEffect:
  useEffect(() => {
    if (studyMode && !musicPlaying && audioRef.current) {
      // Show user-friendly message instead of silent failure
      audioRef.current
        .play()
        .then(() => setMusicPlaying(true))
        .catch((err) => {
          console.log("Music autoplay blocked - click Play Music button");
          // Don't set musicPlaying to true if it failed
        });
    }
  }, [studyMode, musicPlaying]);

  // Smooth volume fade
  const fadeVolume = (targetVolume, duration = 500) => {
    if (!audioRef.current) return;

    // Clear any existing fade
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
    }

    const startVolume = audioRef.current.volume;
    const volumeDiff = targetVolume - startVolume;
    const steps = 20;
    const stepTime = duration / steps;
    const volumeStep = volumeDiff / steps;
    let currentStep = 0;

    fadeIntervalRef.current = setInterval(() => {
      currentStep++;
      if (currentStep >= steps) {
        audioRef.current.volume = targetVolume;
        clearInterval(fadeIntervalRef.current);
        fadeIntervalRef.current = null;
      } else {
        audioRef.current.volume = startVolume + volumeStep * currentStep;
      }
    }, stepTime);
  };

  // Duck music when ghost is speaking
  useEffect(() => {
    if (ghostSpeaking) {
      // Fade to 20% volume when speaking
      fadeVolume(musicVolume * 0.2, 300);
    } else {
      // Fade back to full volume when done
      fadeVolume(musicVolume, 500);
    }
  }, [ghostSpeaking, musicVolume]);

  // Update audio volume when slider changes
  useEffect(() => {
    if (audioRef.current && !ghostSpeaking) {
      audioRef.current.volume = musicVolume;
    }
  }, [musicVolume]);

  /* ---------------------------
   * KEYBOARD SHORTCUTS
   * -------------------------*/
useEffect(() => {
  function handleKeyPress(e) {
    // Only if no input is focused
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

    if (e.key === "g" && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      ghostSuggest();
    }
    if (e.key === "s" && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      setStudyMode((s) => !s);
    }
  }

  window.addEventListener("keypress", handleKeyPress);
  return () => window.removeEventListener("keypress", handleKeyPress);
}, [ghostSuggest, setStudyMode]);

/* ---------------------------
 * Helpers
 * -------------------------*/
const findCol = (id) => columns.find((c) => c.id === id);
const countInCol = (id, list = tasks) =>
  list.filter((t) => t.col === id).length;

function getThroughputLast7Days(list) {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return list.filter((t) => t.finishedAt && t.finishedAt >= cutoff).length;
}

  function getThroughputLast7Days(list) {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return list.filter((t) => t.finishedAt && t.finishedAt >= cutoff).length;
  }

  function getAvgCycleTimeDays(list) {
    const finished = list.filter((t) => t.finishedAt && t.startedAt);
    if (!finished.length) return 0;
    const avgMs =
      finished.reduce((sum, t) => sum + (t.finishedAt - t.startedAt), 0) /
      finished.length;
    return (avgMs / (24 * 60 * 60 * 1000)).toFixed(1);
  }

  /* ---------------------------
   * WIP-SAFE MOVES
   * -------------------------*/
  function stampForCol(task, targetColId) {
    return {
      ...task,
      col: targetColId,
      startedAt:
        targetColId === "doing" && !task.startedAt
          ? Date.now()
          : task.startedAt,
      reviewedAt:
        targetColId === "review" && !task.reviewedAt
          ? Date.now()
          : task.reviewedAt,
      finishedAt:
        targetColId === "done" && !task.finishedAt
          ? Date.now()
          : task.finishedAt,
    };
  }

  function moveWithWip(id, targetColId) {
    const col = findCol(targetColId);
    const limit = col?.wip;

    const nextCount = countInCol(targetColId);
    if (typeof limit === "number" && nextCount >= limit) {
      speak?.(
        "WIP limit hit. Don't overstress yourself. Please finish something first."
      );
      return;
    }

    setTasks((prev) =>
      prev.map((t) => (t.id === id ? stampForCol(t, targetColId) : t))
    );
    speak?.(targetColId === "done" ? "Nice! Task complete." : "Moved.");
  }

  function onDrop(e, targetColId) {
    const idFromDnD = e.dataTransfer.getData("text/plain");
    const id = idFromDnD || dragId;
    if (!id) return;

    const col = findCol(targetColId);
    const limit = col?.wip;
    const nextCount = countInCol(targetColId);

    if (typeof limit === "number" && nextCount >= limit) {
      speak?.("WIP limit hit. Finish something first.");
      setDragId?.(null);
      setDragging?.(false);
      return;
    }

    setTasks((prev) =>
      prev.map((t) => (t.id === id ? stampForCol(t, targetColId) : t))
    );

    setDragId?.(null);
    setDragging?.(false);
    speak?.(targetColId === "done" ? "Nice! Task complete." : "Moved.");
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100 p-8">
      <HeaderBar
        ghostThinking={ghostThinking}
        onSuggest={ghostSuggest}
        onAskOpen={() => setAskOpen(true)}
        studyMode={studyMode}
        setStudyMode={setStudyMode}
        speak={speak}
        setTasks={setTasks} // ← ADD THIS
      />

      <AddTaskBar newTask={newTask} setNewTask={setNewTask} onAdd={addTask} />

      {/* Music Controls - Only show in study mode */}
      {studyMode && (
        <div className="mb-4 bg-zinc-800/60 border border-zinc-700 rounded-lg p-3 flex items-center gap-4">
          <button
            onClick={toggleMusic}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors flex items-center gap-2"
          >
            {musicPlaying ? "⏸️" : "▶️"}
            <span>{musicPlaying ? "Pause Music" : "Play Music"}</span>
          </button>

          <div className="flex items-center gap-3 flex-1">
            <span className="text-sm text-zinc-400">🔊 Volume</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={musicVolume}
              onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
              className="flex-1 max-w-xs"
            />
            <span className="text-sm text-zinc-400 w-12">
              {Math.round(musicVolume * 100)}%
            </span>
          </div>
          {ghostSpeaking && (
            <div className="flex items-center gap-2 text-xs text-purple-400 animate-pulse">
              <span>🎵</span>
              <div className="flex gap-1">
                <div
                  className="w-1 h-3 bg-purple-400 animate-pulse"
                  style={{ animationDelay: "0ms" }}
                ></div>
                <div
                  className="w-1 h-3 bg-purple-400 animate-pulse"
                  style={{ animationDelay: "150ms" }}
                ></div>
                <div
                  className="w-1 h-3 bg-purple-400 animate-pulse"
                  style={{ animationDelay: "300ms" }}
                ></div>
              </div>
              <span>Music ducked</span>
            </div>
          )}
        </div>
      )}
      <div className="mb-4 text-xs grid md:grid-cols-4 gap-2">
        <div className="bg-zinc-800/60 border border-zinc-700 rounded p-2">
          <div className="font-semibold">Backlog policy</div>
          <div>Small, clear, actionable tasks only.</div>
        </div>
        <div className="bg-zinc-800/60 border border-zinc-700 rounded p-2">
          <div className="font-semibold">Doing (WIP ≤ 2)</div>
          <div>One person → one card. No multitasking.</div>
        </div>
        <div className="bg-zinc-800/60 border border-zinc-700 rounded p-2">
          <div className="font-semibold">Review (WIP ≤ 2)</div>
          <div>Peer check / demo before Done.</div>
        </div>
        <div className="bg-zinc-800/60 border border-zinc-700 rounded p-2">
          <div className="font-semibold">Definition of Done</div>
          <div>Works, reviewed, demo-ready.</div>
        </div>
      </div>

      {/* metrics badges */}
      <div className="mb-4 flex gap-3 text-sm">
        <div className="px-3 py-1 rounded bg-zinc-800 border border-zinc-700">
          Throughput (7d): <b>{getThroughputLast7Days(tasks)}</b>
        </div>
        <div className="px-3 py-1 rounded bg-zinc-800 border border-zinc-700">
          Avg cycle time: <b>{getAvgCycleTimeDays(tasks)}d</b>
        </div>
      </div>

      {studyMode ? (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex items-center justify-center">
            <StudyFocus
              focusTask={focusTask}
              toggleDone={toggleDone}
              activeId={activeId}
              speak={speak}
              ghostSuggest={ghostSuggest}
            />
          </div>

          <div className="bg-zinc-800/60 border border-zinc-700 rounded-xl p-4">
            <h3 className="text-lg font-semibold mb-3">Next Up</h3>
            <NextUpList
              tasks={tasks}
              columns={columns}
              setDragId={setDragId}
              setDragging={setDragging}
              moveTask={moveWithWip}
              removeTask={removeTask}
              cyclePriority={cyclePriority}
              toggleDone={toggleDone}
            />
          </div>
        </div>
      ) : (
        <Board
          columns={columns}
          tasks={tasks}
          moveTask={moveWithWip}
          removeTask={removeTask}
          cyclePriority={cyclePriority}
          toggleDone={toggleDone}
          onDrop={onDrop}
          setDragId={setDragId}
          setDragging={setDragging}
        />
      )}

      {/* Ghost live caption */}
      <div
        className="fixed right-6 bottom-24 w-80 max-w-[90vw] bg-zinc-800/95 border border-zinc-700 rounded-xl p-3 shadow-2xl backdrop-blur-lg transition-all"
        style={{
          transform: ghostSpeaking ? "scale(1.02)" : "scale(1)",
          borderColor: ghostSpeaking ? "#a78bfa" : "#52525b",
        }}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center justify-between mb-1">
          <div className="text-[10px] uppercase tracking-wide text-zinc-400">
            {ghostSpeaking ? "🗣️ Speaking" : "💭 Last Message"}
          </div>
          {ghostSpeaking && (
            <div className="flex gap-1">
              <div className="w-1 h-3 bg-purple-400 animate-pulse"></div>
              <div
                className="w-1 h-3 bg-purple-400 animate-pulse"
                style={{ animationDelay: "0.2s" }}
              ></div>
              <div
                className="w-1 h-3 bg-purple-400 animate-pulse"
                style={{ animationDelay: "0.4s" }}
              ></div>
            </div>
          )}
        </div>
        <div className="text-sm font-medium text-purple-300">
          {ghostTopic || "—"}
        </div>
        <div className="mt-2 text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">
          {ghostCaption || "Waiting for ghost..."}
        </div>
      </div>

      <Ghost
        onSpeak={() => speak("Boo! let's focus up.")}
        excited={ghostThinking || dragging || Boolean(ghostGrab)}
        thinking={ghostThinking}
        speaking={ghostSpeaking}
        pos={ghostPos}
        setPos={setGhostPos}
        setGrab={setGhostGrab}
        grab={ghostGrab}
      />

      {askOpen && (
        <AskModal
          onClose={() => setAskOpen(false)}
          onAsk={async (text) => {
            setAskOpen(false);
            try {
              setGhostThinking(true);
              setGhostTopic(text);
              const { say } = await ghostAskAPI(text);
              await speak(say || "Start with one tiny step.");

            } catch {
              await speak("I believe in you. Start with one tiny step.");
            } finally {
              setGhostThinking(false);
            }
          }}
        />
      )}
    </div>
  );
}