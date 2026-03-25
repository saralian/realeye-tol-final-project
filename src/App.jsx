import { useState, useEffect } from 'react'
import exercises from './data/exercises'
import { downloadSessionData, trackEvent, setUserId } from './utils/tracking'
import ProgressBar from './components/ProgressBar'
import ContrastingPair from './components/ContrastingPair'
import VerdictFeedback from './components/VerdictFeedback'
import HotspotTask from './components/HotspotTask'

// Valid phase values
// "observe"  → Phase 1: Contrasting Pair side-by-side comparison
// "confirm"  → Phase 2: Verdict Feedback (correct/incorrect)
// "analyze"  → Phase 3: Hotspot Annotation Task
// "feedback" → Phase 3 post-submit: full hotspot reveal with explanations

export default function App() {
  const [started, setStarted] = useState(false)               // false = landing page
  const [currentRound, setCurrentRound] = useState(0)        // 0-indexed (0–2)
  const [currentPhase, setCurrentPhase] = useState('observe') // see valid values above
  const [done, setDone] = useState(false)                     // true after all 3 rounds finish

  // Tracks the learner's Phase 1 image selection result so Phase 2 can show correct/incorrect
  const [wasCorrect, setWasCorrect] = useState(null)

  // True once the learner submits their observation text (stage 1 of Phase 1).
  // Used only to advance the ProgressBar label to "Phase 2: Confirm" early —
  // the actual currentPhase stays 'observe' until the main submit.
  const [obsSubmitted, setObsSubmitted] = useState(false)

  // Snapshot of Phase 1 inputs — saved on main submit so the locked ContrastingPair
  // in 'confirm' phase can display the learner's answers (new component instance = fresh state)
  const [phase1Snapshot, setPhase1Snapshot] = useState(null)

  // Tracks the learner's Phase 3 annotations for the feedback phase.
  // annotations: keyed by hotspot id (glow/none); empty for checklist.
  // lockedFreePins: user-placed free pins from checklist mode; empty for glow/none.
  const [annotations, setAnnotations] = useState({})
  const [lockedFreePins, setLockedFreePins] = useState([])

  // --- Auth state ---
  const [userId, setUserIdState] = useState(null)   // null = logged out
  const [showLoginScreen, setShowLoginScreen] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const exercise = exercises[currentRound]

  // Ctrl+Shift+Alt+D — hidden shortcut to download session data for analysis
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.ctrlKey && e.shiftKey && e.altKey && e.key === 'D') downloadSessionData()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // --- Auth handlers ---

  function handleLogin(id) {
    setUserIdState(id)
    setUserId(id)
    setShowLoginScreen(false)
    trackEvent({ roundNumber: null, phaseNumber: null, eventType: 'user_logged_in', elementId: 'login_button', value: { userId: id } })
  }

  function handleLogoutConfirmed() {
    trackEvent({ roundNumber: null, phaseNumber: null, eventType: 'user_logged_out', elementId: 'logout_confirm_button', value: { userId } })
    setUserIdState(null)
    setUserId(null)
    setShowLogoutConfirm(false)
    handleHome()
  }

  // --- Phase transition handlers ---

  // Called by ContrastingPair when learner submits Phase 1.
  // selectedImage: the image path the learner clicked as "AI-generated"
  // observationText: the free-text observation (validated non-empty by ContrastingPair)
  function handlePhase1Submit(selectedImage, observationText, aiLeft) {
    const correct = selectedImage === exercise.aiImage
    setWasCorrect(correct)
    setPhase1Snapshot({ observation: observationText, selectedImage, observationSubmitted: true, aiLeft })
    setCurrentPhase('confirm')
  }

  // Called by VerdictFeedback when learner clicks "Continue" in Phase 2.
  function handlePhase2Continue() {
    setCurrentPhase('analyze')
  }

  // Called by HotspotTask when learner submits their Phase 3 annotations.
  // newAnnotations: { [hotspotId]: text } for glow/none; {} for checklist.
  // newFreePins: array of { id, x, y, text } for checklist; [] for glow/none.
  function handlePhase3Submit(newAnnotations, newFreePins = []) {
    setAnnotations(newAnnotations)
    setLockedFreePins(newFreePins)
    setCurrentPhase('feedback')
  }

  // Resets all state and returns to the landing page.
  function handleHome() {
    setStarted(false)
    setDone(false)
    setCurrentRound(0)
    setCurrentPhase('observe')
    setWasCorrect(null)
    setObsSubmitted(false)
    setAnnotations({})
    setLockedFreePins([])
    setPhase1Snapshot(null)
  }

  // Goes back one step. From the first phase of any round, returns to the landing page.
  // State is preserved wherever possible:
  //   feedback → analyze: HotspotTask stays mounted (same component instance) so local
  //     annotation state survives automatically.
  //   confirm → observe: ContrastingPair remounts, but phase1Snapshot is passed as
  //     initialSnapshot so the learner's previous answers are restored.
  //   observe → landing: full reset (the learner is back at the start).
  function handleBack() {
    if (done) { setDone(false); return }
    switch (currentPhase) {
      case 'feedback': setCurrentPhase('analyze'); break
      case 'analyze':  setCurrentPhase('confirm'); break
      case 'confirm':
        // Restore obsSubmitted so the ProgressBar shows "Phase 2" if the learner
        // had already submitted their observation before going back.
        setObsSubmitted(phase1Snapshot?.observationSubmitted ?? false)
        setCurrentPhase('observe')
        break
      case 'observe':  handleHome(); break
      default: break
    }
  }

  // Called by FeedbackPanel when learner clicks "Next Round" or "Finish".
  function handleNextRound() {
    if (currentRound < exercises.length - 1) {
      setCurrentRound(r => r + 1)
      setCurrentPhase('observe')
      setWasCorrect(null)
      setObsSubmitted(false)
      setAnnotations({})
      setLockedFreePins([])
      setPhase1Snapshot(null)
    } else {
      setDone(true)
    }
  }

  // Shared Login/Logout button renderer — used on landing and completion screens
  function renderAuthButton(className = '') {
    return (
      <button
        type="button"
        onClick={() => userId ? setShowLogoutConfirm(true) : setShowLoginScreen(true)}
        className={['px-4 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 text-xs font-medium hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap', className].join(' ').trim()}
      >
        {userId ? `Logout (${userId})` : 'Login'}
      </button>
    )
  }

  // Render the active phase component
  function renderPhase() {
    switch (currentPhase) {
      case 'observe':
        return (
          <ContrastingPair
            exercise={exercise}
            roundNumber={currentRound + 1}
            onSubmit={handlePhase1Submit}
            onObservationSubmit={() => setObsSubmitted(true)}
            initialSnapshot={phase1Snapshot}
          />
        )
      case 'confirm':
        // Phase 1 stays visible but locked; feedback renders inline below it.
        // phase1Snapshot restores the learner's answers into the new component instance.
        return (
          <div className="space-y-6">
            <ContrastingPair
              exercise={exercise}
              roundNumber={currentRound + 1}
              onSubmit={handlePhase1Submit}
              locked
              initialSnapshot={phase1Snapshot}
            />
            <VerdictFeedback
              wasCorrect={wasCorrect}
              feedbackCorrect={exercise.feedbackCorrect}
              feedbackIncorrect={exercise.feedbackIncorrect}
              onContinue={handlePhase2Continue}
              roundNumber={currentRound + 1}
            />
          </div>
        )
      case 'analyze':
        return (
          <HotspotTask
            exercise={exercise}
            roundNumber={currentRound + 1}
            scaffoldLevel={exercise.scaffoldLevel}
            onSubmit={handlePhase3Submit}
          />
        )
      case 'feedback':
        return (
          <HotspotTask
            exercise={exercise}
            roundNumber={currentRound + 1}
            scaffoldLevel={exercise.scaffoldLevel}
            onSubmit={handlePhase3Submit}
            locked
            lockedAnnotations={annotations}
            lockedFreePins={lockedFreePins}
            isLastRound={currentRound === exercises.length - 1}
            onNext={handleNextRound}
          />
        )
      default:
        return null
    }
  }

  // Login screen — full-page, shown when the Login button is clicked
  if (showLoginScreen) {
    return <LoginScreen onLogin={handleLogin} onCancel={() => setShowLoginScreen(false)} />
  }

  // Landing page — shown before the learner starts
  if (!started) {
    return (
      <div className="min-h-screen bg-white text-gray-900 flex flex-col">
        {/* Top bar — Login/Logout in top right */}
        <div className="flex items-center justify-end px-4 py-3 bg-gray-100 border-b border-gray-200">
          {renderAuthButton()}
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="max-w-md text-center space-y-4 px-4">
            <h1 className="text-4xl font-bold text-gray-900 tracking-tight">RealEye</h1>
            <p className="text-sm font-medium text-gray-400 uppercase tracking-widest">
              AI Image Detection Training
            </p>
            <p className="text-gray-600">
              AI-generated images are getting harder to spot. RealEye trains your eye to
              detect the subtle visual artifacts that give them away.
            </p>
            <p className="text-gray-600">
              Work through three rounds of exercises — comparing real and AI-generated photos,
              identifying tells, and analyzing what makes each image suspicious — with
              progressively less guidance each round.
            </p>
            <button
              type="button"
              disabled={!userId}
              onClick={() => {
                trackEvent({ roundNumber: null, phaseNumber: null, eventType: 'button_clicked', elementId: 'start_training_button', value: null })
                setStarted(true)
              }}
              className={[
                'px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors',
                userId
                  ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed',
              ].join(' ')}
            >
              Start Training
            </button>
            {!userId && (
              <p className="text-xs text-gray-400">Please log in to begin.</p>
            )}

            <hr className="border-gray-200" />

            <p className="text-xs font-medium text-gray-400">
              Skip to specific round (different scaffolding levels):
            </p>
            <div className="flex justify-center gap-2 flex-wrap">
              {[
                { label: 'Round 1: Hotspots', index: 0 },
                { label: 'Round 2: Checklist', index: 1 },
                { label: 'Round 3: None', index: 2 },
              ].map(({ label, index }) => (
                <button
                  key={index}
                  type="button"
                  disabled={!userId}
                  onClick={() => {
                    trackEvent({ roundNumber: index + 1, phaseNumber: null, eventType: 'button_clicked', elementId: 'skip_to_round_button', value: { label } })
                    setCurrentRound(index)
                    setCurrentPhase('observe')
                    setWasCorrect(null)
                    setObsSubmitted(false)
                    setAnnotations({})
                    setLockedFreePins([])
                    setPhase1Snapshot(null)
                    setDone(false)
                    setStarted(true)
                  }}
                  className={[
                    'px-4 py-2 rounded-lg border text-xs font-medium transition-colors',
                    userId
                      ? 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 cursor-pointer'
                      : 'border-gray-200 bg-white text-gray-300 cursor-not-allowed',
                  ].join(' ')}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Completion screen — shown after the learner finishes all three rounds
  if (done) {
    return (
      <div className="min-h-screen bg-white text-gray-900 flex flex-col">
        <div className="flex items-center justify-end gap-2 px-4 py-3 bg-gray-100 border-b border-gray-200">
          <button
            type="button"
            onClick={() => {
              trackEvent({ roundNumber: null, phaseNumber: null, eventType: 'button_clicked', elementId: 'completion_back_button', value: null })
              handleBack()
            }}
            className="px-4 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors cursor-pointer whitespace-nowrap"
          >
            ← Back
          </button>
          <button
            type="button"
            onClick={() => {
              trackEvent({ roundNumber: null, phaseNumber: null, eventType: 'button_clicked', elementId: 'completion_home_button', value: null })
              handleHome()
            }}
            className="px-4 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors cursor-pointer whitespace-nowrap"
          >
            Return to Homepage
          </button>
          {renderAuthButton()}
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="max-w-md text-center space-y-4 px-4">
            <div className="text-5xl" aria-hidden="true">🎉</div>
            <h1 className="text-2xl font-bold text-gray-900">You've completed all three rounds!</h1>
            <p className="text-gray-600">
              You've practiced spotting AI-generated images across three different exercises,
              with progressively less guidance. You're building a real detection toolkit.
            </p>
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  trackEvent({ roundNumber: null, phaseNumber: null, eventType: 'button_clicked', elementId: 'start_over_button', value: null })
                  setDone(false)
                  setCurrentRound(0)
                  setCurrentPhase('observe')
                  setWasCorrect(null)
                  setAnnotations({})
                }}
                className="px-6 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors cursor-pointer"
              >
                Start over
              </button>
              <button
                type="button"
                onClick={() => {
                  trackEvent({ roundNumber: null, phaseNumber: null, eventType: 'button_clicked', elementId: 'download_data_button', value: null })
                  downloadSessionData()
                }}
                className="px-6 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors cursor-pointer"
              >
                Download Data
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <ProgressBar
        currentRound={currentRound}
        currentPhase={currentPhase === 'observe' && obsSubmitted ? 'confirm' : currentPhase}
        onBack={() => {
          trackEvent({ roundNumber: currentRound + 1, phaseNumber: null, eventType: 'button_clicked', elementId: 'back_button', value: { fromPhase: currentPhase } })
          handleBack()
        }}
        onHome={() => {
          trackEvent({ roundNumber: currentRound + 1, phaseNumber: null, eventType: 'button_clicked', elementId: 'home_button', value: { fromPhase: currentPhase } })
          handleHome()
        }}
        userId={userId}
        onAuthClick={() => userId ? setShowLogoutConfirm(true) : setShowLoginScreen(true)}
      />
      <main className="max-w-5xl mx-auto px-4 py-8">
        {renderPhase()}
      </main>

      {/* Logout confirmation overlay */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 space-y-4">
            <p className="text-sm text-gray-800 text-center leading-relaxed">
              Are you sure you want to log out? Your progress will not be saved.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors cursor-pointer"
              >
                No, return to page
              </button>
              <button
                type="button"
                onClick={handleLogoutConfirmed}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors cursor-pointer"
              >
                Yes, log me out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Login screen — standalone full-page form
function LoginScreen({ onLogin, onCancel }) {
  const [inputValue, setInputValue] = useState('')

  function handleSubmit() {
    const id = inputValue.trim()
    if (!id) return
    onLogin(id)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleSubmit()
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 flex items-center justify-center">
      <div className="max-w-sm w-full px-4 space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-gray-900">Log in</h1>
          <p className="text-sm text-gray-500">Your ID will be attached to all session data.</p>
        </div>
        <div className="space-y-2">
          <label htmlFor="userId" className="block text-sm font-medium text-gray-700">
            Enter userID (make one up):
          </label>
          <input
            id="userId"
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. participant_04"
            autoFocus
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
          />
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!inputValue.trim()}
            className={[
              'px-5 py-2 rounded-lg text-sm font-semibold transition-colors',
              inputValue.trim()
                ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed',
            ].join(' ')}
          >
            Login
          </button>
        </div>
      </div>
    </div>
  )
}
