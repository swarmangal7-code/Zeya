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
  /* Theme — cool, dark, cinematic ("midnight installation").           */
  /* ------------------------------------------------------------------ */
  theme: {
    bg: "#05060A",
    ink: "#EAF0FA",
    muted: "#8A96AB",
    accent: "#6D8DFF",
    accentSoft: "#B9C7DD",
    danger: "#A23D4E",
  },

  /* ------------------------------------------------------------------ */
  /* Camera / door composition                                          */
  /* ------------------------------------------------------------------ */
  camera: {
    /** half-width / half-height of the door+frame, in world units, that
      the camera must keep fully visible. Drives responsive framing. */
    fitHalfW: 2.12,
    fitHalfV: 2.62,
    fov: 40,
    idleY: 0.55,
    lookY: 2.15,
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
    bloom: { intensity: 0.45, luminanceThreshold: 1.0, luminanceSmoothing: 0.12, radius: 0.65 },
    dof: { focusDistance: 0.2, focalLength: 0.05, bokehScale: 1.35 },
    /** kept barely perceptible — cinematic image, not an effect reel */
    chromaticAberration: 0.00012,
    noise: 0.012,
    vignette: 0.5,
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
      settleIn: 0.7,
    },
    knock: {
      firstDelay: 2100,
      gap: 1300,
      openAvailableAfter: 1100,
    },
    opening: {
      total: 4800,
      revealAt: 0.56,
    },
    reveal: {
      textGap: 2400,
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
    manifest: ["ambient", "knock1", "knock2", "door-open", "unlock", "error", "click"] as const,
    spatialize: true,
    preDelayMs: 32,
  },

  /* ------------------------------------------------------------------ */
  /* Flowing gradient universe                                          */
  /* ------------------------------------------------------------------ */
  gradient: {
    enabled: true,
    /** darkness of the veil laid over the moving color fields */
    veil: 0.58,
    /** seconds for a full layer drift cycle */
    motionMs: 46000,
    /** optional restrained accent color per variant (electric blue) */
    variants: {
      lock: {
        palette: ["#0A101F", "#101827", "#060814", "#182339"],
        accent: "#39498F",
      },
      door: {
        palette: ["#0B0F1A", "#121A2B", "#070A12", "#1D2A43"],
        accent: "#2C3E7E",
      },
      reveal: {
        palette: ["#0E1426", "#1B2540", "#0A0D1B", "#28345C"],
        accent: "#3D53A6",
      },
      scroll: {
        palette: ["#0A0F1E", "#131C31", "#080B15", "#24304F"],
        accent: "#31427F",
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
      swipe: "Two hands. One push.",
    },
    reveal: {
      first: "Some doors are worth opening.",
      second: "Welcome.",
      sub: "make yourself at home",
      continueLabel: "step inside",
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