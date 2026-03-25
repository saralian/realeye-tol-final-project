// User-placed annotation pin for Round 2 (scaffoldLevel "checklist").
// Unlike HotspotMarker, these pins are created dynamically when the learner
// clicks on the image — there are no pre-defined coordinates.
//
// Popup visibility is controlled by the parent via `isOpen` so that HotspotTask
// can intercept outside clicks (including on the image) and prevent a new pin
// from being placed while this popup is visible.
//
// Outer div stopPropagation: prevents any click on the pin (dot, label, popup)
// from bubbling to the image container's onClick handler.
//
// data-free-pin-popup / data-free-pin-dot: used by the document mousedown
// listener in HotspotTask to distinguish "inside popup/dot" from "outside".

import { useState, useEffect } from 'react'
import { trackEvent } from '../utils/tracking'

export default function FreePinMarker({ pin, isOpen, onAnnotate, onToggle, onCancel, roundNumber }) {
  const [inputText, setInputText] = useState('')

  // Re-sync the input field with the pin's saved text each time the popup opens
  useEffect(() => {
    if (isOpen) setInputText(pin.text || '')
  }, [isOpen, pin.text])

  const isAnnotated = pin.text && pin.text.length > 0

  function handleConfirm() {
    if (!inputText.trim()) return
    onAnnotate(pin.id, inputText.trim())
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleConfirm()
    if (e.key === 'Escape') onCancel(pin.id)
  }

  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
      style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
      onClick={e => e.stopPropagation()}
    >
      <button
        type="button"
        data-free-pin-dot=""
        onClick={() => onToggle(pin.id)}
        aria-label="User-placed pin. Click to annotate."
        aria-expanded={isOpen}
        className={[
          'relative w-8 h-8 rounded-full border-2 border-white shadow-lg',
          'flex items-center justify-center text-sm font-bold transition-colors cursor-pointer',
          isAnnotated
            ? 'bg-blue-500 text-white'
            : 'bg-blue-500 text-white hover:bg-blue-400',
        ].join(' ')}
      >
        {isAnnotated ? '✓' : '+'}
      </button>

      {/* Annotation popup — controlled by parent via isOpen */}
      {/* Confirmed annotation label is rendered by HotspotTask (smart card positioning) */}
      {isOpen && (
        <div
          data-free-pin-popup=""
          className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-20 w-56 bg-white border border-gray-200 rounded-lg shadow-xl p-3 space-y-2"
        >
          <p className="text-xs font-semibold text-gray-700">What do you notice here?</p>
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
              onClick={() => {
                trackEvent({ roundNumber, phaseNumber: 3, eventType: 'button_clicked', elementId: 'free_pin_confirm_button', value: { pinId: pin.id, text: inputText.trim() } })
                handleConfirm()
              }}
              disabled={!inputText.trim()}
              className="px-3 py-1 bg-blue-600 text-white text-xs rounded disabled:bg-gray-200 disabled:text-gray-400 hover:bg-blue-700 transition-colors"
            >
              Confirm
            </button>
            <button
              type="button"
              onClick={() => {
                trackEvent({ roundNumber, phaseNumber: 3, eventType: 'button_clicked', elementId: 'free_pin_cancel_button', value: { pinId: pin.id } })
                onCancel(pin.id)
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
