// src/lib/api.js
const BASE = `http://localhost:${import.meta.env.VITE_API_PORT || 5174}`;

export async function ghostSuggestAPI(tasks) {
  try {
    const r = await fetch(`${BASE}/api/suggest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tasks }),
    });
    return await r.json();
  } catch {
    return { say: "Focus the smallest TODO." };
  }
}

export async function ghostAskAPI(text) {
  try {
    const r = await fetch(`${BASE}/api/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    return await r.json();
  } catch {
    return { say: "Start with one tiny step." };
  }
}
