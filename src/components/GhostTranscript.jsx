export default function GhostTranscript({ text, thinking, speaking }) {
  if (!text && !thinking) return null;

  return (
    <div
      className="fixed right-24 bottom-24 max-w-sm w-[22rem] rounded-xl bg-zinc-900/90 text-zinc-100 border border-zinc-800 shadow-xl p-3 z-50"
      role="region"
      aria-label="Ghost transcript"
    >
      <div className="text-xs uppercase tracking-wide mb-1 text-zinc-400">
        {thinking ? "Thinking…" : speaking ? "Speaking" : "Last message"}
      </div>
      <div className="text-sm leading-snug whitespace-pre-wrap">
        {text || "…"}
      </div>

      {/* Accessible live region for assistive tech */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {text}
      </div>
    </div>
  );
}
