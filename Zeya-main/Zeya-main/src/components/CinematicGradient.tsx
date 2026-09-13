import { useEffect, useMemo, useRef } from "react";
import gsap from "gsap";
import { experienceConfig } from "../experience.config";
import type { GradientVariantKey } from "../experience.config";
import { prefersReducedMotion } from "../lib/quality";

interface Layer {
  color: string;
  x: number; // percents of viewport
  y: number;
  size: number; // vmax
  blur: number;
  drift: number;
  opacity: number;
}

/**
 * The single flowing gradient universe behind the experience.
 * A few huge, very heavily blurred color fields — almost light through
 * frosted glass — drifted so slowly the motion is subconscious. Gently
 * parallaxes with the pointer. One fixed instance runs beneath the WebGL
 * world and every DOM scene, keeping the whole site one continuous space.
 */
export function CinematicGradient({ variant }: { variant: GradientVariantKey }) {
  const root = useRef<HTMLDivElement>(null);
  const par = useRef<HTMLDivElement>(null);
  const cfg = experienceConfig.gradient;
  const v = cfg.variants[variant];

  const layers = useMemo<Layer[]>(() => {
    const specs: Array<[number, number, number, number, number, number]> = [
      [14, 20, 220, 240, 9, 0.42],
      [86, 26, 200, 220, 8, 0.4],
      [44, 92, 250, 260, 11, 0.44],
      [6, 96, 180, 200, 7, 0.38],
      [44, 44, 340, 300, 6, 0.3],
      [70, 72, 160, 180, 5, 0.3],
    ];
    return specs.map(([x, y, size, blur, drift, opacity], i) => ({
      color: i < v.palette.length ? v.palette[i] : v.accent,
      x,
      y,
      size,
      blur,
      drift: i === v.palette.length ? 5 : drift,
      opacity,
    }));
  }, [v]);

  // slow, near-subliminal drift
  useEffect(() => {
    if (prefersReducedMotion || !cfg.enabled) return;
    const el = root.current;
    if (!el) return;
    const children = el.querySelectorAll<HTMLElement>(".cgrad__layer");
    const tl = gsap.timeline({ repeat: -1 });
    children.forEach((child, i) => {
      const d = layers[i].drift;
      const amp = d / 2;
      const dur = (cfg.motionMs / 1000) * (0.8 + Math.random() * 0.5);
      tl.fromTo(
        child,
        { xPercent: -amp, yPercent: -amp, scale: 1.0, rotation: i * 13 },
        {
          xPercent: amp,
          yPercent: amp,
          scale: 1.06,
          rotation: i * 13 + 5,
          duration: dur,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
        },
        -dur * Math.random(),
      );
    });
    return () => {
      tl.kill();
    };
  }, [layers, v, cfg.enabled, cfg.motionMs]);

  // micro parallax with the pointer — the environment "breathes" with you
  useEffect(() => {
    const el = par.current;
    if (!el || prefersReducedMotion || !cfg.enabled) return;
    const qx = gsap.quickTo(el, "x", { duration: 1.6, ease: "power3.out" });
    const qy = gsap.quickTo(el, "y", { duration: 1.6, ease: "power3.out" });
    const onMove = (e: PointerEvent) => {
      const nx = e.clientX / window.innerWidth - 0.5;
      const ny = e.clientY / window.innerHeight - 0.5;
      qx(-nx * 26);
      qy(-ny * 18);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [cfg.enabled]);

  return (
    <div className="cgrad" ref={root} data-variant={variant} aria-hidden>
      <div ref={par} className="cgrad__parallax">
        <div className="cgrad__bg" />
        {layers.map((ly, i) => (
          <div
            key={i}
            className="cgrad__layer"
            style={{
              width: `${ly.size}vmax`,
              height: `${ly.size}vmax`,
              left: `${ly.x}%`,
              top: `${ly.y}%`,
              background: `radial-gradient(circle at 50% 50%, ${ly.color} 0%, ${ly.color}00 70%)`,
              filter: `blur(${ly.blur}px)`,
              opacity: ly.opacity,
            }}
          />
        ))}
      </div>
      <div className="cgrad__veil" style={{ background: `rgba(5,7,12,${cfg.veil})` }} />
    </div>
  );
}