// src/components/StudyFocus.jsx
import Timer from "./Timer";

export default function StudyFocus({ focusTask, toggleDone, activeId, speak }) {
  if (!focusTask)
    return <p className="opacity-70">No active task. Ask the ghost 👻</p>;

  return (
    <div className="w-full max-w-xl p-6 rounded-xl bg-zinc-800 border border-zinc-600 shadow-lg text-center">
      <h2 className="text-2xl font-bold mb-3">{focusTask.text}</h2>

      <Timer key={activeId || "no-active"} minutes={15} speak={speak} />

      {focusTask.notes && (
        <p className="text-sm opacity-80 mb-4">{focusTask.notes}</p>
      )}
      {focusTask.due && (
        <p className="text-xs opacity-60 mb-4">Due: {focusTask.due}</p>
      )}

      <button
        onClick={() => {
          toggleDone(focusTask.id);
          speak?.("Nice work. One more accomplishment for you, how boo-tiful.");
        }}
        className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500"
      >
        Mark Complete ✅
      </button>
    </div>
  );
}
