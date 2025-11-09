// src/lib/api.js
// Dynamically determine API URL based on environment
const API_URL = import.meta.env.VITE_API_URL || 
                (import.meta.env.PROD 
                  ? 'https://kanban-ghost.onrender.com'  // Your Render backend URL
                  : 'http://localhost:5174');

export async function ghostSuggestAPI(tasks) {
  const response = await fetch(`${API_URL}/api/suggest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tasks }),
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  
  return response.json();
}

export async function ghostAskAPI(text, boardState = {}) {
  const response = await fetch(`${API_URL}/api/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, boardState }),
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  
  return response.json();
}

export async function ghostSpeakAPI(text) {
  const response = await fetch(`${API_URL}/api/speak`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  
  if (!response.ok) {
    throw new Error(`TTS error: ${response.status}`);
  }
  
  return response.arrayBuffer();
}