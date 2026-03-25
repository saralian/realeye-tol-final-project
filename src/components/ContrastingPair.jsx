// Phase 1 — Contrasting Pair (Observe)
// Displays a real photo and an AI-generated photo side by side.
//
// Two-stage submit pattern:
//   Stage 1 — Observation submit (under the textarea):
//     Enabled once the learner writes anything. On click, locks the textarea
//     and shows exercise.differencesFeedback as a callout (no right/wrong
//     judgment — same feedback for all responses).
//   Stage 2 — Main submit (under Photo A / Photo B):
//     Enabled only after stage 1 is complete AND a photo has been selected.
//     Clicking advances to Phase 2.
//
// locked: true when Phase 2 feedback is showing — freezes all inputs so the
// learner can still see their Phase 1 answers but can no longer change them.

import { useState } from 'react'
import { trackEvent } from '../utils/tracking'

// initialSnapshot: when the component remounts in 'confirm' phase (locked), App passes
// the snapshot saved at submit time so the learner's answers are preserved.
export default function ContrastingPair({ exercise, roundNumber, onSubmit, onObservationSubmit, locked = false, initialSnapshot = null }) {
  const [selectedImage, setSelectedImage] = useState(initialSnapshot?.selectedImage ?? null)
  const [observation, setObservation] = useState(initialSnapshot?.observation ?? '')
  const [observationSubmitted, setObservationSubmitted] = useState(initialSnapshot?.observationSubmitted ?? false)

  // Randomize AI-image position once at mount. If restoring from a snapshot (locked
  // Phase 2 re-mount), reuse the saved value so the order stays the same.
  const [aiLeft] = useState(() => initialSnapshot?.aiLeft ?? Math.random() < 0.5)

  // photos[0] = Photo A, photos[1] = Photo B
  const photos = aiLeft
    ? [{ src: exercise.aiImage, label: 'Photo A' }, { src: exercise.realImage, label: 'Photo B' }]
    : [{ src: exercise.realImage, label: 'Photo A' }, { src: exercise.aiImage, label: 'Photo B' }]

  const canSubmitObservation = observation.trim().length > 0 && !observationSubmitted
  const canSubmitMain = observationSubmitted && selectedImage !== null

  function handleObservationSubmit() {
    if (!canSubmitObservation) return
    setObservationSubmitted(true)
    onObservationSubmit?.()
    trackEvent({
      roundNumber,
      phaseNumber: 1,
      eventType: 'observation_submitted',
      elementId: 'observation_field',
      value: observation.trim(),
    })
  }

  function handleMainSubmit() {
    if (!canSubmitMain) return
    trackEvent({
      roundNumber,
      phaseNumber: 1,
      eventType: 'button_clicked',
      elementId: 'phase1_main_submit_button',
      value: { selectedImage, isAI: selectedImage === exercise.aiImage },
    })
    onSubmit(selectedImage, observation.trim(), aiLeft)
  }

  return (
    <div className="space-y-6">
      {/* Unified prompt */}
      <p className="text-lg font-medium text-gray-800">{exercise.comparePrompt}</p>

      {/* Side-by-side images — display only, not clickable */}
      <div className="grid grid-cols-2 gap-4">
        {photos.map(({ src, label }) => (
          <div key={src} className="space-y-2">
            <p className="text-sm font-medium text-gray-600">{label}</p>
            <img
              src={src}
              alt={label}
              // Fixed height so both images sit at the same size regardless of aspect ratio
              className="w-full h-72 object-cover rounded-lg border border-gray-200"
            />
          </div>
        ))}
      </div>

      {/* Observation text input + Stage 1 submit */}
      <div className="space-y-2">
        <label htmlFor="observation" className="block text-sm font-medium text-gray-700">
          What differences do you notice?
        </label>
        <textarea
          id="observation"
          value={observation}
          onChange={(e) => setObservation(e.target.value)}
          placeholder="Describe what looks different between the two images..."
          rows={3}
          // Locked by parent (Phase 2 showing) OR by stage-1 submit
          disabled={locked || observationSubmitted}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none disabled:bg-gray-50 disabled:text-gray-500"
        />

        {/* Stage 1 submit — hidden once locked (Phase 2 showing) */}
        {!locked && (
          <button
            type="button"
            onClick={() => {
              trackEvent({ roundNumber, phaseNumber: 1, eventType: 'button_clicked', elementId: 'observation_submit_button', value: null })
              handleObservationSubmit()
            }}
            disabled={!canSubmitObservation}
            className={[
              'px-5 py-2 rounded-lg text-sm font-semibold transition-colors',
              canSubmitObservation
                ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed',
            ].join(' ')}
          >
            Submit
          </button>
        )}

        {/* Differences feedback callout — appears after stage 1 submit */}
        {observationSubmitted && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 leading-relaxed">
            {exercise.differencesFeedback}
          </div>
        )}
      </div>

      {/* Photo A / Photo B selection */}
      <div className="space-y-2">
        <p className="block text-sm font-medium text-gray-700">
          Select the photo that you think is AI-generated:
        </p>
        <div className="flex gap-3">
          {photos.map(({ label, src }) => {
            const isSelected = selectedImage === src
            return (
              <button
                key={src}
                type="button"
                onClick={() => {
                  if (locked) return
                  setSelectedImage(src)
                  trackEvent({
                    roundNumber,
                    phaseNumber: 1,
                    eventType: 'photo_selected',
                    elementId: label,
                    value: { label, isAI: src === exercise.aiImage },
                  })
                }}
                disabled={locked}
                aria-pressed={isSelected}
                className={[
                  'px-5 py-2 rounded-lg border-2 text-sm font-semibold transition-colors focus:outline-none',
                  isSelected
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-white text-gray-700',
                  locked ? 'cursor-default opacity-75' : 'hover:border-gray-400 cursor-pointer',
                ].join(' ')}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Stage 2 (main) submit — hidden once locked; requires stage 1 done + photo selected */}
      {!locked && (
        <button
          type="button"
          onClick={handleMainSubmit}
          disabled={!canSubmitMain}
          className={[
            'px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors',
            canSubmitMain
              ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed',
          ].join(' ')}
        >
          Submit
        </button>
      )}
    </div>
  )
}
