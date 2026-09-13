import { experienceConfig } from "../experience.config";
import { makeImpulseResponse } from "../lib/textures";
import { quality } from "../lib/quality";
import { useExperience } from "../state/useExperience";

/**
 * Procedural audio. No audio files — everything is synthesized with the
 * Web Audio API. Swap in real samples later by replacing a play function.
 */
class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private ambBus: GainNode | null = null;
  private convolver: ConvolverNode | null = null;
  private preDelay: DelayNode | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private ambientNodes: AudioScheduledSourceNode[] = [];
  private ambientGain: GainNode | null = null;
  private started = false;
  muted = false;
  /** last init failure, surfaced to the dev probe for debugging */
  lastError: string | null = null;

  /** Create the context and routing graph (no resume — safe pre-gesture). */
  private initCtx(): boolean {
    if (this.ctx) return true;
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0;
      this.master.connect(this.ctx.destination);

      this.convolver = this.ctx.createConvolver();
      this.convolver.buffer = makeImpulseResponse(1.9, 2.4, this.ctx.sampleRate);
      this.preDelay = this.ctx.createDelay(0.15);
      this.preDelay.delayTime.value = (experienceConfig.audio.preDelayMs || 32) / 1000;
      this.preDelay.connect(this.convolver);
      const wet = this.ctx.createGain();
      wet.gain.value = 0.38;
      this.convolver.connect(wet);
      wet.connect(this.master);

      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = experienceConfig.audio.sfxVolume;
      this.sfxBus.connect(this.master);
      this.ambBus = this.ctx.createGain();
      /** must be audible — the ambient swarm fades itself in via startAmbient */
      this.ambBus.gain.value = 1;
      this.ambBus.connect(this.master);
      return true;
    } catch (err) {
      this.ctx = null;
      this.lastError = err instanceof Error ? err.message : String(err);
      return false;
    }
  }

  /** Call on first user gesture to satisfy autoplay policies. */
  async unlock(): Promise<void> {
    if (!experienceConfig.audio.enabled) return;
    try {
      if (!this.initCtx()) return;
      if (this.ctx && this.ctx.state === "suspended") await this.ctx.resume();
    } catch (err) {
      this.ctx = null;
      this.lastError = err instanceof Error ? err.message : String(err);
    }
  }

  /**
   * Try to decode optional real samples from /public/audio. Fails silently;
   * the synth fallback keeps playing. Should run during the loading screen.
   */
  async warm(manifest: readonly string[]): Promise<void> {
    if (!experienceConfig.audio.enabled) return;
    if (!this.initCtx()) return;
    for (const name of manifest) {
      if (this.buffers.has(name)) continue;
      for (const ext of ["mp3", "ogg", "wav"]) {
        try {
          const r = await fetch(`/audio/${name}.${ext}`, { signal: AbortSignal.timeout(1500) });
          if (!r.ok) continue;
          const data = await r.arrayBuffer();
          this.buffers.set(name, await this.ctx!.decodeAudioData(data));
          break;
        } catch {
          /* try next extension */
        }
      }
    }
  }

  /** Roomsized send: pre-delay straight into the convolution tail. */
  private roomTail(out: AudioNode, gain = 0.6): void {
    if (!this.ctx || !this.preDelay || !quality.spatialAudio) return;
    const send = this.ctx.createGain();
    send.gain.value = gain;
    out.connect(send);
    send.connect(this.preDelay);
  }

  applyMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.linearRampToValueAtTime(muted ? 0 : 1, this.ctx.currentTime + 0.2);
    }
  }

  private ensure(): boolean {
    return !!(this.ctx && this.sfxBus && this.master && this.ctx.state === "running");
  }

  /* ------------------------------------------------------------------ */

  private noiseBuffer(duration = 1): AudioBuffer {
    const rate = this.ctx!.sampleRate;
    const len = Math.floor(rate * duration);
    const buf = this.ctx!.createBuffer(1, len, rate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  private noiseSource(sample: AudioBuffer): AudioBufferSourceNode {
    const src = this.ctx!.createBufferSource();
    src.buffer = sample;
    return src;
  }

  /** Dull physical thump + filtered air, fed into the room's reverb. */
  knock(variant = 0): void {
    if (!this.ensure()) return;
    const t = this.ctx!.currentTime;
    const c = this.ctx!;
    const pan = experienceConfig.audio.spatialize ? (variant === 1 ? -0.55 : 0.55) : 0;
    const panner: StereoPannerNode | null =
      typeof c.createStereoPanner === "function" ? c.createStereoPanner() : null;
    if (panner) panner.pan.value = pan;

    const out = c.createGain();
    out.gain.value = 1;
    const wire = () => {
      if (panner) {
        out.connect(panner);
        panner.connect(this.sfxBus!);
      } else {
        out.connect(this.sfxBus!);
      }
      this.roomTail(out, 0.7);
    };
    wire();

    // real sample if one was decoded during warm-up
    const buf = this.buffers.get(variant === 1 ? "knock1" : "knock2");
    if (buf) {
      const src = this.noiseSource(buf);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(variant === 1 ? 1 : 0.9, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
      src.connect(g);
      g.connect(out);
      src.start(t);
      src.stop(t + 1.8);
      return;
    }

    // low body
    const o = c.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(150 + variant * 6, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.22);
    const og = c.createGain();
    og.gain.setValueAtTime(0.001, t);
    og.gain.exponentialRampToValueAtTime(0.85, t + 0.005);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.26);
    o.connect(og).connect(out);
    o.start(t);
    o.stop(t + 0.3);

    // strike transient
    const noise = this.noiseSource(this.noiseBuffer(0.14));
    const bp = c.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1700 + variant * 320;
    bp.Q.value = 1.4;
    const ng = c.createGain();
    ng.gain.setValueAtTime(0.0001, t);
    ng.gain.exponentialRampToValueAtTime(0.5, t + 0.004);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
    noise.connect(bp).connect(ng).connect(out);
    noise.start(t);
    noise.stop(t + 0.16);
  }

  /** Long rising whisper of air as the door swings. */
  doorOpen(): void {
    if (!this.ensure()) return;
    const t = this.ctx!.currentTime;
    const c = this.ctx!;
    const out = c.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(0.5, t + 1.6);
    out.gain.exponentialRampToValueAtTime(0.0001, t + 5.2);
    out.connect(this.sfxBus!);
    this.roomTail(out, 0.45);

    const noise = this.noiseSource(this.noiseBuffer(6));
    noise.loop = true;
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.Q.value = 0.6;
    lp.frequency.setValueAtTime(220, t);
    lp.frequency.linearRampToValueAtTime(900, t + 2.2);
    lp.frequency.linearRampToValueAtTime(300, t + 5);
    noise.connect(lp).connect(out);
    noise.start(t);
    noise.stop(t + 5.4);

    // deep wooden groan
    const o = c.createOscillator();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(72, t);
    o.frequency.linearRampToValueAtTime(118, t + 1.2);
    o.frequency.linearRampToValueAtTime(60, t + 4.4);
    const lp2 = c.createBiquadFilter();
    lp2.type = "lowpass";
    lp2.frequency.setValueAtTime(160, t);
    const og = c.createGain();
    og.gain.setValueAtTime(0.0001, t);
    og.gain.exponentialRampToValueAtTime(0.12, t + 0.9);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 4.6);
    o.connect(lp2).connect(og).connect(out);
    o.start(t);
    o.stop(t + 4.8);
  }

  /** Soft warm chime on successful unlock. */
  chime(): void {
    if (!this.ensure()) return;
    const t = this.ctx!.currentTime;
    const c = this.ctx!;
    const out = c.createGain();
    out.connect(this.sfxBus!);
    const notes = [392, 523.25, 659.25];
    notes.forEach((f, i) => {
      const o = c.createOscillator();
      o.type = "sine";
      o.frequency.value = f;
      const g = c.createGain();
      const start = t + i * 0.12;
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(0.18, start + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, start + 1.4);
      o.connect(g).connect(out);
      o.start(start);
      o.stop(start + 1.5);
    });
  }

  /** Low dull thud for wrong PIN. */
  error(): void {
    if (!this.ensure()) return;
    const t = this.ctx!.currentTime;
    const c = this.ctx!;
    const out = c.createGain();
    out.connect(this.sfxBus!);
    const o = c.createOscillator();
    o.type = "triangle";
    o.frequency.setValueAtTime(110, t);
    o.frequency.exponentialRampToValueAtTime(55, t + 0.3);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.3, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 0.5);
  }

  /** Tiny tick for PIN digits / buttons. */
  click(): void {
    if (!this.ensure()) return;
    const t = this.ctx!.currentTime;
    const c = this.ctx!;
    const o = c.createOscillator();
    o.type = "sine";
    o.frequency.value = 1250;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.08, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    o.connect(g).connect(this.sfxBus!);
    o.start(t);
    o.stop(t + 0.08);
  }

  /**
   * Low ambient drone. Two detuned saws through a slow filter.
   * Idempotent; fades in.
   */
  startAmbient(): void {
    if (!this.ensure() || this.started) return;
    this.started = true;
    const t = this.ctx!.currentTime;
    const c = this.ctx!;
    this.ambientGain = c.createGain();
    this.ambientGain.gain.setValueAtTime(0.0001, t);
    this.ambientGain.gain.exponentialRampToValueAtTime(
      experienceConfig.audio.ambientVolume,
      t + experienceConfig.audio.fadeInMs / 1000,
    );
    this.ambientGain.connect(this.ambBus!);

    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 220;
    this.ambientGain.connect(lp);
    lp.connect(this.master!);

    const oscs: (OscillatorNode | OscillatorNode)[] = [];
    const freqs = [55, 55.5, 110.2];
    freqs.forEach((f) => {
      const o = c.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = f;
      const g = c.createGain();
      g.gain.value = 0.5;
      o.connect(g).connect(lp);
      o.start(t);
      oscs.push(o);
    });

    // slow breathing LFO
    const lfo = c.createOscillator();
    lfo.frequency.value = 0.05;
    const lfoGain = c.createGain();
    lfoGain.gain.value = 80;
    lfo.connect(lfoGain).connect(lp.frequency);
    lfo.start(t);
    oscs.push(lfo);

    this.ambientNodes = oscs;
  }

  stopAmbient(): void {
    if (!this.ctx || !this.ambientGain) return;
    const t = this.ctx.currentTime;
    this.ambientGain.gain.cancelScheduledValues(t);
    this.ambientGain.gain.linearRampToValueAtTime(0.0001, t + experienceConfig.audio.fadeOutMs / 1000);
    const nodes = this.ambientNodes;
    this.ambientNodes = [];
    setTimeout(() => nodes.forEach((n) => { try { n.stop(); } catch { /* already stopped */ } }), experienceConfig.audio.fadeOutMs + 200);
    this.started = false;
    this.ambientGain = null;
  }

  /** Lift ambient drone toward the reveal's brighter tone. */
  brightenAmbient(): void {
    if (!this.ctx || !this.ambientNodes.length) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const o = this.ambientNodes[i] as OscillatorNode;
      try { o.frequency.linearRampToValueAtTime(o.frequency.value + 8, t + 3); } catch { /* noop */ }
    }
  }

  /** Slow harmonic swell as the world behind the door arrives. */
  revealSwell(): void {
    if (!this.ensure()) return;
    const t = this.ctx!.currentTime;
    const c = this.ctx!;
    const out = c.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.linearRampToValueAtTime(0.05, t + 3.5);
    out.gain.linearRampToValueAtTime(0.0001, t + 9.5);
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 720;
    out.connect(lp).connect(this.master!);

    [65.41, 98.0, 130.81, 196.0].forEach((f, i) => {
      const o = c.createOscillator();
      o.type = "sine";
      o.frequency.value = f;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.35, t + 1.4 + i * 0.4);
      g.gain.linearRampToValueAtTime(0.0001, t + 9);
      o.connect(g).connect(lp);
      o.start(t);
      o.stop(t + 9.2);
    });

    // breath of air crossing the threshold
    const noise = this.noiseSource(this.noiseBuffer(8));
    noise.loop = true;
    const bp = c.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1400;
    bp.Q.value = 0.7;
    const ng = c.createGain();
    ng.gain.setValueAtTime(0.0001, t);
    ng.gain.linearRampToValueAtTime(0.018, t + 2.6);
    ng.gain.linearRampToValueAtTime(0.0001, t + 8);
    noise.connect(bp).connect(ng).connect(out);
    noise.start(t);
    noise.stop(t + 8.2);
  }
}

export const audio = new AudioManager();

/** Bind audio to the first user gesture (mobile-safe autoplay). */
export function initAudioOnInteraction(): void {
  const unlock = () => {
    audio.unlock();
    audio.applyMuted(useExperience.getState().muted);
  };
  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });
  window.addEventListener("touchstart", unlock, { once: true, passive: true });
}