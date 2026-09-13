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
 * Oversized blurred radial color fields drifted extremely slowly with GSAP
 * (transform-only, so it stays cheap even on mobile). One fixed instance
 * runs beneath the WebGL world and every DOM scene, making the whole site
 * feel like one continuous cinematic space.
 */
export function CinematicGradient({ variant }: { variant: GradientVariantKey }) {
  const root = useRef<HTMLDivElement>(null);
  const cfg = experienceConfig.gradient;
  const v = cfg.variants[variant];

  const layers = useMemo<Layer[]>(() => {
    const specs: Array<[number, number, number, number, number]> = [
      [18, 28, 150, 120, 16],
      [82, 36, 130, 110, 14],
      [46, 88, 165, 130, 18],
      [8, 94, 120, 100, 12],
      [50, 45, 70, 150, 10],
    ];
    return specs.map(([x, y, size, blur, drift], i) => ({
      color: i < v.palette.length ? v.palette[i] : v.accent,
      x,
      y,
      size,
      blur,
      drift: i === specs.length - 1 ? 8 : drift,
      opacity: i === specs.length - 1 ? 0.22 : 0.5,
    }));
  }, [v]);

  useEffect(() => {
    if (prefersReducedMotion || !cfg.enabled) return;
    const el = root.current;
    if (!el) return;

    const children = el.querySelectorAll<HTMLElement>(".cgrad__layer");
    const tl = gsap.timeline({ repeat: -1 });
    children.forEach((child, i) => {
      const d = layers[i].drift;
      const dur = cfg.motionMs / 1000 * (0.75 + Math.random() * 0.5);
      const amp = d / 2;
      tl.fromTo(
        child,
        { xPercent: -amp, yPercent: -amp, scale: 0.94, rotation: i * 17 },
        {
          xPercent: amp,
          yPercent: amp,
          scale: 1.08,
          rotation: i * 17 + 8,
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

  return (
    <div className="cgrad" ref={root} data-variant={variant} aria-hidden>
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
            background: `radial-gradient(circle at 50% 50%, ${ly.color} 0%, ${ly.color}00 68%)`,
            filter: `blur(${ly.blur}px)`,
            opacity: ly.opacity,
          }}
        />
      ))}
      <div className="cgrad__veil" style={{ background: `rgba(5,7,12,${cfg.veil})` }} />
    </div>
  );
}