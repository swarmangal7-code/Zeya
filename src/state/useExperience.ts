import { create } from "zustand";
import type { Stage } from "../types";

interface ExperienceState {
  stage: Stage;
  muted: boolean;
  pinIncorrect: boolean;
  /** steadily advancing 0-1 progress through lock screen brightness */
  unlockProgress: number;
  setStage: (s: Stage) => void;
  setMuted: (m: boolean) => void;
  setPinIncorrect: (v: boolean) => void;
  setUnlockProgress: (v: number) => void;
}

export const useExperience = create<ExperienceState>((set) => ({
  stage: "loading",
  muted: typeof document !== "undefined" ? localStorage.getItem("zeya-muted") === "1" : false,
  pinIncorrect: false,
  unlockProgress: 0,
  setStage: (stage) => set({ stage }),
  setMuted: (muted) => {
    localStorage.setItem("zeya-muted", muted ? "1" : "0");
    set({ muted });
  },
  setPinIncorrect: (pinIncorrect) => set({ pinIncorrect }),
  setUnlockProgress: (unlockProgress) => set({ unlockProgress }),
}));