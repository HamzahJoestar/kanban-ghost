import { useState } from "react";
import { useKanbanState } from "./hooks/useKanbanState";
import { useGhost } from "./hooks/useGhost";
import Ghost from "./components/Ghost";
import AskModal from "./components/AskModal";
import HeaderBar from "./components/HeaderBar";
import AddTaskBar from "./components/AddTaskBar";
import Board from "./components/Board";
import StudyFocus from "./components/StudyFocus";
import NextUpList from "./components/NextUpList";


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
    // NOTE: we won't pass the raw moveTask through the UI anymore,
    // we’ll wrap it with WIP checks below.
    moveTask: _unusedMoveTask,
    updateTask,
    removeTask,
    cyclePriority,
    toggleDone,
  } = useKanbanState();

  const [askOpen, setAskOpen] = useState(false);

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
   * Helpers
   * -------------------------*/
  const findCol = (id) => columns.find((c) => c.id === id);
  const countInCol = (id, list = tasks) => list.filter((t) => t.col === id).length;

  // metrics helpers
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
        targetColId === "doing" && !task.startedAt ? Date.now() : task.startedAt,
      reviewedAt:
        targetColId === "review" && !task.reviewedAt ? Date.now() : task.reviewedAt,
      finishedAt:
        targetColId === "done" && !task.finishedAt ? Date.now() : task.finishedAt,
    };
  }

  // used by move buttons
  function moveWithWip(id, targetColId) {
    const col = findCol(targetColId);
    const limit = col?.wip;

    const nextCount = countInCol(targetColId);
    if (typeof limit === "number" && nextCount >= limit) {
      speak?.("WIP limit hit. Don't overstress yourself. Please finish something first.");
      return;
    }

    setTasks((prev) =>
      prev.map((t) => (t.id === id ? stampForCol(t, targetColId) : t))
    );
    speak?.(targetColId === "done" ? "Nice! Task complete." : "Moved.");
  }

  // used by drag-drop
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
      />

      <AddTaskBar newTask={newTask} setNewTask={setNewTask} onAdd={addTask} />

      {/* policies row */}
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
        className="fixed right-24 bottom-24 w-96 max-w-[90vw] bg-zinc-800/80 border border-zinc-700 rounded-xl p-3 shadow-lg backdrop-blur"
        role="status"
        aria-live="polite"
      >
        <div className="text-[10px] uppercase tracking-wide text-zinc-400">
          Ghost Topic
        </div>
        <div className="mt-1 text-sm font-medium">{ghostTopic || "—"}</div>
        <div className="mt-2 text-sm text-zinc-200 whitespace-pre-wrap">
          {ghostCaption || ""}
        </div>
      </div>

      <Ghost
        onSpeak={() => speak("Boo! let’s focus up.")}
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
            // close immediately (don’t wait for TTS)
            setAskOpen(false);
            try {
              setGhostThinking(true);
              setGhostTopic(text);
              const r = await fetch("http://localhost:5174/api/ask", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text }),
              });
              const { say } = await r.json();
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
