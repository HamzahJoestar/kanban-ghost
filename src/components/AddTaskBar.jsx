export default function AddTaskBar({ newTask, setNewTask, onAdd }) {
  return (
    <div className="flex gap-2 mb-6">
      <input
        value={newTask}
        onChange={(e) => setNewTask(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onAdd();
          }
        }}
        placeholder="New task…"
        className="flex-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700"
      />
      <button
        onClick={onAdd}
        className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500"
      >
        Add
      </button>
    </div>
  );
}
