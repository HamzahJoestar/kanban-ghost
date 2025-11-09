// src/components/HeaderBar.jsx
export default function HeaderBar({
  ghostThinking,
  onSuggest,
  onAskOpen,
  studyMode,
  setStudyMode,
  speak,
  setTasks, // ← ADD THIS
}) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-3xl font-bold">Kanban Ghost 👻</h1>

      <div className="flex gap-2">
        {/* Ghost Suggests */}
        <button
          onClick={async () => {
            await speak?.("Thinking… give me just a sec.");
            await onSuggest();
          }}
          disabled={ghostThinking}
          className={`px-3 py-2 rounded-lg ${
            ghostThinking
              ? "bg-emerald-600/60 cursor-wait"
              : "bg-emerald-600 hover:bg-emerald-500"
          }`}
          title={ghostThinking ? "Thinking…" : "Ask the ghost for a suggestion"}
        >
          {ghostThinking ? "Thinking…" : "Ghost Suggests"}
        </button>

        {/* Ask Ghost */}
        <button
          onClick={() => {
            onAskOpen();
            speak?.("What's on your mind?");
          }}
          className="px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-500"
        >
          Ask Ghost
        </button>

        {/* Study Mode Toggle */}
        <button
          onClick={async () => {
            await speak?.(
              studyMode
                ? "Exiting focus mode. Back to the board."
                : "Entering study mode. Let's lock in."
            );
            setStudyMode((s) => !s);
          }}
          className={`px-3 py-2 rounded-lg ${
            studyMode ? "bg-indigo-600" : "bg-zinc-700"
          } hover:bg-indigo-500`}
        >
          {studyMode ? "Exit Study Mode" : "Study Mode"}
        </button>

        {/* Load Demo - ADD THIS */}
        <button
          onClick={() => {
            const demos = [
              {
                id: crypto.randomUUID(),
                text: "fix login bug",
                col: "backlog",
                priority: "high",
              },
              {
                id: crypto.randomUUID(),
                text: "study for CS midterm",
                col: "backlog",
                priority: "med",
              },
              {
                id: crypto.randomUUID(),
                text: "how to center a div",
                col: "backlog",
                priority: "low",
              },
            ];
            setTasks(demos);
            speak?.("Demo board loaded. Ask me what to do!");
          }}
          className="px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-sm"
        >
          Load Demo
        </button>
      </div>
    </div>
  );
}
