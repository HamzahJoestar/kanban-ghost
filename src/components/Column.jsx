// src/components/Column.jsx
import TaskCard from "./TaskCard";

export default function Column({
  col,
  tasks,
  columns,
  moveTask,
  updateTask,
  removeTask,
  cyclePriority,
  toggleDone,
  onDrop,
  setDragId,
  setDragging,
}) {
  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => onDrop(e, col.id)}
      className="bg-zinc-800/60 border border-zinc-700 rounded-xl p-4 backdrop-blur-sm"
    >
      <h2 className="text-lg font-semibold mb-3">{col.name}</h2>
      <div className="space-y-2 min-h-40">
        {tasks
          .filter((t) => t.col === col.id)
          .map((t) => (
            <TaskCard
              key={t.id}
              task={t}
              columns={columns}
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
  );
}
