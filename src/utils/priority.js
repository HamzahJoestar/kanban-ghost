// src/utils/priority.js
export function autoPriority(text = "", due = null) {
  const t = (text || "").toLowerCase().trim();

  // 🚨 Obvious "urgent" cues
  const urgentHit =
    /\b(urgent|asap|today|tonight|deadline|due\s*(today|tmrw|tomorrow)|fix|bug|prod|production|broken|fails?)\b/.test(
      t
    );

  // ⚠️ Medium importance cues
  const mediumHit =
    /\b(review|present|demo|deploy|submit|email|reply|study|prepare|practice|test|quiz|midterm|final)\b/.test(
      t
    );

  // 💤 Low/idea cues
  const lowHit = /\b(idea|someday|nice to have|maybe|later)\b/.test(t);

  // “how do i …/what is …” type (usually real work, but not necessarily firefighting)
  const looksLikeQuestion =
    /[?]$/.test(t) ||
    /^(how|what|why|who|which|when|where|can|should|could|would|best|tips)\b/.test(
      t
    ) ||
    /\b(how to|how do|what is|why is)\b/.test(t);

  // crude due-date bump if within 48h (optional if you add due dates later)
  let dueSoon = false;
  if (due) {
    try {
      const d = new Date(due).getTime();
      if (!Number.isNaN(d)) {
        const now = Date.now();
        dueSoon = d - now <= 48 * 60 * 60 * 1000;
      }
    } catch {}
  }

  if (urgentHit || dueSoon) return "high";
  if (mediumHit || looksLikeQuestion) return "med";
  if (lowHit) return "low";
  // default: if it's short, assume low, else med
  return t.split(/\s+/).length <= 2 ? "low" : "med";
}
