// src/components/NextUpList.jsx
import TaskCard from "./TaskCard";

export default function NextUpList({
  tasks,
  columns,
  setDragId,
  setDragging,
  moveTask,
  updateTask,
  removeTask,
  cyclePriority,
  toggleDone,
}) {
  const todos = tasks.filter((t) => t.col === "todo");

  if (todos.length === 0) {
    return <div className="opacity-60 text-sm">Nothing queued.</div>;
  }

  return (
    <div className="space-y-2">
      {todos.map((t) => (
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
  );
}
