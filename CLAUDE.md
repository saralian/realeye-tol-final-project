# My Project

A web app prototype for an interactive learning tool that teaches users how to detect AI-generated visual media (images). The tool is designed for adults with low AI literacy and is the final project for a graduate course on Tools for Online Learning.

Each exercise follows a **three-phase instructional sequence** (Observe → Confirm → Analyze), and the tool runs the learner through **three rounds** that progressively fade scaffolding. The core mechanic is a hotspot annotation task where users click regions of an AI image and describe what looks "off," paired with immediate formative feedback.

## Stack

- **React + Vite** — lightweight, fast dev setup; good fit for component-based interactive UI with multiple phases and stateful transitions
- **Tailwind CSS** — utility-first styling for rapid prototyping without writing custom CSS
- **Plain JavaScript (no backend)** — all image data, hotspot definitions, phase content, and feedback are hardcoded locally as JS objects; no server or database needed for the prototype
- **No external UI libraries** — keep dependencies minimal; build simple custom components by hand

## Exercise Structure

Each exercise has three phases that play out in sequence:

### Phase 1 — Contrasting Pair (Observe)
- Display a real photo and an AI-generated photo **side by side**
- A prompt above both images reads: *"Look at these two photos:"*
- Below the images: a free-text input box labelled *"What differences do you notice?"*
- **Two-stage submit pattern:**
  - **Stage 1 — Observation submit** (directly under the textarea): enabled once any text is entered. On click, the textarea is disabled and a problem-specific feedback callout appears (hardcoded as `differencesFeedback` in `exercises.js`). No right/wrong judgment — the same callout appears for all responses.
  - **Stage 2 — Main submit** (under the Photo A / Photo B buttons): enabled only after stage 1 is complete **and** a photo button has been selected. Clicking this advances to Phase 2.
- Below the observation area: a line reading *"Select the photo that you think is AI-generated:"* and two buttons labelled **"Photo A"** and **"Photo B"**. Clicking a button **selects** it (highlighted border); the images themselves are not clickable. Photo selection is independent of stage 1 — the learner can select a photo before or after submitting their observation.

### Phase 2 — Verdict Feedback (Confirm)
- Feedback appears **inline on the same page as Phase 1**, directly below the Submit button — Phase 1 content stays visible but all inputs are locked (disabled) so the learner can no longer change their answers
- Learner is told whether they correctly identified the AI image based on their Phase 1 selection
- **Correct path:** Positive confirmation (e.g., *"Correct! You spotted the AI-generated photo."*) followed by a forward prompt that frames Phase 3 as deeper discovery (e.g., *"Now let's analyze it more closely to uncover what gives it away."*). No principles are revealed here — that would front-load the learning that should happen in Phase 3.
- **Incorrect path:** Gentle correction that names which image was AI (e.g., *"Not quite — the photo on the right was the real one. Let's take a closer look at the AI-generated image to understand what gives it away."*). This reorients the learner so they know which image they'll be analyzing before entering Phase 3.
- Both paths end with a "Continue" button that advances to Phase 3

### Phase 3 — Hotspot Annotation Task (Analyze)
- Display the AI image alone (must be the same AI image from Phase 1)
- Learner clicks on regions of the image they think reveal it as AI-generated
- Each click opens a small text input: *"What do you notice here?"*
- **Each exercise must include 3–4 hotspots covering different artifact types** (e.g., distorted hands, garbled background text, anatomically wrong facial feature, inconsistent lighting/shadows) — do not use a single cue per exercise; learners should discover multiple signals per image
- Feedback screen reveals: whether the verdict was correct, **all** hotspot regions including ones the learner missed, and a brief explanation of each tell — this is where principles are named and explained for the first time

## Scaffolding & Fading Across Rounds

The tool runs the learner through **three rounds**. Each round = one full exercise (Phase 1 → 2 → 3), but the level of support in Phase 3 decreases each round:

| Round | Scaffold Level | Phase 3 Behavior |
|-------|---------------|------------------|
| 1 | High | Hotspot regions glow/pulse to guide the learner's eye. Learner clicks and labels them. |
| 2 | Medium | No glowing regions. A checklist of things to look for is shown in a side panel (e.g., "Check hands," "Check background text," "Check lighting"). |
| 3 | None | No glowing regions, no checklist. Learner analyzes the image entirely independently. |

Each round should teach some **different artifact types** (e.g., Round 1 = hands/fingers, fabric patterns, and reflections; Round 2 = background text, hands/fingers, perspective/geometry, Round 3 = lighting/shadows, background text, hands/fingers) so the learner is building a broader detection toolkit across rounds, not just repeating the same skill.

## Project Structure

```
src/
  components/
    ContrastingPair.jsx     # Phase 1: side-by-side image comparison, free-text input,
                            #   clickable image selection, and Submit button
    VerdictFeedback.jsx     # Phase 2: correct/incorrect feedback + Continue button
                            #   (no principles revealed; confirms which image is AI)
    HotspotTask.jsx         # Phase 3: displays the same AI image from Phase 1 with
                            #   clickable annotation regions; no verdict input —
                            #   the image is already confirmed as AI by Phase 2
    HotspotMarker.jsx       # Individual clickable region overlay rendered on the image;
                            #   renders a glow/pulse effect when scaffoldLevel is "glow"
    FeedbackPanel.jsx       # Post-submission feedback screen: reveals all hotspot regions
                            #   (including missed ones) with artifact labels and explanations;
                            #   this is the first time principles are named
    ChecklistPanel.jsx      # Side panel shown only in Round 2 (scaffoldLevel "checklist");
                            #   populated from artifactTypes in exercise data —
                            #   no separate data field needed
    ProgressBar.jsx         # Shows current round (1-3) and current phase (1-3)
  data/
    exercises.js            # All hardcoded exercise data for all three rounds
                            #   (see Data Shape below); artifact types must differ across rounds
  App.jsx                   # Top-level state: current round, current phase, phase transitions;
                            #   passes scaffoldLevel from exercise data to HotspotTask
  main.jsx                  # Vite entry point
public/
  images/                   # Real and AI photos used in exercises
                            #   naming convention: round1-real.jpg, round1-ai.jpg, etc.
                            #   Phase 3 always reuses the same AI image as Phase 1 -
                            #   no separate hotspot images needed
```

## Data Shape

Each exercise in `exercises.js` should follow this structure:

```js
{
  id: "round1",
  artifactTypes: ["Hands & fingers", "Background text", "Lighting & shadows"],
  // derived from hotspot labels; also drives the Round 2 checklist panel —
  // keep labels generic enough to serve as hints without revealing specific locations
  scaffoldLevel: "glow", // "glow" | "checklist" | "none"

  // Phase 1
  realImage: "/images/round1-real.jpg",
  aiImage: "/images/round1-ai.jpg",
  // unified prompt shown above both images and the text box
  comparePrompt: "Look at these two photos:",
  // shown after the learner submits their observation text (stage 1 submit);
  // same for all responses — no right/wrong judgment; problem-specific hints only
  differencesFeedback: "...",
  // aiImage value is used at runtime to evaluate whether the learner's image selection is correct

  // Phase 2 — verdict feedback (no principles revealed here)
  feedbackCorrect: "Correct! You spotted the AI-generated photo. Now let's analyze it more closely to uncover what gives it away.",
  feedbackIncorrect: "Not quite — the photo on the left was the real one. Let's take a closer look at the AI-generated image to understand what gives it away.",

  // Phase 3 — each exercise must have 3–4 hotspots covering different artifact types
  // Phase 3 always displays the same aiImage from Phase 1 — no separate hotspotImage field needed
  hotspots: [
    {
      id: "h1",
      x: 42,        // percentage of image width
      y: 67,        // percentage of image height
      label: "Fused fingers",
      explanation: "The fingers on this hand are merged together — AI generators consistently struggle with hand anatomy."
    },
    {
      id: "h2",
      x: 78,
      y: 30,
      label: "Garbled background text",
      explanation: "The sign in the background contains nonsense characters — AI models generate plausible-looking text shapes without understanding language."
    },
    {
      id: "h3",
      x: 55,
      y: 15,
      label: "Inconsistent lighting",
      explanation: "The light source on the subject's face doesn't match the shadows in the background — AI often fails to maintain lighting consistency across a scene."
    }
  ],
  // no separate checklist field — Round 2 checklist panel is populated
  // directly from artifactTypes at runtime, keeping the data DRY
}
```

## Conventions

- **Component files** use PascalCase (e.g. `HotspotTask.jsx`, `FeedbackPanel.jsx`)
- **Data files** use camelCase (e.g. `exercises.js`)
- **One component per file** — keep components small and focused
- **Props over state** where possible — pass data down, lift state up to `App.jsx` only when needed
- **Tailwind only for styling** — no inline styles, no separate CSS files unless unavoidable
- **Hardcode everything** — no APIs, no dynamic data fetching; all content lives in `src/data/exercises.js`
- **No TypeScript** — plain JS for prototyping speed
- **Submit buttons are the only navigation trigger** — clicking an image, selecting an option, or filling a field never auto-advances the learner; a Submit (or Continue) button always controls progression
- **Submit buttons are disabled until all required inputs are complete** — Phase 1 has two submit buttons: the observation submit requires non-empty text; the main submit requires the observation to have been submitted AND a photo selected
- **Hotspot coordinates are percentages** (0–100), not pixels — so they scale correctly with image size
- **Comments on non-obvious logic** — especially hotspot positioning math and phase transition logic

## Goals

- Keep it **simple and functional** — this is an early prototype, not a polished product
- Focus on implementing the **three-phase sequence** (Observe → Confirm → Analyze) and the **three scaffolding rounds** as the core demonstration
- **Do not over-engineer** — no routing library, no state management library, no authentication
- Prioritize **demonstrating learning science principles** clearly over visual polish:
  - Contrasting cases (Phase 1 side-by-side comparison)
  - Guided discovery (free-text observation in Phase 1; principles are only named in Phase 3 feedback after the learner has attempted to find cues themselves)
  - Scaffolding and fading (glow → checklist → none across rounds)
  - Immediate formative feedback (Phase 2 verdict confirmation; Phase 3 full hotspot reveal with named principles)
- **Build all three rounds** with placeholder images and content if real images aren't ready yet — the interaction flow matters more than the content at this stage
- Code should be **easy to explain in a portfolio interview** — favor clarity over cleverness