import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useExperience } from "../state/useExperience";
import { experienceConfig } from "../experience.config";
import { audio } from "../audio/AudioManager";
import { prefersReducedMotion } from "../lib/quality";

const DIGITS = 4;

/**
 * The private entry — a quiet, cool lockscreen. Live clock, serene
 * negative space, and a four-digit code gate with an operating-system
 * style unlock. No decoration; the atmosphere is the medium.
 */
export function LockScreenScene() {
  const setStage = useExperience((s) => s.setStage);
  const stage = useExperience((s) => s.stage);

  const root = useRef<HTMLDivElement>(null);
  const light = useRef<HTMLDivElement>(null);
  const err = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const pinBox = useRef<HTMLDivElement>(null);
  const clock = useRef<HTMLDivElement>(null);

  const [vals, setVals] = useState<string[]>(Array(DIGITS).fill(""));
  const [now, setNow] = useState(() => new Date());
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const busy = useRef(false);

  const pin = experienceConfig.pin;
  const { hint, greeting } = experienceConfig.text.lock;
  const reduce = prefersReducedMotion;

  // live clock
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(id);
  }, []);

  // settle in — slow resolve, then attention drops to the code
  useEffect(() => {
    const settle = experienceConfig.timings.lock.settleIn;
    const tl = gsap.timeline({ delay: settle });
    tl.fromTo(content.current, { opacity: 0, y: 16, filter: "blur(7px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: reduce ? 0.8 : 1.6, ease: "power3.out" });
    tl.fromTo(".lock-screen__hint", { opacity: 0 }, { opacity: 0.8, duration: 1.0, ease: "power2.out" }, reduce ? 0.6 : 1.6);
    tl.call(() => inputs.current[0]?.focus(), undefined, reduce ? 0.4 : 1.9);
    return () => {
      tl.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce]);

  const commit = useCallback(() => {
    const entered = vals.join("");
    if (entered.length < DIGITS) return;
    if (busy.current) return;
    if (entered === pin) return unlock();
    fail();
  }, [vals, pin]);

  const fail = () => {
    busy.current = true;
    audio.error();
    const box = pinBox.current;
    if (box) {
      gsap.fromTo(box, { x: 0 }, {
        keyframes: [{ x: -9, duration: 0.06 }, { x: 8, duration: 0.06 }, { x: -5, duration: 0.06 }, { x: 4, duration: 0.06 }, { x: 0, duration: 0.07 }],
        onComplete: () => { busy.current = false; },
      });
    }
    if (err.current) {
      gsap.fromTo(err.current, { opacity: 0 }, { opacity: 1, duration: 0.5, yoyo: true, repeat: 1, ease: "power2.out" });
    }
    setTimeout(() => setVals(Array(DIGITS).fill("")), 520);
  };

  const unlock = () => {
    if (busy.current) return;
    busy.current = true;
    audio.chime();
    setStage("unlocking");

    const tl = gsap.timeline();
    // digits briefly illuminate
    tl.to(".lock-screen__input", {
      borderColor: "rgba(109,141,255,0.9)",
      color: "#F4F7FF",
      textShadow: "0 0 18px rgba(109,141,255,0.5)",
      duration: 0.6,
      stagger: 0.07,
      ease: "power2.out",
    }, 0);
    // cool light washes through
    tl.to(light.current, { opacity: 1, duration: 1.6, ease: "power2.inOut" }, 0.1);
    tl.to(".lock-screen__hint", { opacity: 0, y: -8, filter: "blur(5px)", duration: 0.6, ease: "power2.in" }, 0.55);
    if (!reduce) {
      tl.to(content.current, { scale: 1.035, y: -12, duration: 2.0, ease: "power2.inOut" }, 0.3);
    }
    tl.to(clock.current, { opacity: 0, duration: 0.7, ease: "power2.in" }, 0.85);
    // the room expands — hand off to the door world
    tl.call(() => setStage("door_idle"), undefined, reduce ? 0.7 : 1.5);
    tl.to(root.current, { opacity: 0, duration: reduce ? 0.5 : 1.1, ease: "power2.inOut" }, "<");
  };

  const setDigit = (i: number, text: string) => {
    const digits = text.replace(/\D/g, "").slice(-1);
    setVals((prev) => {
      const next = [...prev];
      next[i] = digits;
      return next;
    });
    const el = inputs.current[i];
    if (el && digits) {
      gsap.fromTo(el, { scale: 0.9, opacity: 0.6, filter: "blur(3px)" }, { scale: 1, opacity: 1, filter: "blur(0px)", duration: 0.26, ease: "power3.out" });
    }
    if (digits && i < DIGITS - 1) inputs.current[i + 1]?.focus();
    return digits;
  };

  const onKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (vals[i]) {
        setVals((prev) => {
          const next = [...prev];
          next[i] = "";
          return next;
        });
      } else if (i > 0) {
        inputs.current[i - 1]?.focus();
        setVals((prev) => {
          const next = [...prev];
          next[i - 1] = "";
          return next;
        });
      }
    } else if (e.key.length === 1 && /\D/.test(e.key)) {
      e.preventDefault();
    }
  };

  const onPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, DIGITS);
    if (!pasted) return;
    setVals(() => {
      const next = Array(DIGITS).fill("");
      for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
      return next;
    });
    if (pasted.length === DIGITS) {
      inputs.current[DIGITS - 1]?.blur();
      setTimeout(commit, 30);
    } else {
      inputs.current[pasted.length]?.focus();
    }
  };

  useEffect(() => {
    if (vals.every((v) => v !== "") && stage === "locked") commit();
  }, [vals, stage, commit]);

  const time = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }).replace("24:", "00:");
  const date = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="screen lock-screen" ref={root}>
      <div className="lock-screen__scrim" />
      <div className="lock-screen__light" ref={light} />
      <div className="lock-screen__err" ref={err} />

      <div className="lock-screen__content" ref={content}>
        <div className="lock-screen__clock" ref={clock}>
          <span className="lock-screen__time">{time}</span>
          <span className="lock-screen__date">{date}</span>
          {greeting && <span className="lock-screen__greeting">{greeting}</span>}
        </div>

        <div className="lock-screen__pin" ref={pinBox} data-cursor="pin">
          <p className="lock-screen__hint">{hint}</p>
          <div className="lock-screen__inputs" role="group" aria-label="Four digit code">
            {Array.from({ length: DIGITS }).map((_, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputs.current[i] = el;
                }}
                className="lock-screen__input"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={1}
                value={vals[i]}
                aria-label={`Digit ${i + 1} of the door code`}
                onChange={(e) => setDigit(i, e.target.value)}
                onKeyDown={(e) => onKeyDown(i, e)}
                onPaste={onPaste}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}