// All hardcoded exercise data for all three rounds.
// Each round uses a different AI image and covers different artifact types
// so learners build a broader detection toolkit across rounds.
//
// Artifact type coverage per round (per CLAUDE.md):
//   Round 1 (glow):      Hands & fingers, Fabric patterns, Reflections
//   Round 2 (checklist): Background text, Hands & fingers, Perspective & geometry
//   Round 3 (none):      Lighting & shadows, Background text, Hands & fingers
//
// artifactTypes is derived from the hotspot labels and also drives
// the Round 2 ChecklistPanel — no separate checklist field needed.
//
// Phase 3 always reuses aiImage from Phase 1 — no separate hotspotImage field.
// Principles are only named inside hotspot explanation fields (never in feedbackCorrect/Incorrect).

// Vite replaces import.meta.env.BASE_URL with '/' in dev and '/realeye-tol-final-project/'
// in production, so image paths resolve correctly in both environments.
const BASE = import.meta.env.BASE_URL

const exercises = [
  {
    id: "round1",
    artifactTypes: ["Arms & Hands", "Skin Texture", "Clothing", "Geometry"],
    scaffoldLevel: "glow", // Round 1: hotspot regions pulse to guide the learner

    // Phase 1
    realImage: `${BASE}images/round1-real.jpg`,
    aiImage: `${BASE}images/round1-ai.jpg`,
    comparePrompt:
      "Look at these two photos:",
    // shown after the learner submits their observation text — same for all responses
    differencesFeedback:
      "Good observations! [placeholder for LLM-generated feedback]",

    // Phase 2 — confirms which image is AI; no principles revealed here
    feedbackCorrect:
      "Correct! You spotted the AI-generated photo. Now let's analyze it more closely to uncover what gives it away.",
    feedbackIncorrect:
      "Not quite — the photo on the right was the real one. Let's take a closer look at the AI-generated image to understand what gives it away.",

    // Phase 3 — 4 hotspots covering hands, fabric, and reflections
    hotspots: [
      {
        id: "h1",
        x: 70,
        y: 60,
        label: "Arms & Hands",
        hint: "Count the limbs carefully. Does everything look anatomically complete?",
        explanation:
          "This girl is missing half of their arm — AI image generators consistently struggle with arm & hand anatomy, often producing extra or missing limbs.",
      },
      {
        id: "h2",
        x: 55,
        y: 35,
        label: "Overly smooth skin texture",
        hint: "Look closely at the skin. Does it have the subtle variation and texture you'd expect in a real photograph?",
        explanation:
          "The childrens' skin appears unnaturally smooth and lacks the subtle variations found in real skin. AI models often produce overly uniform textures, especially on skin and fabric.",
      },
      {
        id: "h3",
        x: 30,
        y: 52,
        label: "Strange clothing designs",
        hint: "Examine the clothing details up close. Do the buttons, seams, or patterns make physical sense?",
        explanation:
          "This girl's shirt has buttons fused directly into the fabric. AI generators often produce clothing details that look plausible at a glance but don't hold up to close scrutiny.",
      },
      {
        id: "h4",
        x: 90,
        y: 8,
        label: "Impossible geometry",
        hint: "Trace the structural lines in the background. Do they follow consistent rules of perspective?",
        explanation:
          "The straight beams on the roof converge incorrectly. AI models don't understand the rules of perspective, so they often produce architectural features with impossible geometry.",
      },
    ],
  },

  {
    id: "round2",
    artifactTypes: ["Object continuity", "Material textures", "Background continuity"],
    artifactHints: {
      "Object continuity": "Objects should resolve naturally — not cut off mid-scene.",
      "Material textures": "Different surfaces should stay visually distinct, not blend into each other.",
      "Background continuity": "Background detail and blur should stay consistent across the whole scene.",
    },
    scaffoldLevel: "checklist", // Round 2: checklist side panel; no glowing regions

    // Phase 1
    realImage: `${BASE}images/round2-real.jpg`,
    aiImage: `${BASE}images/round2-ai.jpg`,
    comparePrompt:
      "Look at these two photos:",
    // shown after the learner submits their observation text — same for all responses
    differencesFeedback:
      "Nice work! [placeholder for LLM-generated feedback]",

    // Phase 2
    feedbackCorrect:
      "Correct! You spotted the AI-generated photo. Now let's analyze it more closely to uncover what gives it away.",
    feedbackIncorrect:
      "Not quite — the photo on the left was the real one. Let's take a closer look at the AI-generated image to understand what gives it away.",

    // Phase 3 — 4 hotspots covering text, hands, and geometry
    hotspots: [
      {
        id: "h1",
        x: 25,
        y: 80,
        label: "Material textures",
        hint: "Look where materials overlap — do separate layers stay visually distinct from each other?",
        explanation:
          "The backpack strap texture blends into the material beneath it rather than sitting as a distinct layer. AI generators often merge overlapping materials, producing surfaces that look fused.",
      },
      {
        id: "h2",
        x: 43,
        y: 90,
        label: "Object continuity",
        hint: "Trace each visible object — does it connect to something or resolve cleanly off-frame?",
        explanation:
          "The lanyard cuts off abruptly instead of continuing off-frame or connecting to anything. AI models often fail to track objects across a scene, leaving elements that start but never resolve.",
      },
      {
        id: "h3",
        x: 5,
        y: 35,
        label: "Background continuity",
        hint: "Compare the left and right sides of the background — is the level of detail consistent?",
        explanation:
          "The left background is a uniform blur with no detail, while the right shows clear texture. AI generators frequently produce backgrounds with inconsistent detail across different regions.",
      },
      {
        id: "h4",
        x: 78,
        y: 87,
        label: "Material textures",
        hint: "Look where materials overlap — do separate layers stay visually distinct from each other?",
        explanation:
          "The backpack strap texture blends into the material beneath it rather than sitting as a distinct layer. AI generators often merge overlapping materials, producing surfaces that look fused.",
      },
    ],
  },

  {
    id: "round3",
    artifactTypes: ["Object details", "Hands & fingers", "Impossible geometry"],
    // Level 2 hint — shown only if the learner requests it; points to specific areas
    // without naming the artifacts. Level 1 hint is generated from artifactTypes at runtime.
    level2Hint:
      "Take a closer look at the watch, the hands and fingers, and the tent poles — something looks off in each area.",
    scaffoldLevel: "none", // Round 3: no scaffolding — fully independent analysis

    // Phase 1
    realImage: `${BASE}images/round3-real.jpg`,
    aiImage: `${BASE}images/round3-ai.jpg`,
    comparePrompt:
      "Look at these two photos:",
    // shown after the learner submits their observation text — same for all responses
    differencesFeedback:
      "Good eye! [placeholder for LLM-generated feedback]",

    // Phase 2
    feedbackCorrect:
      "Correct! You spotted the AI-generated photo. Now let's analyze it more closely to uncover what gives it away.",
    feedbackIncorrect:
      "Not quite — the photo on the right was the real one. Let's take a closer look at the AI-generated image to understand what gives it away.",

    // Phase 3 — 3 hotspots covering lighting, text, and hands
    hotspots: [
      {
        id: "h1",
        x: 36,
        y: 54,
        label: "Object details",
        explanation:
          "The watch borders don't line up with the rest of the watch face. AI generators often misalign object components, especially small mechanical details like bezels and bands.",
      },
      {
        id: "h2",
        x: 58,
        y: 81,
        label: "Hands & fingers",
        explanation:
          "An extra finger juts out of the hand at an anatomically impossible angle. AI models frequently generate hands with too many or malformed digits.",
      },
      {
        id: "h3",
        x: 44,
        y: 73,
        label: "Hands & fingers",
        explanation:
          "The pinky finger is incompletely rendered — its edges are bumpy and undefined. AI often fails to fully resolve fine details at the periphery of limbs.",
      },
      {
        id: "h4",
        x: 20,
        y: 60,
        label: "Impossible geometry",
        explanation:
          "The tent pole disappears into the tent opening rather than connecting to a visible anchor. AI models often lose track of structural elements where they meet other surfaces.",
      },
    ],
  },
]

export default exercises
