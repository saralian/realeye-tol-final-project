// Side panel shown only in Round 2 (scaffoldLevel === "checklist").
// Populated directly from exercise.artifactTypes — no separate data field needed (DRY).
//
// Each list item has two icons on the right:
//   [?] — non-interactive; hover shows a short tooltip explaining what the label means
//          (text from exercise.artifactHints); hidden if no hint is available
//   [!] — yellow circle resembling a glow-mode hotspot dot; click reveals corresponding
//          hotspot markers on the image; turns green once revealed; hidden after submit

import { trackEvent } from '../utils/tracking'

export default function ChecklistPanel({ artifactTypes, artifactHints = {}, revealedTypes = new Set(), onReveal, locked = false, roundNumber }) {
  return (
    <div className="w-52 shrink-0 rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3 self-start">
      <p className="text-sm font-semibold text-gray-700">Things to look for:</p>
      <ul className="space-y-2">
        {artifactTypes.map(type => {
          const isRevealed = revealedTypes.has(type)
          const conceptHint = artifactHints[type]
          return (
            <li key={type} className="flex items-center gap-2 text-sm text-gray-600">
              {/* Unchecked box glyph — visual only */}
              <span className="text-gray-400 shrink-0" aria-hidden="true">☐</span>
              <span className="flex-1">{type}</span>

              {/* [?] Concept hint — non-interactive; hover tooltip explains the label */}
              {conceptHint && (
                <div
                  className="relative group flex-shrink-0"
                  onMouseEnter={() => trackEvent({
                    roundNumber,
                    phaseNumber: 3,
                    eventType: 'checklist_concept_hint_hovered',
                    elementId: type,
                    value: { artifactType: type, hint: conceptHint },
                  })}
                >
                  <span
                    className="flex items-center justify-center w-5 h-5 rounded-full bg-yellow-400 border-2 border-white shadow-md cursor-default select-none"
                    aria-hidden="true"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-yellow-900" aria-hidden="true">
                      <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z" />
                    </svg>
                  </span>
                  <div className="absolute bottom-full right-0 mb-1.5 hidden group-hover:block z-30 w-44 bg-gray-800 text-white text-xs rounded-lg px-2.5 py-2 leading-snug shadow-lg pointer-events-none">
                    {conceptHint}
                    <div className="absolute top-full right-1.5 border-4 border-transparent border-t-gray-800" />
                  </div>
                </div>
              )}

              {/* [!] Reveal hotspots — styled like a glow-mode hotspot dot; hidden after submit */}
              {!locked && (
                <div className="relative group flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (isRevealed) return
                      onReveal(type)
                      trackEvent({
                        roundNumber,
                        phaseNumber: 3,
                        eventType: 'checklist_reveal_clicked',
                        elementId: type,
                        value: { artifactType: type },
                      })
                    }}
                    disabled={isRevealed}
                    aria-label={isRevealed ? 'Hotspots revealed' : 'Click to reveal hotspots'}
                    className={[
                      'flex items-center justify-center w-5 h-5 rounded-full border-2 border-white shadow text-[10px] font-bold select-none',
                      isRevealed
                        ? 'bg-gray-500 text-white cursor-default'
                        : 'bg-cyan-400 text-cyan-900 cursor-pointer hover:bg-cyan-300',
                    ].join(' ')}
                  >
                    !
                  </button>
                  {/* Tooltip — only shown when not yet revealed */}
                  {!isRevealed && (
                    <div className="absolute bottom-full right-0 mb-1.5 hidden group-hover:block z-30 w-36 bg-gray-800 text-white text-xs rounded-lg px-2.5 py-2 leading-snug shadow-lg pointer-events-none">
                      Click to reveal hotspots
                      <div className="absolute top-full right-1.5 border-4 border-transparent border-t-gray-800" />
                    </div>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
