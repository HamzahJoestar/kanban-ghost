// src/components/Timer.jsx
import { useEffect, useRef, useState } from "react";

function formatTime(totalSecs) {
  const mm = String(Math.floor(totalSecs / 60)).padStart(2, "0");
  const ss = String(totalSecs % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export default function Timer({ minutes = 15, onDone, speak }) {
  const initial = minutes * 60;

  const [secs, setSecs] = useState(initial);
  const [baseSecs, setBaseSecs] = useState(initial);
  const [display, setDisplay] = useState(formatTime(initial));
  const [isEditing, setIsEditing] = useState(false);
  const [paused, setPaused] = useState(false);

  const intervalRef = useRef(null);

  function startTimer() {
    intervalRef.current = setInterval(() => {
      setSecs((s) => {
        if (s <= 1) {
          clearInterval(intervalRef.current);
          onDone?.();
          speak?.("Time! Nice focus block.");
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  function stopTimer() {
    clearInterval(intervalRef.current);
  }

  useEffect(() => {
    startTimer();
    return stopTimer;
  }, []);

  useEffect(() => {
    if (!isEditing) setDisplay(formatTime(secs));
  }, [secs, isEditing]);

  function commitTime() {
    setIsEditing(false);

    const parts = display.split(":");
    let mm = Number(parts[0]) || 0;
    let ss = parts[1] ? Number(parts[1]) || 0 : 0;

    mm = Math.max(0, Math.min(mm, 300));
    ss = Math.max(0, Math.min(ss, 59));

    const newSecs = mm * 60 + ss;

    stopTimer();
    setBaseSecs(newSecs);
    setSecs(newSecs);

    if (!paused) startTimer();
  }

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-zinc-700 border border-zinc-600 mb-4">
      {/* Editable time */}
      <input
        value={display}
        onFocus={() => setIsEditing(true)}
        onChange={(e) => setDisplay(e.target.value)}
        onBlur={commitTime}
        onKeyDown={(e) => e.key === "Enter" && commitTime()}
        className="w-16 text-center font-mono text-lg bg-transparent outline-none"
      />

      {/* Pause / Resume */}
      <button
        className="text-xs px-2 py-1 rounded bg-zinc-600 hover:bg-zinc-500"
        onClick={() => {
          if (paused) {
            startTimer();
            speak?.("Back in. Lock in mode 😤");
          } else {
            stopTimer();
            speak?.("Pause. Deep breath.");
          }
          setPaused(!paused);
        }}
      >
        {paused ? "Start" : "Pause"}
      </button>

      {/* Reset */}
      <button
        className="text-xs px-2 py-1 rounded bg-zinc-600 hover:bg-zinc-500"
        onClick={() => {
          stopTimer();
          setSecs(baseSecs);
          if (!paused) startTimer();
        }}
      >
        Reset
      </button>
    </div>
  );
}
