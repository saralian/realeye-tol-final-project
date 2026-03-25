// Individual clickable hotspot region overlaid on the AI image in Phase 3.
//
// Positioning math:
//   The parent image container is `position: relative` with `w-full`.
//   Each marker's outer div is `position: absolute` with `left: x%` and `top: y%`,
//   placing the top-left corner of the div at that percentage of the container's
//   width/height. The `-translate-x-1/2 -translate-y-1/2` transform then shifts
//   the div left and up by half its own width/height, centering the dot exactly
//   on the (x%, y%) coordinate regardless of container size.
//
// Scaffolding:
//   scaffoldLevel "glow"       → a Tailwind animate-ping ring pulses around the dot
//                                before the learner annotates it, drawing their eye.
//   scaffoldLevel "checklist"
//             | "none"         → no ring; learner must find regions unaided.
//
// Locked mode (after Phase 3 submit):
//   locked=true disables all interaction. Dot changes color to reflect result.
//   Cards (locked label, annotation label) are rendered and positioned by
//   HotspotTask — not here — so this component renders only the dot and ring.
//
// Interaction (unlocked):
//   Click dot → popup opens (pre-filled with any existing annotation text).
//   Type observation → Confirm (or Enter) → onAnnotate(id, text) fires,
//   parent records the annotation, dot turns green with a ✓.
//   The persistent annotation label is also rendered by HotspotTask (not here).

import { useState } from 'react'
import { trackEvent } from '../utils/tracking'

export default function HotspotMarker({ hotspot, roundNumber, scaffoldLevel, annotation, onAnnotate, locked = false }) {
  const [open, setOpen] = useState(false)
  // inputText is re-synced to the current annotation each time the popup opens
  const [inputText, setInputText] = useState('')

  const isAnnotated = annotation != null && annotation.length > 0

  function handleToggle() {
    if (locked) return
    // Pre-fill with current annotation so the learner can revise it
    setInputText(annotation || '')
    setOpen(o => !o)
  }

  function handleConfirm() {
    if (!inputText.trim()) return
    onAnnotate(hotspot.id, inputText.trim())
    setOpen(false)
    trackEvent({
      roundNumber,
      phaseNumber: 3,
      eventType: 'hotspot_annotation_submitted',
      elementId: hotspot.id,
      value: { label: hotspot.label, text: inputText.trim() },
    })
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleConfirm()
    if (e.key === 'Escape') setOpen(false)
  }

  // Dot color logic
  // Locked + annotated → green; locked + not annotated → red; unlocked + annotated → green; unlocked + not annotated → yellow
  const dotClass = locked
    ? isAnnotated
      ? 'bg-green-500 text-white'
      : 'bg-red-400 text-white'
    : isAnnotated
      ? 'bg-green-500 text-white'
      : 'bg-yellow-400 text-yellow-900 hover:bg-yellow-300'

  const dotLabel = locked
    ? isAnnotated ? '✓' : '!'
    : isAnnotated ? '✓' : '!'

  return (
    // Outer div: absolutely positioned at (x%, y%) within the image container.
    // -translate-x-1/2 -translate-y-1/2 centers the dot on that coordinate point.
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
      style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%` }}
      onClick={e => e.stopPropagation()}
    >
      {/* Inner relative div so the ping span can use absolute inset-0 to match the dot size */}
      <div className="relative">
        {/* Pulsing glow ring — only in Round 1, disappears once the hotspot is annotated or locked */}
        {scaffoldLevel === 'glow' && !isAnnotated && !locked && (
          <span className="absolute inset-0 rounded-full bg-yellow-400 opacity-75 animate-ping" />
        )}

        {/* Clickable dot (non-interactive when locked) */}
        <button
          type="button"
          onClick={handleToggle}
          aria-label={`Hotspot: ${hotspot.label}. ${locked ? 'Feedback revealed.' : 'Click to annotate.'}`}
          aria-expanded={open}
          disabled={locked}
          className={[
            'relative w-8 h-8 rounded-full border-2 border-white shadow-lg',
            'flex items-center justify-center text-sm font-bold transition-colors',
            locked ? 'cursor-default' : 'cursor-pointer',
            dotClass,
          ].join(' ')}
        >
          {dotLabel}
        </button>
      </div>

      {/* Annotation popup (unlocked only) — appears below the dot; replaces the label while editing */}
      {!locked && open && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-20 w-56 bg-white border border-gray-200 rounded-lg shadow-xl p-3 space-y-2">
          {/* Header row: prompt text + optional hint icon (glow mode only) */}
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-gray-700">What do you notice here?</p>
            {/* Hint icon — only in Round 1 (scaffoldLevel "glow"); tooltip appears on hover */}
            {scaffoldLevel === 'glow' && hotspot.hint && (
              <div
                className="relative group flex-shrink-0"
                onMouseEnter={() => trackEvent({
                  roundNumber,
                  phaseNumber: 3,
                  eventType: 'hotspot_hint_hovered',
                  elementId: hotspot.id,
                  value: { label: hotspot.label, hint: hotspot.hint },
                })}
              >
                <span className="flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 text-gray-600 text-[10px] font-bold cursor-default select-none">
                  ?
                </span>
                {/* Hint tooltip — appears above the icon, left-aligned to its right edge */}
                <div className="absolute bottom-full right-0 mb-1.5 hidden group-hover:block z-30 w-48 bg-gray-800 text-white text-xs rounded-lg px-2.5 py-2 leading-snug shadow-lg pointer-events-none">
                  {hotspot.hint}
                  {/* Arrow pointing down toward the icon */}
                  <div className="absolute top-full right-1.5 border-4 border-transparent border-t-gray-800" />
                </div>
              </div>
            )}
          </div>
          <input
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe what looks off..."
            autoFocus
            className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!inputText.trim()}
              className="px-3 py-1 bg-blue-600 text-white text-xs rounded disabled:bg-gray-200 disabled:text-gray-400 hover:bg-blue-700 transition-colors"
            >
              Confirm
            </button>
            <button
              type="button"
              onClick={() => {
                trackEvent({ roundNumber, phaseNumber: 3, eventType: 'button_clicked', elementId: 'hotspot_cancel_button', value: { hotspotId: hotspot.id } })
                setOpen(false)
              }}
              className="px-3 py-1 text-xs text-gray-500 rounded hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
