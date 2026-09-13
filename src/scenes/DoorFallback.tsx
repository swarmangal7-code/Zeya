import { useEffect, useRef } from "react";
import gsap from "gsap";
import { useExperience } from "../state/useExperience";
import { onDoor } from "./doorEvents";

/**
 * WebGL-free cinematic door (CSS 3D). Same staging, feedback and flow as the
 * R3F door — used automatically when WebGL is unavailable.
 */
export function DoorFallback() {
  const frame = useRef<HTMLDivElement>(null);
  const left = useRef<HTMLDivElement>(null);
  const right = useRef<HTMLDivElement>(null);
  const glow = useRef<HTMLDivElement>(null);
  const floor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const offKnock = onDoor("knock", (d) => {
      const el = d.variant === 1 ? left.current : right.current;
      if (!el || !frame.current) return;
      gsap.fromTo(el, { rotateY: 0, rotateZ: 0 }, {
        rotateY: d.variant === 1 ? -1.6 : 1.6,
        rotateZ: d.variant === 1 ? -0.4 : 0.4,
        duration: 0.5,
        ease: "power3.out",
        onComplete: () => gsap.to(el, { rotateY: 0, rotateZ: 0, duration: 0.6, ease: "elastic.out(1,0.4)" }),
      });
      gsap.fromTo(frame.current, { x: 0 }, { x: d.variant === 1 ? -2 : 2, duration: 0.09, yoyo: true, repeat: 1, ease: "none" });
    });

    const offOpen = onDoor("open", () => {
      const setStage = useExperience.getState().setStage;
      gsap.set([left.current, right.current], { transformOrigin: "50% 50%", transformPerspective: 1100 });
      gsap
        .timeline()
        .to(glow.current, { opacity: 1, duration: 2.8, ease: "power2.out" }, 0.4)
        .to(left.current, { rotateY: -60, duration: 4.4, ease: "power3.inOut" }, 0)
        .to(right.current, { rotateY: 60, duration: 4.4, ease: "power3.inOut" }, 0)
        .to(frame.current, { opacity: 0, duration: 1.4 }, 3.4)
        .to(floor.current, { opacity: 0.15, duration: 2.4 }, 1.2)
        .call(() => setStage("revealing"), undefined, 2.1)
        .call(() => setStage("revealed"), undefined, 3.6);
    });

    return () => {
      offKnock();
      offOpen();
    };
  }, []);

  return (
    <div className="dfb">
      <div className="dfb__glow" ref={glow} />
      <div className="dfb__frame" ref={frame}>
        <div className="dfb__leaf dfb__leaf--l" ref={left}>
          <div className="dfb__panel dfb__panel--top" />
          <div className="dfb__panel dfb__panel--mid" />
          <div className="dfb__handle" />
        </div>
        <div className="dfb__leaf dfb__leaf--r" ref={right}>
          <div className="dfb__panel dfb__panel--top" />
          <div className="dfb__panel dfb__panel--mid" />
          <div className="dfb__handle" />
        </div>
      </div>
      <div className="dfb__floor" ref={floor} />
    </div>
  );
}