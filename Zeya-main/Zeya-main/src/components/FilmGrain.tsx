import { useEffect, useRef } from "react";
import { quality, prefersReducedMotion } from "../lib/quality";

/**
 * Live film grain — a full-viewport noise canvas refreshed every frame.
 * Skipped entirely on low tier or when reduced motion is requested.
 */
export function FilmGrain() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!quality.grain || prefersReducedMotion) return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(1, window.devicePixelRatio || 1);
    const resize = () => {
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };
    resize();

    // pre-render a noise tile for cheap per-frame blitting
    const tile = document.createElement("canvas");
    tile.width = tile.height = 64;
    const tctx = tile.getContext("2d")!;
    const idt = tctx.createImageData(64, 64);
    const buf = idt.data;
    for (let i = 0; i < buf.length; i += 4) {
      const v = 128 + Math.random() * 40;
      buf[i] = buf[i + 1] = buf[i + 2] = v;
      buf[i + 3] = 255;
    }
    tctx.putImageData(idt, 0, 0);
    const pattern = ctx.createPattern(tile, "repeat")!;

    let raf = 0;
    let last = 0;
    const frame = (t: number) => {
      if (t - last > 50) {
        last = t;
        ctx.fillStyle = pattern;
        ctx.globalAlpha = 0.05;
        ctx.globalCompositeOperation = "overlay";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} className="grain" aria-hidden />;
}