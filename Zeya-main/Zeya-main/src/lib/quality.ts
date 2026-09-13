import type { Quality } from "../types";
import { experienceConfig } from "../experience.config";

export interface QualitySettings {
  tier: Quality;
  dpr: [number, number];
  shadows: boolean;
  shadowMapSize: number;
  grain: boolean;
  contactShadows: boolean;
  spatialAudio: boolean;
  /** full EffectComposer (bloom/DOF/CA/noise/vignette) — high tier only */
  postprocess: boolean;
}

function detectTier(): Quality {
  if (typeof window === "undefined") return "high";
  const nav = navigator as Navigator & { deviceMemory?: number };
  const gpu = typeof nav.hardwareConcurrency === "number" ? nav.hardwareConcurrency : 4;
  const mem = nav.deviceMemory ?? 8;
  const isTouch = matchMedia("(pointer: coarse)").matches;
  if (mem <= 2 || gpu <= 2 || isTouch && mem <= 4) return "low";
  if (mem <= 4 || gpu <= 4) return "medium";
  return "high";
}

function webgl2(): boolean {
  try {
    return !!document.createElement("canvas").getContext("webgl2");
  } catch {
    return false;
  }
}

export function getQuality(): QualitySettings {
  const tier = detectTier();
  const postprocess = tier === "high" && experienceConfig.postprocessing.enabled && webgl2();

  const maps: Record<Quality, Omit<QualitySettings, "postprocess">> = {
    high: {
      tier,
      dpr: [1, 2],
      shadows: true,
      shadowMapSize: 2048,
      grain: !postprocess,
      contactShadows: true,
      spatialAudio: true,
    },
    medium: {
      tier,
      dpr: [1, 1.5],
      shadows: true,
      shadowMapSize: 1024,
      grain: true,
      contactShadows: true,
      spatialAudio: false,
    },
    low: {
      tier,
      dpr: [1, 1],
      shadows: false,
      shadowMapSize: 0,
      grain: false,
      contactShadows: false,
      spatialAudio: false,
    },
  };
  return { ...maps[tier], postprocess };
}

export const quality = getQuality();
export const prefersReducedMotion =
  typeof window !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
