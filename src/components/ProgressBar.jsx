// Progress indicator displayed persistently at the top of the app.
// Shows the current round (1–3) and current phase (1–3) so learners know where they are.
// Round maps to currentRound index (0–2) + 1 for display.
// Phase maps to currentPhase string: "observe" → 1, "confirm" → 2, "analyze"/"feedback" → 3.
//
// Navigation:
//   onHome      — home icon (far left); returns to landing page
//   onBack      — back arrow button (right); goes back one step
//   userId      — current logged-in user (null = logged out)
//   onAuthClick — called when Login/Logout button is clicked

const PHASE_LABELS = {
  observe: "Phase 1: Observe",
  confirm: "Phase 2: Confirm",
  analyze: "Phase 3: Analyze",
  feedback: "Phase 3: Analyze",
}

export default function ProgressBar({ currentRound, currentPhase, onBack, onHome, userId, onAuthClick }) {
  const roundDisplay = currentRound + 1
  const phaseLabel = PHASE_LABELS[currentPhase] ?? "Phase 1: Observe"

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-gray-100 border-b border-gray-200 text-sm text-gray-600">
      {/* Home icon + round/phase label — left */}
      <div className="flex items-center gap-3 font-medium">
        <button
          type="button"
          onClick={onHome}
          aria-label="Return to homepage"
          className="flex items-center justify-center w-7 h-7 rounded-md text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M10.707 2.293a1 1 0 0 0-1.414 0l-7 7A1 1 0 0 0 3 11h1v6a1 1 0 0 0 1 1h4v-4h2v4h4a1 1 0 0 0 1-1v-6h1a1 1 0 0 0 .707-1.707l-7-7Z" />
          </svg>
        </button>
        <span>Round {roundDisplay} of 3</span>
        <span className="text-gray-300">|</span>
        <span>{phaseLabel}</span>
      </div>

      {/* Back + Login/Logout — right */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors cursor-pointer whitespace-nowrap"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={onAuthClick}
          className="px-4 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 text-xs font-medium hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap"
        >
          {userId ? `Logout (${userId})` : 'Login'}
        </button>
      </div>
    </div>
  )
}
