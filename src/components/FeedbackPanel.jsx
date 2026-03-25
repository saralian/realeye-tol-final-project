// Post-submission feedback screen shown after Phase 3.
// Reveals ALL hotspot regions on the AI image (including ones the learner missed),
// each with a numbered pin, artifact label, and explanation.
// This is the FIRST place in the entire exercise where artifact principles are named —
// the learner has already attempted discovery, so naming the principles now reinforces
// rather than short-circuits the learning.
// Also recaps the Phase 1 verdict (wasCorrect).
// "Next Round" advances to the next exercise; "Finish" appears on the final round.

export default function FeedbackPanel({ exercise, annotations, wasCorrect, onNext, isLastRound }) {
  return (
    <div className="space-y-8">

      {/* Phase 1 verdict recap */}
      <div className={[
        'flex items-start gap-3 rounded-lg p-4 border',
        wasCorrect
          ? 'bg-green-50 border-green-200 text-green-900'
          : 'bg-amber-50 border-amber-200 text-amber-900',
      ].join(' ')}>
        <span className="text-xl leading-none mt-0.5" aria-hidden="true">
          {wasCorrect ? '✓' : '→'}
        </span>
        <p className="text-base">
          {wasCorrect
            ? 'You correctly identified the AI-generated photo in Round 1.'
            : 'You selected the wrong photo in Round 1 — but you still analyzed the right image.'}
        </p>
      </div>

      {/* AI image with all hotspot pins revealed */}
      <div>
        <h2 className="text-base font-semibold text-gray-800 mb-3">
          Here's what gave it away:
        </h2>
        {/* position:relative so numbered pins can be absolutely positioned using % coords */}
        <div className="relative inline-block w-full">
          <img
            src={exercise.aiImage}
            alt="AI-generated image with all artifact regions revealed"
            className="w-full rounded-lg"
          />
          {/* Numbered pins — same % positioning math as HotspotMarker */}
          {exercise.hotspots.map((hotspot, i) => {
            const wasFound = annotations[hotspot.id] != null
            return (
              <div
                key={hotspot.id}
                className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
                style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%` }}
              >
                <div className={[
                  'w-7 h-7 rounded-full border-2 border-white shadow-md',
                  'flex items-center justify-center text-xs font-bold text-white',
                  wasFound ? 'bg-green-500' : 'bg-red-400',
                ].join(' ')}>
                  {i + 1}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Hotspot explanations — principles named here for the first time */}
      <div className="space-y-3">
        {exercise.hotspots.map((hotspot, i) => {
          const wasFound = annotations[hotspot.id] != null
          return (
            <div
              key={hotspot.id}
              className={[
                'rounded-lg border p-4 space-y-1',
                wasFound ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50',
              ].join(' ')}
            >
              <div className="flex items-center gap-2">
                {/* Numbered badge matching the pin on the image */}
                <span className={[
                  'w-5 h-5 rounded-full text-white text-xs shrink-0',
                  'flex items-center justify-center font-bold',
                  wasFound ? 'bg-green-500' : 'bg-red-400',
                ].join(' ')}>
                  {i + 1}
                </span>
                <span className="text-sm font-semibold text-gray-800">{hotspot.label}</span>
                <span className={[
                  'text-xs font-medium ml-auto',
                  wasFound ? 'text-green-600' : 'text-gray-400',
                ].join(' ')}>
                  {wasFound ? 'You found this' : 'Missed'}
                </span>
              </div>
              {/* Explanation — first time this principle is named */}
              <p className="text-sm text-gray-700 pl-7">{hotspot.explanation}</p>
              {/* Show the learner's own note if they annotated this hotspot */}
              {wasFound && (
                <p className="text-xs text-gray-500 pl-7 italic">
                  Your note: "{annotations[hotspot.id]}"
                </p>
              )}
            </div>
          )
        })}
      </div>

      <button
        type="button"
        onClick={onNext}
        className="px-6 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors cursor-pointer"
      >
        {isLastRound ? 'Finish' : 'Next Round →'}
      </button>
    </div>
  )
}
