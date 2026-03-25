// Phase 3 — Hotspot Annotation Task (Analyze)
// Displays exercise.aiImage and manages the annotation interaction.
//
// Free-pin modes (scaffoldLevel "checklist" | "none"):
//   The learner clicks anywhere on the image to place pins and annotate them.
//   On submit, each pin is matched to the nearest predefined hotspot within
//   PIN_MATCH_THRESHOLD percent distance (greedy closest-pair matching).
//   Matched pins → green ✓ dot + merged card (label + annotation + explanation).
//   Unmatched pins → blue ✓ dot + annotation-only card (neutral, blue border).
//   Unmatched hotspots → red ! dot + card (label + explanation, no annotation).
//   "checklist" also shows a ChecklistPanel sidebar both before and after submit.
//
// Predefined-hotspot mode (scaffoldLevel "glow"):
//   Pre-positioned hotspot regions pulse to guide the learner. Cards and dots
//   are green (annotated) or red (missed) based on whether the learner clicked.
//
// Card positioning (smart layout):
//   All feedback cards are rendered here (not in HotspotMarker/FreePinMarker)
//   so they can be positioned relative to the image container without overlap.
//   Default: centered below the dot. On overlap: tries right, left, above, corners.
//   Never overlaps the dot exclusion zone. Runs on locked/annotation/pin changes
//   and container resize. Uses refs for stale-closure safety.
//
// SVG connector lines:
//   A z-15 SVG overlay draws a dashed line from each dot center to its card edge.
//   Color matches card accent (green, blue, or red).
//
// Bring-to-front: clicking a card raises its z-index above all others.

import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import HotspotMarker from './HotspotMarker'
import FreePinMarker from './FreePinMarker'
import ChecklistPanel from './ChecklistPanel'
import { trackEvent } from '../utils/tracking'

// Minimum Euclidean distance (in % of image dimensions) for a free pin to
// count as "matching" a predefined hotspot location.
const PIN_MATCH_THRESHOLD = 15

// Greedy closest-pair matching between free pins and predefined hotspots.
// Returns:
//   hotspotMatches: { [hotspotId]: pinId }  — hotspot → its matched pin (if any)
//   pinMatches:     { [pinId]: hotspotId }  — pin → its matched hotspot (if any)
function computePinMatches(pins, hotspots) {
  const pairs = []
  for (const hotspot of hotspots) {
    for (const pin of pins) {
      if (!pin.text.length) continue
      const dx = pin.x - hotspot.x
      const dy = pin.y - hotspot.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist <= PIN_MATCH_THRESHOLD) {
        pairs.push({ hotspotId: hotspot.id, pinId: pin.id, dist })
      }
    }
  }
  pairs.sort((a, b) => a.dist - b.dist)

  const hotspotMatches = {}
  const pinMatches = {}
  const matchedHotspots = new Set()
  const matchedPins = new Set()

  for (const { hotspotId, pinId } of pairs) {
    if (!matchedHotspots.has(hotspotId) && !matchedPins.has(pinId)) {
      hotspotMatches[hotspotId] = pinId
      pinMatches[pinId] = hotspotId
      matchedHotspots.add(hotspotId)
      matchedPins.add(pinId)
    }
  }

  return { hotspotMatches, pinMatches }
}

// Returns the point on the border of rect (rx, ry, rw, rh) that lies on the
// line from the rect's center toward external point (px, py).
function cardEdgePoint(rx, ry, rw, rh, px, py) {
  const cx = rx + rw / 2
  const cy = ry + rh / 2
  const dx = px - cx
  const dy = py - cy
  if (!dx && !dy) return { x: cx, y: cy }
  const tx = dx ? Math.abs(rw / 2 / dx) : Infinity
  const ty = dy ? Math.abs(rh / 2 / dy) : Infinity
  const t = Math.min(tx, ty)
  return { x: cx + t * dx, y: cy + t * dy }
}

function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by
}

export default function HotspotTask({
  exercise,
  roundNumber,
  scaffoldLevel,
  onSubmit,
  locked = false,
  lockedAnnotations = {},
  lockedFreePins = [],
  isLastRound = false,
  onNext,
}) {
  // --- Annotation state (glow mode) ---
  const [annotations, setAnnotations] = useState({})

  // --- Free-pin state (checklist / none modes) ---
  const [freePins, setFreePins] = useState([])
  const [openPinId, setOpenPinId] = useState(null)

  // --- Revealed hotspots state (checklist / none modes) ---
  // Tracks which artifact type labels have been revealed via hint icons (checklist)
  // or the "Reveal Hotspots" button (none). Revealed hotspots behave like glow-mode hotspots.
  const [revealedArtifactTypes, setRevealedArtifactTypes] = useState(new Set())

  // --- Progressive hint state (none mode only) ---
  // 0 = no hint shown, 1 = level-1 callout visible, 2 = both callouts visible
  const [hintLevel, setHintLevel] = useState(0)

  // --- Smart card positioning state ---
  const containerRef = useRef(null)
  const cardRefs = useRef({})
  const [cardPositions, setCardPositions] = useState({})
  const maxZRef = useRef(20)
  const [cardZIndices, setCardZIndices] = useState({})

  // Stale-closure-safe refs — updated every render so the ResizeObserver callback
  // (set up once with empty deps) always reads the latest values.
  const lockedRef = useRef(locked)
  const annotationsRef = useRef(annotations)
  const lockedAnnotationsRef = useRef(lockedAnnotations)
  const exerciseRef = useRef(exercise)
  const scaffoldLevelRef = useRef(scaffoldLevel)
  const freePinsRef = useRef(freePins)
  const lockedFreePinsRef = useRef(lockedFreePins)
  const revealedArtifactTypesRef = useRef(revealedArtifactTypes)
  lockedRef.current = locked
  annotationsRef.current = annotations
  lockedAnnotationsRef.current = lockedAnnotations
  exerciseRef.current = exercise
  scaffoldLevelRef.current = scaffoldLevel
  freePinsRef.current = freePins
  lockedFreePinsRef.current = lockedFreePins
  revealedArtifactTypesRef.current = revealedArtifactTypes

  // --- Derived ---
  // isFreePin: both "checklist" and "none" use free-placed pins.
  // isChecklist: only "checklist" shows the side panel.
  // isNone: only "none" shows the progressive hint button.
  const isFreePin = scaffoldLevel !== 'glow'
  const isChecklist = scaffoldLevel === 'checklist'
  const isNone = scaffoldLevel === 'none'
  const displayAnnotations = locked ? lockedAnnotations : annotations

  // Level-1 hint: artifact types formatted as a sentence.
  const level1Hint = (() => {
    const types = exercise.artifactTypes.map(t => t.toLowerCase())
    if (!types.length) return ''
    if (types.length === 1) return `Look for issues with ${types[0]} in this image.`
    const last = types[types.length - 1]
    const rest = types.slice(0, -1).join(', ')
    return `Look for issues with ${rest}, and ${last} in this image.`
  })()

  // True once the "Reveal Hotspots" button has been clicked in none mode.
  const allHotspotsRevealed = isNone && exercise.artifactTypes.every(t => revealedArtifactTypes.has(t))

  // Pin-match results — computed once per render when locked freePin feedback is shown.
  const pinMatchData = (isFreePin && locked)
    ? computePinMatches(lockedFreePins, exercise.hotspots)
    : null

  // ─── Free-pin handlers ────────────────────────────────────────────────────────

  function closePinPopup(id) {
    setOpenPinId(null)
    setFreePins(prev => prev.filter(p => p.id !== id || p.text.length > 0))
  }

  // Document mousedown listener: closes popup for clicks outside the popup/dot,
  // preventing a new pin from being placed on the same click.
  useEffect(() => {
    if (!openPinId) return
    function handleOutsideMouseDown(e) {
      if (
        !e.target.closest('[data-free-pin-popup]') &&
        !e.target.closest('[data-free-pin-dot]')
      ) {
        setOpenPinId(null)
        setFreePins(prev => prev.filter(p => p.id !== openPinId || p.text.length > 0))
      }
    }
    document.addEventListener('mousedown', handleOutsideMouseDown)
    return () => document.removeEventListener('mousedown', handleOutsideMouseDown)
  }, [openPinId])

  function handleAnnotate(id, text) {
    setAnnotations(prev => ({ ...prev, [id]: text }))
  }

  // Image click: close open popup (without placing a new pin) or place a new pin.
  function handleImageClick(e) {
    if (openPinId !== null) {
      closePinPopup(openPinId)
      return
    }
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    const id = `free-${Date.now()}`
    setFreePins(prev => [...prev, { id, x, y, text: '' }])
    setOpenPinId(id)
  }

  function handlePinToggle(id) {
    if (openPinId !== null && openPinId !== id) closePinPopup(openPinId)
    setOpenPinId(prev => (prev === id ? null : id))
  }

  function handleFreePinAnnotate(id, text) {
    const pin = freePins.find(p => p.id === id)
    setFreePins(prev => prev.map(p => p.id === id ? { ...p, text } : p))
    setOpenPinId(null)
    if (pin) {
      trackEvent({
        roundNumber,
        phaseNumber: 3,
        eventType: 'free_pin_annotation_submitted',
        elementId: id,
        value: { x: Math.round(pin.x), y: Math.round(pin.y), text },
      })
    }
  }

  function handleFreePinCancel(id) { closePinPopup(id) }

  // ─── Smart card positioning ───────────────────────────────────────────────────

  function computeCardPositions() {
    const container = containerRef.current
    if (!container) return
    const cw = container.offsetWidth
    const ch = container.offsetHeight
    if (!cw || !ch) return

    const ex = exerciseRef.current
    const isFreePinNow = scaffoldLevelRef.current !== 'glow'
    const isLockedNow = lockedRef.current
    const displayAnns = isLockedNow
      ? lockedAnnotationsRef.current
      : annotationsRef.current

    // DOT_RADIUS: half the width/height of the w-8 (32px) dot button.
    // GAP: minimum clear space between a dot's edge and the nearest card edge.
    const DOT_RADIUS = 16
    const GAP = 8
    const placed = []
    const newPositions = {}

    // For free-pin locked mode, compute matches once and reuse for both
    // the items list and the allDots list below.
    let matchDataForLocked = null
    if (isFreePinNow && isLockedNow) {
      matchDataForLocked = computePinMatches(lockedFreePinsRef.current, ex.hotspots)
    }

    // Build the list of items to position (only items that have visible cards).
    let items
    if (isFreePinNow && isLockedNow) {
      items = [
        ...lockedFreePinsRef.current.map(pin => ({ id: pin.id, x: pin.x, y: pin.y })),
        ...ex.hotspots
          .filter(h => !matchDataForLocked.hotspotMatches[h.id])
          .map(h => ({ id: h.id, x: h.x, y: h.y })),
      ]
    } else if (isFreePinNow) {
      const revealedHotspots = ex.hotspots.filter(h => revealedArtifactTypesRef.current.has(h.label))
      items = [
        ...freePinsRef.current
          .filter(pin => pin.text.length > 0)
          .map(pin => ({ id: pin.id, x: pin.x, y: pin.y })),
        ...revealedHotspots
          .filter(h => !!annotationsRef.current[h.id]?.length)
          .map(h => ({ id: h.id, x: h.x, y: h.y })),
      ]
    } else {
      items = ex.hotspots
        .filter(hotspot => isLockedNow || !!(displayAnns[hotspot.id]?.length))
        .map(hotspot => ({ id: hotspot.id, x: hotspot.x, y: hotspot.y }))
    }

    // Build the complete set of all visible dot positions — including dots that
    // have no card (e.g. unannotated pins, unannotated hotspots in glow mode).
    // Cards must not overlap ANY dot, not just their own.
    let allDots
    if (isFreePinNow && isLockedNow) {
      // Locked free-pin: all pin dots + unmatched hotspot dots (same as items)
      allDots = [
        ...lockedFreePinsRef.current.map(p => ({ x: p.x, y: p.y })),
        ...ex.hotspots
          .filter(h => !matchDataForLocked.hotspotMatches[h.id])
          .map(h => ({ x: h.x, y: h.y })),
      ]
    } else if (isFreePinNow) {
      // Unlocked free-pin: every placed pin has a dot + any revealed hotspot dots
      const revealedHotspots = ex.hotspots.filter(h => revealedArtifactTypesRef.current.has(h.label))
      allDots = [
        ...freePinsRef.current.map(p => ({ x: p.x, y: p.y })),
        ...revealedHotspots.map(h => ({ x: h.x, y: h.y })),
      ]
    } else {
      // Glow mode: every predefined hotspot has a dot (locked or not)
      allDots = ex.hotspots.map(h => ({ x: h.x, y: h.y }))
    }

    // Pre-compute dot exclusion zones in px (dot bbox + GAP on all sides).
    // positionIsClean checks every candidate card position against all of these,
    // so a card can never land on top of any dot regardless of ownership.
    const dotExclusionZones = allDots.map(dot => {
      const dx = (dot.x / 100) * cw
      const dy = (dot.y / 100) * ch
      return {
        x: dx - DOT_RADIUS - GAP,
        y: dy - DOT_RADIUS - GAP,
        w: (DOT_RADIUS + GAP) * 2,
        h: (DOT_RADIUS + GAP) * 2,
      }
    })

    for (const item of items) {
      const cardEl = cardRefs.current[item.id]
      if (!cardEl) continue
      const cardW = cardEl.offsetWidth
      const cardH = cardEl.offsetHeight
      if (!cardW || !cardH) continue

      const hx = (item.x / 100) * cw
      const hy = (item.y / 100) * ch

      // True when (x, y) for this card is clear of every dot exclusion zone
      // and every already-placed card.
      function positionIsClean(x, y) {
        for (const zone of dotExclusionZones) {
          if (rectsOverlap(x, y, cardW, cardH, zone.x, zone.y, zone.w, zone.h)) return false
        }
        return placed.every(p => !rectsOverlap(x, y, cardW, cardH, p.x, p.y, p.w, p.h))
      }

      // Default: centered below the item's own dot.
      const defaultX = Math.max(0, Math.min(cw - cardW, hx - cardW / 2))
      const defaultY = Math.max(0, Math.min(ch - cardH, hy + DOT_RADIUS + GAP))

      let finalPos

      if (positionIsClean(defaultX, defaultY)) {
        finalPos = { x: defaultX, y: defaultY }
      } else {
        const alternatives = [
          { x: hx + DOT_RADIUS + GAP,              y: hy - cardH / 2              }, // right
          { x: hx - DOT_RADIUS - GAP - cardW,      y: hy - cardH / 2              }, // left
          { x: hx - cardW / 2,                     y: hy - DOT_RADIUS - GAP - cardH }, // above
          { x: hx + DOT_RADIUS + GAP,              y: hy + DOT_RADIUS + GAP       }, // below-right
          { x: hx - DOT_RADIUS - GAP - cardW,      y: hy + DOT_RADIUS + GAP       }, // below-left
          { x: hx + DOT_RADIUS + GAP,              y: hy - DOT_RADIUS - GAP - cardH }, // above-right
          { x: hx - DOT_RADIUS - GAP - cardW,      y: hy - DOT_RADIUS - GAP - cardH }, // above-left
        ]

        finalPos = null
        for (const alt of alternatives) {
          const x = Math.max(0, Math.min(cw - cardW, alt.x))
          const y = Math.max(0, Math.min(ch - cardH, alt.y))
          if (positionIsClean(x, y)) {
            finalPos = { x, y }
            break
          }
        }

        // Last resort: keep the default below position. Overlapping another card
        // is less disruptive than overlapping a dot.
        if (!finalPos) finalPos = { x: defaultX, y: defaultY }
      }

      if (finalPos) {
        newPositions[item.id] = finalPos
        placed.push({ x: finalPos.x, y: finalPos.y, w: cardW, h: cardH })
      }
    }

    setCardPositions(newPositions)
  }

  // Re-position after any DOM update that changes which cards are visible.
  // useLayoutEffect runs synchronously before paint, eliminating position flashes.
  useLayoutEffect(() => {
    computeCardPositions()
  }, [locked, annotations, freePins, revealedArtifactTypes]) // eslint-disable-line react-hooks/exhaustive-deps
  // lockedAnnotations and lockedFreePins deliberately omitted: their default values
  // ({} and []) create new references on every render, which would cause an infinite
  // loop. Both are read via their .current refs inside computeCardPositions.
  // revealedArtifactTypes is safe to include: it only changes on explicit reveal clicks.

  // Re-position on container resize. Empty deps: observer is stable because
  // computeCardPositions reads all changing values through refs.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const ro = new ResizeObserver(computeCardPositions)
    ro.observe(container)
    return () => ro.disconnect()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleCardClick(id) {
    maxZRef.current += 1
    setCardZIndices(prev => ({ ...prev, [id]: maxZRef.current }))
  }

  // ─── Submit ───────────────────────────────────────────────────────────────────

  // In free-pin modes, a revealed-and-annotated hotspot also satisfies the requirement.
  const hasRevealedAnnotation = isFreePin && exercise.hotspots
    .filter(h => revealedArtifactTypes.has(h.label))
    .some(h => annotations[h.id]?.length)

  const canSubmit = isFreePin
    ? freePins.length >= 1 || hasRevealedAnnotation
    : Object.keys(annotations).length >= 1

  function handleSubmit() {
    if (!canSubmit) return
    if (isFreePin) {
      const revealedPseudoPins = exercise.hotspots
        .filter(h => revealedArtifactTypes.has(h.label) && annotations[h.id]?.length)
        .map(h => ({ id: h.id, x: h.x, y: h.y, text: annotations[h.id] }))
      const allPins = [...freePins, ...revealedPseudoPins]
      // Track match result for every pin and every missed hotspot
      const matchData = computePinMatches(allPins, exercise.hotspots)
      allPins.forEach(pin => {
        const matchedHotspotId = matchData.pinMatches[pin.id] ?? null
        const matchedHotspot = matchedHotspotId ? exercise.hotspots.find(h => h.id === matchedHotspotId) : null
        trackEvent({
          roundNumber,
          phaseNumber: 3,
          eventType: 'free_pin_match_result',
          elementId: pin.id,
          value: {
            x: Math.round(pin.x), y: Math.round(pin.y), text: pin.text,
            matched: !!matchedHotspot,
            matchedHotspotId: matchedHotspot?.id ?? null,
            matchedHotspotLabel: matchedHotspot?.label ?? null,
          },
        })
      })
      exercise.hotspots.forEach(h => {
        if (!matchData.hotspotMatches[h.id]) {
          trackEvent({
            roundNumber,
            phaseNumber: 3,
            eventType: 'hotspot_missed',
            elementId: h.id,
            value: { label: h.label },
          })
        }
      })
      onSubmit({}, allPins)
    } else {
      onSubmit(annotations, [])
    }
  }

  // ─── Locked free-pin dot markers ─────────────────────────────────────────────
  // Renders the visual dot icons for the locked freePin feedback state.
  // Free pins that matched a hotspot → green ✓
  // Free pins with no nearby hotspot → blue ✓ (neutral)
  // Predefined hotspots with no matching pin → red ! (missed)

  function renderLockedFreePinMarkers() {
    if (!isFreePin || !locked || !pinMatchData) return null
    const { pinMatches, hotspotMatches } = pinMatchData

    return [
      ...lockedFreePins.map(pin => (
        <div
          key={`dot-pin-${pin.id}`}
          className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
          style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
        >
          <div className={[
            'w-8 h-8 rounded-full border-2 border-white shadow-lg',
            'flex items-center justify-center text-sm font-bold',
            pinMatches[pin.id] ? 'bg-green-500 text-white' : 'bg-blue-500 text-white',
          ].join(' ')}>
            ✓
          </div>
        </div>
      )),
      ...exercise.hotspots
        .filter(h => !hotspotMatches[h.id])
        .map(h => (
          <div
            key={`dot-hotspot-${h.id}`}
            className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
            style={{ left: `${h.x}%`, top: `${h.y}%` }}
          >
            <div className="w-8 h-8 rounded-full border-2 border-white shadow-lg bg-red-400 text-white flex items-center justify-center text-sm font-bold">
              !
            </div>
          </div>
        )),
    ]
  }

  // ─── Card rendering (positioned by algorithm) ─────────────────────────────────

  function makeCardStyle(id, pos, z) {
    return {
      position: 'absolute',
      left: pos ? pos.x : 0,
      top: pos ? pos.y : 0,
      zIndex: z,
      visibility: pos ? 'visible' : 'hidden',
    }
  }

  function renderCards() {
    // Free-pin locked: matched pins get merged cards; unmatched pins get
    // annotation-only cards; unmatched hotspots get red feedback cards.
    if (isFreePin && locked) {
      const { pinMatches, hotspotMatches } = pinMatchData

      const pinCards = lockedFreePins.map(pin => {
        const pos = cardPositions[pin.id]
        const z = cardZIndices[pin.id] || 20
        const elevated = z > 20
        const matchedHotspotId = pinMatches[pin.id]
        const matchedHotspot = matchedHotspotId
          ? exercise.hotspots.find(h => h.id === matchedHotspotId)
          : null

        if (matchedHotspot) {
          // Matched: label (green) + user annotation + explanation
          return (
            <div
              key={pin.id}
              ref={el => { cardRefs.current[pin.id] = el }}
              style={makeCardStyle(pin.id, pos, z)}
              onClick={() => handleCardClick(pin.id)}
              className={[
                'rounded-lg px-2 py-1.5 border cursor-pointer select-none w-[200px]',
                elevated ? 'shadow-xl' : 'shadow-md',
                'bg-white border-green-200',
              ].join(' ')}
            >
              <p className="text-xs font-semibold leading-snug text-green-700">
                {matchedHotspot.label}
              </p>
              <p className="text-xs text-gray-600 leading-snug mt-0.5 italic">
                "{pin.text}"
              </p>
              <hr className="my-1 border-green-100" />
              <p className="text-xs text-gray-700 leading-snug">
                {matchedHotspot.explanation}
              </p>
            </div>
          )
        }

        // Unmatched pin: annotation only, neutral blue border
        return (
          <div
            key={pin.id}
            ref={el => { cardRefs.current[pin.id] = el }}
            style={makeCardStyle(pin.id, pos, z)}
            onClick={() => handleCardClick(pin.id)}
            className={[
              'rounded-lg px-2 py-1 border cursor-pointer select-none',
              'min-w-[100px] max-w-[200px] bg-white border-blue-200',
              elevated ? 'shadow-xl' : 'shadow-md',
            ].join(' ')}
          >
            <p className="text-xs text-gray-700 leading-snug">{pin.text}</p>
          </div>
        )
      })

      const unmatchedHotspotCards = exercise.hotspots
        .filter(h => !hotspotMatches[h.id])
        .map(hotspot => {
          const pos = cardPositions[hotspot.id]
          const z = cardZIndices[hotspot.id] || 20
          const elevated = z > 20
          return (
            <div
              key={hotspot.id}
              ref={el => { cardRefs.current[hotspot.id] = el }}
              style={makeCardStyle(hotspot.id, pos, z)}
              onClick={() => handleCardClick(hotspot.id)}
              className={[
                'rounded-lg px-2 py-1.5 border cursor-pointer select-none w-[200px]',
                elevated ? 'shadow-xl' : 'shadow-md',
                'bg-white border-red-200',
              ].join(' ')}
            >
              <p className="text-xs font-semibold leading-snug text-red-600">
                {hotspot.label}
              </p>
              <hr className="my-1 border-red-100" />
              <p className="text-xs text-gray-700 leading-snug">{hotspot.explanation}</p>
            </div>
          )
        })

      return [...pinCards, ...unmatchedHotspotCards]
    }

    // Free-pin unlocked: smart-positioned annotation cards for confirmed pins
    // and any annotated revealed hotspots (checklist mode).
    if (isFreePin && !locked) {
      const pinCards = freePins
        .filter(pin => pin.text.length > 0)
        .map(pin => {
          const pos = cardPositions[pin.id]
          const z = cardZIndices[pin.id] || 20
          const elevated = z > 20
          return (
            <div
              key={pin.id}
              ref={el => { cardRefs.current[pin.id] = el }}
              style={makeCardStyle(pin.id, pos, z)}
              onClick={() => handleCardClick(pin.id)}
              className={[
                'rounded-lg px-2 py-1 border cursor-pointer select-none',
                'min-w-[100px] max-w-[200px] bg-white border-green-200',
                elevated ? 'shadow-xl' : 'shadow-md',
              ].join(' ')}
            >
              <p className="text-xs text-gray-700 leading-snug">{pin.text}</p>
            </div>
          )
        })

      // Revealed hotspot annotation cards (same style as free-pin annotation cards)
      const revealedCards = exercise.hotspots
        .filter(h => revealedArtifactTypes.has(h.label) && annotations[h.id]?.length)
        .map(hotspot => {
          const pos = cardPositions[hotspot.id]
          const z = cardZIndices[hotspot.id] || 20
          const elevated = z > 20
          return (
            <div
              key={hotspot.id}
              ref={el => { cardRefs.current[hotspot.id] = el }}
              style={makeCardStyle(hotspot.id, pos, z)}
              onClick={() => handleCardClick(hotspot.id)}
              className={[
                'rounded-lg px-2 py-1 border cursor-pointer select-none',
                'min-w-[100px] max-w-[200px] bg-white border-green-200',
                elevated ? 'shadow-xl' : 'shadow-md',
              ].join(' ')}
            >
              <p className="text-xs text-gray-700 leading-snug">{annotations[hotspot.id]}</p>
            </div>
          )
        })

      return [...pinCards, ...revealedCards]
    }

    // Glow mode: predefined hotspot cards (locked or unlocked)
    return exercise.hotspots.map(hotspot => {
      const annotation = displayAnnotations[hotspot.id] || null
      const isAnnotated = !!(annotation?.length)
      const shouldShow = locked || isAnnotated
      if (!shouldShow) return null

      const pos = cardPositions[hotspot.id]
      const z = cardZIndices[hotspot.id] || 20
      const elevated = z > 20

      if (locked) {
        return (
          <div
            key={hotspot.id}
            ref={el => { cardRefs.current[hotspot.id] = el }}
            style={makeCardStyle(hotspot.id, pos, z)}
            onClick={() => handleCardClick(hotspot.id)}
            className={[
              'rounded-lg px-2 py-1.5 border cursor-pointer select-none w-[200px]',
              elevated ? 'shadow-xl' : 'shadow-md',
              isAnnotated ? 'bg-white border-green-200' : 'bg-white border-red-200',
            ].join(' ')}
          >
            <p className={[
              'text-xs font-semibold leading-snug',
              isAnnotated ? 'text-green-700' : 'text-red-600',
            ].join(' ')}>
              {hotspot.label}
            </p>
            {isAnnotated && (
              <p className="text-xs text-gray-600 leading-snug mt-0.5 italic">
                "{annotation}"
              </p>
            )}
            <hr className={['my-1', isAnnotated ? 'border-green-100' : 'border-red-100'].join(' ')} />
            <p className="text-xs text-gray-700 leading-snug">{hotspot.explanation}</p>
          </div>
        )
      }

      // Unlocked annotation label
      return (
        <div
          key={hotspot.id}
          ref={el => { cardRefs.current[hotspot.id] = el }}
          style={makeCardStyle(hotspot.id, pos, z)}
          onClick={() => handleCardClick(hotspot.id)}
          className={[
            'rounded-lg px-2 py-1 border cursor-pointer select-none',
            'min-w-[100px] max-w-[200px] bg-white border-green-200',
            elevated ? 'shadow-xl' : 'shadow-md',
          ].join(' ')}
        >
          <p className="text-xs text-gray-700 leading-snug">{annotation}</p>
        </div>
      )
    })
  }

  // ─── SVG connector lines ──────────────────────────────────────────────────────

  function renderConnectors() {
    const container = containerRef.current
    if (!container || !Object.keys(cardPositions).length) return null

    const cw = container.offsetWidth
    const ch = container.offsetHeight

    // Build connector source list. Each item: { id, x, y, color }.
    let sources
    if (isFreePin && locked) {
      const { pinMatches, hotspotMatches } = pinMatchData
      sources = [
        ...lockedFreePins.map(pin => ({
          id: pin.id, x: pin.x, y: pin.y,
          color: pinMatches[pin.id] ? '#22c55e' : '#93c5fd', // green or blue-300
        })),
        ...exercise.hotspots
          .filter(h => !hotspotMatches[h.id])
          .map(h => ({ id: h.id, x: h.x, y: h.y, color: '#f87171' })),
      ]
    } else if (isFreePin) {
      sources = [
        ...freePins
          .filter(pin => pin.text.length > 0)
          .map(pin => ({ id: pin.id, x: pin.x, y: pin.y, color: '#22c55e' })),
        ...exercise.hotspots
          .filter(h => revealedArtifactTypes.has(h.label) && annotations[h.id]?.length)
          .map(h => ({ id: h.id, x: h.x, y: h.y, color: '#22c55e' })),
      ]
    } else {
      sources = exercise.hotspots.map(hotspot => ({
        id: hotspot.id,
        x: hotspot.x,
        y: hotspot.y,
        color: !locked || displayAnnotations[hotspot.id] ? '#22c55e' : '#f87171',
      }))
    }

    const lines = sources.map(src => {
      const pos = cardPositions[src.id]
      const cardEl = cardRefs.current[src.id]
      if (!pos || !cardEl) return null

      const hx = (src.x / 100) * cw
      const hy = (src.y / 100) * ch
      const edge = cardEdgePoint(pos.x, pos.y, cardEl.offsetWidth, cardEl.offsetHeight, hx, hy)

      return (
        <line
          key={src.id}
          x1={hx} y1={hy}
          x2={edge.x} y2={edge.y}
          stroke={src.color}
          strokeWidth="1.5"
          strokeOpacity="0.45"
          strokeDasharray="4 3"
        />
      )
    })

    if (lines.every(l => !l)) return null

    return (
      <svg
        className="absolute inset-0 pointer-events-none"
        style={{ width: '100%', height: '100%', zIndex: 15 }}
      >
        {lines}
      </svg>
    )
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {!locked && (
        <p className="text-lg font-medium text-gray-800">
          {isFreePin
            ? 'Click anywhere on the image to mark regions that look AI-generated.'
            : 'Click on the regions of the image that you think reveal it as AI-generated.'}
        </p>
      )}

      {/* "none" mode: progressive hint callouts — appear above the image once hint button is clicked */}
      {isNone && !locked && hintLevel >= 1 && (
        <div className="space-y-2">
          {/* Level 1 hint callout */}
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 leading-relaxed flex items-start justify-between gap-4">
            <p>{level1Hint}</p>
            {hintLevel === 1 && (
              <button
                type="button"
                onClick={() => {
                  setHintLevel(2)
                  trackEvent({ roundNumber, phaseNumber: 3, eventType: 'none_next_hint_clicked', elementId: 'next_hint_button', value: null })
                }}
                className="shrink-0 px-3 py-1 rounded-md bg-amber-200 text-amber-900 text-xs font-semibold hover:bg-amber-300 transition-colors cursor-pointer"
              >
                Next Hint
              </button>
            )}
          </div>
          {/* Level 2 hint callout */}
          {hintLevel >= 2 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 leading-relaxed flex items-start justify-between gap-4">
              <p>{exercise.level2Hint}</p>
              <button
                type="button"
                onClick={() => {
                  setRevealedArtifactTypes(new Set(exercise.artifactTypes))
                  trackEvent({ roundNumber, phaseNumber: 3, eventType: 'none_reveal_hotspots_clicked', elementId: 'reveal_hotspots_button', value: null })
                }}
                disabled={allHotspotsRevealed}
                className={[
                  'shrink-0 px-3 py-1 rounded-md text-xs font-semibold transition-colors',
                  allHotspotsRevealed
                    ? 'bg-amber-100 text-amber-400 cursor-default'
                    : 'bg-amber-200 text-amber-900 hover:bg-amber-300 cursor-pointer',
                ].join(' ')}
              >
                {allHotspotsRevealed ? 'Hotspots Revealed' : 'Reveal Hotspots'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Checklist layout wraps image + side panel in a flex row (both before and after submit) */}
      <div className={isChecklist ? 'flex gap-6 items-start' : ''}>

        {/* Image container — position:relative so all absolute children (markers,
            cards, SVG) are scoped to this element. */}
        <div
          ref={containerRef}
          className={['relative flex-1', isFreePin && !locked ? 'cursor-crosshair' : ''].join(' ')}
          onClick={isFreePin && !locked ? handleImageClick : undefined}
        >
          <img
            src={exercise.aiImage}
            alt="AI-generated image — click regions to annotate what looks off"
            className="w-full max-h-[675px] rounded-lg"
            draggable={false}
          />

          {/* "none" mode hint button — top-right corner of image */}
          {isNone && !locked && (
            <button
              type="button"
              onClick={e => {
              e.stopPropagation()
              if (hintLevel === 0) {
                setHintLevel(1)
                trackEvent({ roundNumber, phaseNumber: 3, eventType: 'none_hint_button_clicked', elementId: 'hint_button', value: null })
              }
            }}
              className="absolute top-2 right-2 z-10 px-2.5 py-1 rounded-md bg-white/90 border border-gray-300 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors cursor-pointer"
            >
              {hintLevel === 0 ? 'Hint' : 'Hint ✓'}
            </button>
          )}

          {/* SVG connector lines — z-15, above image, below cards (z-20+) */}
          {renderConnectors()}

          {/* Free-pin mode (unlocked): user-placed pins with annotation popups */}
          {isFreePin && !locked && freePins.map(pin => (
            <FreePinMarker
              key={pin.id}
              pin={pin}
              isOpen={openPinId === pin.id}
              onAnnotate={handleFreePinAnnotate}
              onToggle={handlePinToggle}
              onCancel={handleFreePinCancel}
              roundNumber={roundNumber}
            />
          ))}

          {/* Free-pin modes (unlocked): revealed hotspot markers behave like glow-mode hotspots */}
          {isFreePin && !locked && exercise.hotspots
            .filter(h => revealedArtifactTypes.has(h.label))
            .map(hotspot => (
              <HotspotMarker
                key={`revealed-${hotspot.id}`}
                hotspot={hotspot}
                roundNumber={roundNumber}
                scaffoldLevel="glow"
                annotation={annotations[hotspot.id] ?? null}
                onAnnotate={handleAnnotate}
                locked={false}
              />
            ))
          }

          {/* Free-pin mode (locked): static dot markers for pins + unmatched hotspots */}
          {renderLockedFreePinMarkers()}

          {/* Glow mode only: predefined hotspot markers (dot + ring + popup) */}
          {scaffoldLevel === 'glow' && exercise.hotspots.map(hotspot => (
            <HotspotMarker
              key={hotspot.id}
              hotspot={hotspot}
              roundNumber={roundNumber}
              scaffoldLevel={scaffoldLevel}
              annotation={displayAnnotations[hotspot.id] ?? null}
              onAnnotate={handleAnnotate}
              locked={locked}
            />
          ))}

          {/* Smartly positioned annotation/feedback cards */}
          {renderCards()}
        </div>

        {/* ChecklistPanel: Round 2 only, visible before AND after submit */}
        {isChecklist && (
          <ChecklistPanel
            artifactTypes={exercise.artifactTypes}
            artifactHints={exercise.artifactHints}
            revealedTypes={revealedArtifactTypes}
            onReveal={type => setRevealedArtifactTypes(prev => new Set([...prev, type]))}
            locked={locked}
            roundNumber={roundNumber}
          />
        )}
      </div>

      {/* Submit row — visible only before submit */}
      {!locked && (
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => {
              trackEvent({ roundNumber, phaseNumber: 3, eventType: 'button_clicked', elementId: 'phase3_submit_button', value: null })
              handleSubmit()
            }}
            disabled={!canSubmit}
            className={[
              'px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors',
              canSubmit
                ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed',
            ].join(' ')}
          >
            Submit
          </button>
          <span className="text-sm text-gray-500">
            {isFreePin
              ? `${freePins.length} pin${freePins.length !== 1 ? 's' : ''} placed`
              : `${Object.keys(annotations).length} region${Object.keys(annotations).length !== 1 ? 's' : ''} annotated`}
          </span>
        </div>
      )}

      {/* Next Round / Finish button — visible after submit */}
      {locked && (
        <button
          type="button"
          onClick={() => {
            trackEvent({ roundNumber, phaseNumber: 3, eventType: 'button_clicked', elementId: isLastRound ? 'finish_button' : 'next_round_button', value: null })
            onNext()
          }}
          className="px-6 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors cursor-pointer"
        >
          {isLastRound ? 'Finish' : 'Next Round →'}
        </button>
      )}
    </div>
  )
}
