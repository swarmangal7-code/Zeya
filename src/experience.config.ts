/**
 * Central configuration for the cinematic experience.
 * Change PIN, timings, text, theme, camera, audio, post-processing,
 * door scale and all content here without touching component code.
 */
export const experienceConfig = {
  version: "1.4.0",

  /** Door PIN. Exactly 4 digits. Override via VITE_EXPERIENCE_PIN env var. */
  pin: (import.meta.env.VITE_EXPERIENCE_PIN as string | undefined) || "1234",

  /* ------------------------------------------------------------------ */
  /* Theme — cinematic film grade (near-black graphite → deep navy →    */
  /* cool blue → muted indigo → cool white highlights).                 */
  /* ------------------------------------------------------------------ */
  theme: {
    bg: "#05070C",
    graphite: "#0B0F17",
    navy: "#10182A",
    midnight: "#17233D",
    blue: "#536FAF",
    indigo: "#6E6AA8",
    ink: "#E8EDF7",
    silver: "#AEB9CC",
    danger: "#A23D4E",
  },

  /* ------------------------------------------------------------------ */
  /* Camera — geometry-aware composition                                */
  /* ------------------------------------------------------------------ */
  camera: {
    /* architectural anchors (world units, floor = y 0, doorway plane = z 0) */
    doorHeight: 4.3,
    doorWidth: 3.5,
    eyeHeight: 1.55,
    lookY: 2.0, // slightly below door centre → threshold reads, no floor-tilt
    /** world-units kept visible around the door (drives responsive distance) */
    fitHalfV: 3.5, // → door ≈ 60% of viewport height
    fitHalfW: 2.7, // portrait-width guard
    fov: 42,
    /** scripted poses, derived from the anchors above */
    poses: {
      front: { z: 9.2, y: 1.55, lookY: 2.0, fov: 42 },      // z recomputed from fit-math
      opening: { z: 7.1, y: 1.55, lookY: 1.95, fov: 45 },   // tiny push, eye height held
      doorOpen: { z: 6.4, y: 1.58, lookY: 1.95, fov: 46 },
      threshold: { z: 6.0, y: 1.66, lookZ: -4.8, lookY: 1.92 }, // LIFT + LOOK
      interior: { z: -5.0, y: 1.7, lookZ: -9.5, lookY: 1.92, fov: 51 },
    },
  },

  door: {
    /** Multiplies the procedural door geometry (keep 1 for default sizing). */
    scale: 1.0,
  },

  /* ------------------------------------------------------------------ */
  /* Assets                                                             */
  /* ------------------------------------------------------------------ */
  assets: {
    door: {
      glb: null as string | null,
      draco: false,
      lodFar: 26,
    },
  },

  /* ------------------------------------------------------------------ */
  /* Post-processing (only applied on the high quality tier)            */
  /* ------------------------------------------------------------------ */
  postprocessing: {
    enabled: true,
    /** barely-there enhancement; quality comes from geometry, light & shadow */
    bloom: { intensity: 0.2, luminanceThreshold: 2.0, luminanceSmoothing: 0.15, radius: 0.6 },
    dof: { focusDistance: 0.225, focalLength: 0.055, bokehScale: 1.0 },
    chromaticAberration: 0.00006,
    noise: 0.006,
    vignette: 0.42,
  },

  /* ------------------------------------------------------------------ */
  /* Timing                                                             */
  /* ------------------------------------------------------------------ */
  timings: {
    loading: {
      minDuration: 3000,
    },
    lock: {
      /** pause before the lockscreen content resolves in */
      settleIn: 0.8,
    },
    knock: {
      firstDelay: 2600,
      gap: 1500,
      openAvailableAfter: 1200,
    },
    opening: {
      total: 4800,
      revealAt: 0.56,
    },
    reveal: {
      textGap: 2500,
      continueAfter: 2200,
    },
  },

  /* ------------------------------------------------------------------ */
  /* Audio                                                              */
  /* ------------------------------------------------------------------ */
  audio: {
    enabled: true,
    ambientVolume: 0.12,
    sfxVolume: 0.85,
    fadeInMs: 2600,
    fadeOutMs: 900,
    manifest: ["ambient", "knock1", "knock2", "door-open", "unlock", "error", "click", "enter"] as const,
    spatialize: true,
    preDelayMs: 32,
  },

  /* ------------------------------------------------------------------ */
  /* Flowing gradient universe                                          */
  /* ------------------------------------------------------------------ */
  gradient: {
    enabled: true,
    /** darkness of the veil laid over the moving color fields */
    veil: 0.5,
    /** a full drift cycle is nearly subliminal */
    motionMs: 62000,
    /** optional restrained accent color per variant */
    variants: {
      lock: {
        palette: ["#0B0F17", "#10182A", "#05070C", "#17233D"],
        accent: "#3A4A7D",
      },
      door: {
        palette: ["#0B0F17", "#121A2E", "#05070C", "#1A2740"],
        accent: "#3F4E86",
      },
      reveal: {
        palette: ["#10182A", "#17233D", "#0B0F17", "#212D52"],
        accent: "#536FAF",
      },
      scroll: {
        palette: ["#0B0F17", "#131E38", "#070B14", "#202D4B"],
        accent: "#4A5C97",
      },
    },
  },

  /* ------------------------------------------------------------------ */
  /* Text / UI                                                          */
  /* ------------------------------------------------------------------ */
  text: {
    loading: {
      title: "Preparing something",
      steps: [
        "Entering the environment",
        "Restoring the atmosphere",
        "Calibrating sound",
        "Arranging the room",
      ],
    },
    lock: {
      hint: "Enter the code",
      /** Small quiet line under the clock; empty string hides it. */
      greeting: "",
    },
    door: {
      openCta: "Open the door",
      stepInside: "Step inside",
      swipe: "Two hands. One push.",
    },
    reveal: {
      first: "Some doors are worth opening.",
      second: "Welcome.",
      sub: "make yourself at home",
      continueLabel: "continue",
    },
    scroll: {
      running: "where doors open",
      replay: "replay",
      endNote: "To be continued — same place, next time.",
    },
  },

  /* ------------------------------------------------------------------ */
  /* Personal content — replace with your own copy                      */
  /* ------------------------------------------------------------------ */
  personal: {
    who: "the one who knows the code",
    signature: "— with you, always",
  },

  sections: [
    {
      kind: "chapter",
      line: "Some rooms keep the light on even when you're away.",
    },
    {
      kind: "memory",
      symbol: "✦",
      label: "The long night",
      title: "We talked until the room went cold",
      body: "Two mugs, one blanket, and a conversation that outlived the moon. You never once checked the time, and neither did I.",
      note: "",
    },
    {
      kind: "memory",
      symbol: "◍",
      label: "The small door",
      title: "You unlocked something in me",
      body: "A code, four digits long, and behind it an entire world I didn't know I'd built. You only had to knock.",
      note: "",
    },
    {
      kind: "quote",
      line: "Some doors are worth opening.",
    },
    {
      kind: "closing",
      line: "Thank you for coming inside.",
    },
  ],
} as const;

export type ExperienceConfig = typeof experienceConfig;
export type SectionKind = "chapter" | "memory" | "quote" | "closing";
export type GradientVariantKey = keyof ExperienceConfig["gradient"]["variants"];