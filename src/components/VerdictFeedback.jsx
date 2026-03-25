// Phase 2 — Verdict Feedback (Confirm)
// Tells the learner whether they correctly identified the AI image.
// Correct path: positive confirmation + forward prompt framing Phase 3 as deeper discovery.
// Incorrect path: gentle correction naming the actual AI image + reorientation for Phase 3.
// No artifact principles are revealed here — that happens in Phase 3 FeedbackPanel.
// Shows a single "Continue" button that advances to Phase 3.

import { trackEvent } from '../utils/tracking'

export default function VerdictFeedback({ wasCorrect, feedbackCorrect, feedbackIncorrect, onContinue, roundNumber }) {
  const message = wasCorrect ? feedbackCorrect : feedbackIncorrect

  return (
    <div className="space-y-4">
      {/* Verdict icon + message */}
      <div className={[
        'flex items-start gap-3 rounded-lg p-4 border',
        wasCorrect
          ? 'bg-green-50 border-green-200 text-green-900'
          : 'bg-amber-50 border-amber-200 text-amber-900',
      ].join(' ')}>
        <span className="text-xl leading-none mt-0.5" aria-hidden="true">
          {wasCorrect ? '✓' : '→'}
        </span>
        <p className="text-sm">{message}</p>
      </div>

      <button
        type="button"
        onClick={() => {
          trackEvent({ roundNumber, phaseNumber: 2, eventType: 'button_clicked', elementId: 'continue_button', value: null })
          onContinue()
        }}
        className="px-6 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors cursor-pointer"
      >
        Continue
      </button>
    </div>
  )
}
