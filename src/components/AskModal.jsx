// src/components/AskModal.jsx
import { useState } from "react";

export default function AskModal({ onClose, onAsk }) {
  const [textValue, setTextValue] = useState("");

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-zinc-800 p-6 rounded-xl w-full max-w-md space-y-4 border border-zinc-700">
        <h2 className="text-xl font-semibold">Ask the Ghost</h2>
        <p className="text-sm opacity-80">
          Ask for motivation, help focusing, or advice.
        </p>

        <textarea
          className="w-full p-3 rounded-lg bg-zinc-700 border border-zinc-600"
          placeholder="What's on your mind?"
          value={textValue}
          onChange={(e) => setTextValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              onAsk(textValue); // fire the request
              onClose(); // close immediately
            }
          }}
          rows={4}
        />

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-2 rounded-lg bg-zinc-600 hover:bg-zinc-500"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onAsk(textValue); // fire the request
              onClose(); // close immediately
            }}
            className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500"
          >
            Ask
          </button>
        </div>
      </div>
    </div>
  );
}
