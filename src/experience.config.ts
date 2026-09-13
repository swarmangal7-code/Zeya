/**
 * Central configuration for the cinematic experience.
 * Change PIN, timings, text, audio, post-processing, the door model,
 * and all personal content here without touching component code.
 */
export const experienceConfig = {
  version: "1.2.0",

  /** Door PIN. Exactly 4 digits. Override via VITE_EXPERIENCE_PIN env var. */
  pin: (import.meta.env.VITE_EXPERIENCE_PIN as string | undefined) || "1234",

  /* ------------------------------------------------------------------ */
  /* Assets                                                             */
  /* ------------------------------------------------------------------ */
  assets: {
    door: {
      /**
       * Set to "/models/door.glb" to load a real GLB door instead of the
       * procedural one. Leaves must be separate objects named `doorLeft`
       * and `doorRight`; the frame can be named `doorFrame`. DRACO-encode
       * the GLB and set `draco: true` (decoder loads from Google's CDN,
       * so serving our own copy under /draco-gltf/ is better in prod).
       */
      glb: null as string | null,
      draco: false,
      /** Level-of-detail: distance beyond which the low proxy shows. */
      lodFar: 26,
    },
  },

  /* ------------------------------------------------------------------ */
  /* Post-processing (only applied on the high quality tier)            */
  /* ------------------------------------------------------------------ */
  postprocessing: {
    enabled: true,
    bloom: { intensity: 0.55, luminanceThreshold: 2.0, luminanceSmoothing: 0.12, radius: 0.72 },
    dof: { focusDistance: 0.14, focalLength: 0.055, bokehScale: 2.2 },
    chromaticAberration: 0.0009,
    noise: 0.05,
    vignette: 0.55,
  },

  /* ------------------------------------------------------------------ */
  /* Timing                                                             */
  /* ------------------------------------------------------------------ */
  timings: {
    loading: {
      /** Minimum time the loading scene stays visible. */
      minDuration: 3000,
    },
    knock: {
      firstDelay: 1800,
      gap: 1100,
      openAvailableAfter: 1000,
    },
    opening: {
      total: 4600,
      revealAt: 0.55,
    },
    reveal: {
      textGap: 2400,
      /** Pause before the "step inside" invite appears. */
      continueAfter: 2200,
    },
  },

  /* ------------------------------------------------------------------ */
  /* Audio                                                              */
  /* ------------------------------------------------------------------ */
  audio: {
    enabled: true,
    ambientVolume: 0.13,
    sfxVolume: 0.85,
    fadeInMs: 2400,
    fadeOutMs: 900,
    /**
     * Optional real samples. Each key maps to /public/audio/<key>.{mp3,ogg,wav}.
     * Missing files fail silently and the synthesized fallback plays instead.
     */
    manifest: ["ambient", "knock1", "knock2", "door-open", "unlock", "error", "click"] as const,
    spatialize: true,
    preDelayMs: 32,
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
      hint: "Enter the PIN",
      sub: "Four digits. That's all.",
      /** Small warm line under the clock; empty string hides it. */
      greeting: "…",
    },
    door: {
      openCta: "Open the door",
      swipe: "Swipe to open",
    },
    reveal: {
      first: "Some doors are worth opening.",
      second: "Welcome.",
      sub: "Make yourself at home.",
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
    signature: "— with love, always",
  },

  /**
   * Editorial sections of the post-reveal scroll scene.
   * Kinds: chapter | memory | quote | closing.
   * Add as many as you like; each renders cinematically.
   */
  sections: [
    {
      kind: "chapter",
      line: "Some rooms keep the light on even when you're away.",
    },
    {
      kind: "memory",
      symbol: "☾",
      label: "memory 01 · the long night",
      title: "We talked until the room went cold",
      body: "Two mugs, one blanket, and a conversation that outlived the moon. You never once checked the time, and neither did I.",
      note: "…",
    },
    {
      kind: "memory",
      symbol: "✦",
      label: "memory 02 · the small door",
      title: "You unlocked something in me",
      body: "A code, four digits long, and behind it an entire world I didn't know I'd built. You only had to knock.",
      note: "…",
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