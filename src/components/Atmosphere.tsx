import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "../lib/quality";

interface Mote {
  x: number;
  y: number;
  r: number;
  v: number;
  drift: number;
  phase: number;
}

/**
 * Floating-mote canvas layer. GPU-friendly, cheap, reused by every DOM
 * scene (loading, lock screen, reveal).
 */
export function Atmosphere({
  count = 80,
  color = "rgba(255,225,190,0.5)",
  speed = 0.16,
  large = false,
  className = "",
}: {
  count?: number;
  color?: string;
  speed?: number;
  large?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const motes = useRef<Mote[]>([]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      motes.current = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: large ? 0.5 + Math.random() * 1.6 : 0.3 + Math.random() * 1.1,
        v: speed * (0.4 + Math.random() * 0.9),
        drift: (Math.random() - 0.5) * 0.1,
        phase: Math.random() * Math.PI * 2,
      }));
    };
    resize();
    window.addEventListener("resize", resize);

    let raf = 0;
    const step = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      for (const m of motes.current) {
        m.y -= m.v;
        m.x += Math.sin(t * 0.0002 + m.phase) * m.drift;
        if (m.y < -4) {
          m.y = h + 4;
          m.x = Math.random() * w;
        }
        const a = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(t * 0.0012 + m.phase));
        ctx.globalAlpha = a;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(step);
    };
    if (prefersReducedMotion) {
      // single static billow of motes
      for (const m of motes.current) {
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      raf = requestAnimationFrame(step);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [count, color, speed, large]);

  return <canvas ref={ref} className={`atmosphere ${className}`} aria-hidden />;
}