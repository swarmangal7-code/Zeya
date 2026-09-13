import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useExperience } from "../state/useExperience";
import { experienceConfig } from "../experience.config";
import { audio } from "../audio/AudioManager";
import { quality, prefersReducedMotion } from "../lib/quality";
import { Atmosphere } from "../components/Atmosphere";

const DIGITS = 4;

/**
 * Cinema lockscreen. A live clock, a quiet room, and a four-digit PIN
 * gate with an operating-system-style unlock sequence.
 */
export function LockScreenScene() {
  const setStage = useExperience((s) => s.setStage);
  const stage = useExperience((s) => s.stage);

  const root = useRef<HTMLDivElement>(null);
  const light = useRef<HTMLDivElement>(null);
  const err = useRef<HTMLDivElement>(null);
  const hint = useRef<HTMLDivElement>(null);
  const pinBox = useRef<HTMLDivElement>(null);

  const [vals, setVals] = useState<string[]>(Array(DIGITS).fill(""));
  const [now, setNow] = useState(() => new Date());
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const busy = useRef(false);

  const pin = experienceConfig.pin;
  const { hint: hintText } = experienceConfig.text.lock;

  // live clock
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(id);
  }, []);

  // settle in + focus first digit
  useEffect(() => {
    const tl = gsap.timeline({ delay: 0.4 });
    tl.fromTo(".lock-screen__content", { opacity: 0, y: 18, filter: "blur(8px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 1.4, ease: "power3.out" });
    tl.call(() => inputs.current[0]?.focus(), undefined, 1.2);
    return () => {
      tl.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      gsap.fromTo(box, { x: 0 }, { keyframes: [{ x: -10, duration: 0.06 }, { x: 9, duration: 0.06 }, { x: -6, duration: 0.06 }, { x: 4, duration: 0.06 }, { x: 0, duration: 0.07 }], onComplete: () => (busy.current = false) });
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

    const reduce = prefersReducedMotion;
    const tl = gsap.timeline();
    // 1. digits illuminate
    tl.to(".lock-screen__input", {
      borderColor: "rgba(201,163,95,0.9)",
      backgroundColor: "rgba(201,163,95,0.12)",
      color: "#f2e6cf",
      boxShadow: "0 0 26px rgba(201,163,95,0.35)",
      duration: 0.7,
      stagger: 0.06,
      ease: "power2.out",
    }, 0);
    // 2. the room brightens
    tl.to(light.current, { opacity: 1, duration: 1.6, ease: "power2.inOut" }, 0.1);
    // 3. hint dissolves
    tl.to(hint.current, { opacity: 0, y: -10, filter: "blur(6px)", duration: 0.7, ease: "power2.in" }, 0.6);
    if (!reduce) {
      // 4. zoom inward
      tl.to(".lock-screen__content", { scale: 1.045, y: -14, duration: 2.0, ease: "power2.inOut" }, 0.3);
    }
    tl.to(".lock-screen__clock", { opacity: 0, duration: 0.7, ease: "power2.in" }, 0.9);
    // 5. the whole lock screen melts into the world
    tl.call(() => setStage("door_idle"), undefined, reduce ? 0.7 : 1.5);
    tl.to(root.current, { opacity: 0, duration: reduce ? 0.5 : 1.0, ease: "power2.inOut" }, "<");
  };

  const setDigit = (i: number, text: string) => {
    const digits = text.replace(/\D/g, "").slice(-1);
    setVals((prev) => {
      const next = [...prev];
      next[i] = digits;
      return next;
    });
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

  // auto-submit once full
  useEffect(() => {
    if (vals.every((v) => v !== "") && stage === "locked") commit();
  }, [vals, stage, commit]);

  const time = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }).replace("24:", "00:");
  const date = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="screen lock-screen" ref={root}>
      <div className="lock-screen__room" />
      <div className="lock-screen__light" ref={light} />
      <div className="lock-screen__err" ref={err} />
      <Atmosphere count={Math.round(90 * quality.maxParticleRatio)} color="rgba(255,220,180,0.4)" speed={0.16} />
      <div className="lock-screen__content" ref={hint}>
        <div className="lock-screen__clock">
          <span className="lock-screen__time">{time}</span>
          <span className="lock-screen__date">{date}</span>
        </div>
        <div className="lock-screen__pin" ref={pinBox} data-cursor="pin">
          <p className="lock-screen__hint">{hintText}</p>
          <div className="lock-screen__inputs" role="group" aria-label="Four digit PIN">
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
                aria-label={`Digit ${i + 1} of the door PIN`}
                onChange={(e) => setDigit(i, e.target.value)}
                onKeyDown={(e) => onKeyDown(i, e)}
                onPaste={onPaste}
              />
            ))}
          </div>
        </div>
      </div>
      <p className="lock-screen__foot" aria-hidden>&#8727;</p>
    </div>
  );
}