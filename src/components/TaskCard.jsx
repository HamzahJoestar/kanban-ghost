// src/components/TaskCard.jsx
import { useState } from "react";

const PRI_COLORS = {
  none: "bg-zinc-600",
  low: "bg-emerald-600",
  med: "bg-amber-600",
  high: "bg-rose-600",
};

export default function TaskCard({
  task,
  columns,
  counts, // optional WIP counts
  moveTask,
  updateTask,
  removeTask,
  cyclePriority, // <- make sure this is passed from parent
  toggleDone,
  onDragStart,
  onDragEnd,
}) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  const pri = task.priority ?? "none";
  const priClass = PRI_COLORS[pri] ?? PRI_COLORS.none;

  // small helper to keep clicks from starting drags
  const stopDrag = (e) => e.stopPropagation();

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart?.(e, task.id)}
      onDragEnd={onDragEnd}
      className="p-3 rounded-lg bg-zinc-700 cursor-grab hover:bg-zinc-600 active:cursor-grabbing"
    >
      {/* header row */}
      <div className="flex items-start gap-2">
        {/* Done toggle */}
        <button
          onMouseDown={stopDrag}
          onClick={() => toggleDone(task.id)}
          className={`w-5 h-5 grid place-items-center rounded-md border border-zinc-500 mt-0.5 ${
            task.col === "done" ? "bg-emerald-600 text-white" : "bg-zinc-800"
          }`}
          title="Toggle done"
        >
          {task.col === "done" ? "✓" : ""}
        </button>

        <div className="flex-1">
          {/* title (click to edit) */}
          {editingTitle ? (
            <input
              autoFocus
              value={task.text}
              onMouseDown={stopDrag}
              onChange={(e) => updateTask(task.id, { text: e.target.value })}
              onBlur={() => setEditingTitle(false)}
              onKeyDown={(e) => e.key === "Enter" && setEditingTitle(false)}
              className="w-full px-1 py-0.5 rounded bg-zinc-800 border border-zinc-600"
            />
          ) : (
            <div
              className="font-medium cursor-text"
              onMouseDown={stopDrag}
              onClick={() => setEditingTitle(true)}
              title="Click to edit"
            >
              {task.text}
            </div>
          )}

          {/* priority pill (CLICK ME) */}
          <div className="mt-1 flex flex-wrap gap-2 text-xs opacity-80">
            <button
              type="button"
              onMouseDown={stopDrag}
              onClick={() => cyclePriority(task.id)}
              className={`px-2 py-0.5 rounded-full ${priClass}`}
              title="Click to change priority"
            >
              {pri === "none" ? "PRIO" : pri.toUpperCase()}
            </button>

            {task.due && (
              <span className="px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-600">
                Due: {task.due}
              </span>
            )}
          </div>
        </div>

        {/* Delete */}
        <button
          onMouseDown={stopDrag}
          onClick={() => removeTask(task.id)}
          className="text-xs px-2 py-1 rounded bg-rose-600 hover:bg-rose-500"
        >
          Del
        </button>
      </div>

      {/* Move control (optional, unchanged) */}
      <div className="mt-2 text-xs">
        <label className="mr-2 opacity-70">Move to:</label>
        <select
          value={task.col}
          onMouseDown={stopDrag}
          onChange={(e) => moveTask(task.id, e.target.value)}
          className="bg-zinc-800 border border-zinc-600 rounded px-2 py-1"
        >
          {columns.map((c) => {
            const inC = counts?.[c.id] ?? 0;
            const limit = c?.wip;
            const disabled =
              c.id !== task.col && typeof limit === "number" && inC >= limit;

            return (
              <option key={c.id} value={c.id} disabled={disabled}>
                {c.name}
                {typeof limit === "number" ? ` (${inC}/${limit})` : ""}
              </option>
            );
          })}
        </select>
      </div>

      {/* notes toggle */}
      <button
        onMouseDown={stopDrag}
        onClick={() => setShowNotes((s) => !s)}
        className="text-xs mt-2 text-zinc-400 hover:text-zinc-200"
      >
        {showNotes ? "Hide Details ▲" : "Show Details ▼"}
      </button>

      {showNotes && (
        <div className="mt-2 space-y-2 border-t border-zinc-600 pt-3">
          <textarea
            value={task.notes ?? ""}
            onMouseDown={stopDrag}
            onChange={(e) => updateTask(task.id, { notes: e.target.value })}
            placeholder="Notes…"
            className="w-full px-3 py-2 rounded bg-zinc-800 border border-zinc-700"
            rows={3}
          />
          <div className="flex items-center gap-2 text-sm opacity-80">
            <label>Due:</label>
            <input
              type="date"
              value={task.due ?? ""}
              onMouseDown={stopDrag}
              onChange={(e) => updateTask(task.id, { due: e.target.value })}
              className="px-2 py-1 rounded bg-zinc-800 border border-zinc-700"
            />
          </div>
        </div>
      )}
    </div>
  );
}
