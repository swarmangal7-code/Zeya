import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "../lib/quality";

/**
 * Premium desktop cursor: a soft dot + lagging ring that expands over
 * interactive elements and can carry a label (e.g. "OPEN").
 * Never rendered on touch devices or when reduced motion is set.
 */
export function Cursor() {
  const [enabled] = useState(
    () => typeof window !== "undefined" && matchMedia("(pointer: fine)").matches && !prefersReducedMotion,
  );
  const ring = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled) return;
    document.documentElement.classList.add("has-cursor");

    const ringEl = ring.current!;
    const dotEl = dot.current!;
    let x = innerWidth / 2, y = innerHeight / 2;
    let rx = x, ry = y;
    let raf = 0;

    const onMove = (e: MouseEvent) => {
      x = e.clientX;
      y = e.clientY;
      const t = (e.target as Element | null)?.closest?.('[data-cursor], a, button, [role="button"], input, select, textarea, label') as Element | null;
      ringEl.classList.toggle("is-hover", !!t);
      if (t?.getAttribute("data-cursor")) ringEl.setAttribute("data-label", t.getAttribute("data-cursor")!);
      else ringEl.removeAttribute("data-label");
    };
    const onLeave = () => { ringEl.classList.add("is-idle"); };
    const onEnter = () => { ringEl.classList.remove("is-idle"); };

    const loop = () => {
      rx += (x - rx) * 0.16;
      ry += (y - ry) * 0.16;
      ringEl.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;
      dotEl.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
      raf = requestAnimationFrame(loop);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseleave", onLeave);
    window.addEventListener("mouseenter", onEnter);
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("mouseenter", onEnter);
      document.documentElement.classList.remove("has-cursor");
    };
  }, [enabled]);

  if (!enabled) return null;
  return (
    <>
      <div ref={ring} className="cursor-ring" aria-hidden />
      <div ref={dot} className="cursor-dot" aria-hidden />
    </>
  );
}