// src/components/Ghost.jsx
import { useEffect, useState } from "react";

export default function Ghost({
  onSpeak,
  excited,
  thinking = false, // <-- NEW
  speaking = false, // <-- NEW
  pos,
  setPos,
  grab,
  setGrab,
}) {
  const [blink, setBlink] = useState(false);

  // little eye blink
  useEffect(() => {
    const interval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 150);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // drag ghost
  function handlePointerDown(e) {
    e.preventDefault();
    e.stopPropagation();
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const dx = e.clientX - rect.left;
    const dy = e.clientY - rect.top;
    setGrab({ dx, dy });
    el.setPointerCapture?.(e.pointerId);
  }

  function handlePointerMove(e) {
    if (!grab) return;
    const x = e.clientX - grab.dx;
    const y = e.clientY - grab.dy;
    setPos({ x, y });
  }

  function handlePointerUp(e) {
    if (!grab) return;
    e.preventDefault();
    e.stopPropagation();
    setGrab(null);
  }

  const style = pos
    ? {
        left: pos.x,
        top: pos.y,
        right: "auto",
        bottom: "auto",
        touchAction: "none",
      }
    : { right: 24, bottom: 24, touchAction: "none" };

  // animation stack: speaking > excited > idle
  const animClass = speaking
    ? "animate-wiggle"
    : excited
    ? "animate-bounce"
    : "animate-floaty";

  // subtle scale on hover only when not grabbing
  const hoverScale = grab ? "" : "hover:scale-110";

  // pick an emoji face based on state (totally optional vibe)
  const face = thinking ? "😶‍🌫️" : "👻";

  return (
    <button
      onClick={onSpeak}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      draggable={false}
      className={`fixed text-4xl select-none transition-transform z-50 ${animClass} ${hoverScale}`}
      style={style}
      title="Drag me! Boo 👻"
      aria-label="Kanban Ghost"
    >
      {/* thought bubble when thinking */}
      {thinking && (
        <span
          className="absolute -top-3 -right-3 text-xs px-1.5 py-0.5 rounded bg-zinc-700 border border-zinc-600 animate-pulse"
          style={{ transform: "translate(50%, -50%)" }}
        >
          …
        </span>
      )}

      {/* ghost face w/ blink */}
      <span className={blink ? "opacity-40" : "opacity-100"}>{face}</span>
    </button>
  );
}
