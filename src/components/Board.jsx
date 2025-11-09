import TaskCard from "./TaskCard";

export default function Board({
  columns,
  tasks,
  moveTask,
  updateTask,
  removeTask,
  cyclePriority,
  toggleDone,
  onDrop,
  setDragId,
  setDragging,
}) {
  // live card counts per column (for WIP disabling in TaskCard)
  const counts = Object.fromEntries(
    columns.map((c) => [c.id, tasks.filter((t) => t.col === c.id).length])
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {columns.map((col) => (
        <div
          key={col.id}
          onDragOver={(e) => {
            // Only allow drag-over if under WIP limit
            const count = tasks.filter((t) => t.col === col.id).length;
            if (!col.wip || count < col.wip) e.preventDefault();
          }}
          onDrop={(e) => onDrop(e, col.id)}
          className={`bg-zinc-800/60 rounded-xl p-4 backdrop-blur-sm border ${
            col.wip && tasks.filter((t) => t.col === col.id).length >= col.wip
              ? "border-rose-600"
              : "border-zinc-700"
          }`}
        >
          <h2 className="text-lg font-semibold mb-3 flex items-center justify-between">
            <span>{col.name}</span>
            <span className="text-xs px-2 py-0.5 rounded bg-zinc-700 border border-zinc-600">
              {tasks.filter((t) => t.col === col.id).length}
              {col.wip ? ` / ${col.wip}` : ""}
            </span>
          </h2>
          <div className="space-y-2 min-h-40">
            {tasks
              .filter((t) => t.col === col.id)
              .map((t) => (
                <TaskCard
                  key={t.id}
                  task={t}
                  columns={columns}
                  counts={counts}
                  moveTask={moveTask}
                  updateTask={updateTask}
                  removeTask={removeTask}
                  cyclePriority={cyclePriority}
                  toggleDone={toggleDone}
                  onDragStart={(e) => {
                    setDragId(t.id);
                    setDragging(true);
                    e.dataTransfer.setData("text/plain", t.id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragEnd={() => setDragging(false)}
                />
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
