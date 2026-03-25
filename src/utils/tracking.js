// Lightweight client-side event tracking.
// All events are appended to a JSON array in localStorage under STORAGE_KEY.
//
// Event shape:
//   userId     — string userID set at login (null if not logged in)
//   timestamp  — ISO 8601 string
//   round      — 1-indexed round number (1–3)
//   phase      — phase number (1 = Observe, 2 = Confirm, 3 = Analyze/Feedback)
//   eventType  — string identifier (see constants below)
//   elementId  — hotspot id, pin id, artifact type label, or UI element name
//   value      — primitive or object depending on event type

const STORAGE_KEY = 'userSessionData'

// Module-level userId — set once at login, cleared at logout.
let currentUserId = null

export function setUserId(id) {
  currentUserId = id
}

export function trackEvent({ roundNumber, phaseNumber, eventType, elementId = null, value = null }) {
  const event = {
    userId: currentUserId,
    timestamp: new Date().toISOString(),
    round: roundNumber,
    phase: phaseNumber,
    eventType,
    elementId,
    value,
  }
  try {
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    existing.push(event)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing))
  } catch {
    // localStorage unavailable or quota exceeded — fail silently
  }
}

export function downloadSessionData() {
  try {
    const data = localStorage.getItem(STORAGE_KEY) || '[]'
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `realeye-session-${new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')}.json`
    a.click()
    URL.revokeObjectURL(url)
  } catch {
    // Download unavailable — fail silently
  }
}
