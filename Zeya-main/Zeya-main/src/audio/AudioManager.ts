import { experienceConfig } from "../experience.config";
import { makeImpulseResponse } from "../lib/textures";
import { quality } from "../lib/quality";
import { useExperience } from "../state/useExperience";

type SfxName = "knock1" | "knock2" | "door-open" | "unlock" | "error" | "click" | "enter";

interface SfxOptions {
  volume?: number;
  pan?: number;
  reverb?: number;
  rate?: number;
}

/**
 * Cinematic audio engine.
 *
 * Everything audible is pre-rendered ONCE into AudioBuffers during warm-up
 * (real sample files from /public/audio take priority; otherwise a
 * procedural analogue is synthesized ahead of time). Playback is always a
 * cached buffer -> gain -> pan -> bus (+ reverb send) — zero synthesis and
 * zero buffer allocation at interaction time, which is what eliminates the
 * audible hitches.
 *
 * One AudioContext, one graph, built exactly once.
 */
class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private ambBus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private reverbSend: GainNode | null = null;
  private wet: GainNode | null = null;

  /** decoded optional real sample files */
  private fileBuffers = new Map<string, AudioBuffer>();
  /** procedural samples rendered ahead of time */
  private synthBuffers = new Map<SfxName, AudioBuffer>();
  /** one long white-noise pool reused by swells/beds */
  private noisePool: AudioBuffer | null = null;
  /** pre-rendered ambient bed (or decoded ambient sample) */
  private ambientBed: AudioBuffer | null = null;
  private ambientSrc: AudioBufferSourceNode | null = null;
  private ambientGain: GainNode | null = null;
  private ambFilter: BiquadFilterNode | null = null;
  private started = false;
  private warmed = false;
  muted = false;

  /** last init failure, surfaced to the dev probe for debugging */
  lastError: string | null = null;

  /* ------------------------------------------------------------------ */
  /* Graph                                                              */
  /* ------------------------------------------------------------------ */

  /** Create the context and routing graph (no resume — safe pre-gesture). */
  private initCtx(): boolean {
    if (this.ctx) return true;
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return false;
      const c = (this.ctx = new AC());
      this.master = c.createGain();
      this.master.gain.value = 0;
      this.master.connect(c.destination);

      // reverb tail + pre-delay, built once
      const convolver = c.createConvolver();
      convolver.buffer = makeImpulseResponse(1.9, 2.4, c.sampleRate);
      this.wet = c.createGain();
      this.wet.gain.value = 0.32;
      convolver.connect(this.wet);
      this.wet.connect(this.master);
      const preDelay = c.createDelay(0.15);
      preDelay.delayTime.value = (experienceConfig.audio.preDelayMs || 32) / 1000;
      preDelay.connect(convolver);
      this.reverbSend = c.createGain();
      this.reverbSend.connect(preDelay);

      this.sfxBus = c.createGain();
      this.sfxBus.gain.value = experienceConfig.audio.sfxVolume;
      this.sfxBus.connect(this.master);
      this.ambBus = c.createGain();
      this.ambBus.gain.value = 1;
      this.ambBus.connect(this.master);
      this.musicBus = c.createGain();
      this.musicBus.gain.value = 0.85;
      this.musicBus.connect(this.master);
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
      if (!this.warmed) void this.warm(experienceConfig.audio.manifest as unknown as readonly string[]);
      if (this.ctx && this.ctx.state === "suspended") await this.ctx.resume();
    } catch (err) {
      this.ctx = null;
      this.lastError = err instanceof Error ? err.message : String(err);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Preload / render                                                   */
  /* ------------------------------------------------------------------ */

  private allocBuffer(seconds: number, channels = 1): AudioBuffer {
    const c = this.ctx!;
    return c.createBuffer(channels, Math.floor(c.sampleRate * seconds), c.sampleRate);
  }

  private synthNoise(seconds: number): AudioBuffer {
    const buf = this.allocBuffer(seconds);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  /** Render one SFX into a cached mono buffer, ahead of interaction. */
  private renderSfx(name: SfxName): AudioBuffer {
    const rate = this.ctx!.sampleRate;
    const make = (seconds: number) => {
      const buf = this.allocBuffer(seconds);
      return { buf, d: buf.getChannelData(0), s: Math.floor(rate * seconds) };
    };

    if (name === "knock1" || name === "knock2") {
      const { buf, d, s } = make(name === "knock2" ? 1.1 : 0.9);
      const f0 = name === "knock2" ? 165 : 150;
      let phase = 0;
      let prevN = 0;
      let hp = 0;
      for (let i = 0; i < s; i++) {
        const t = i / rate;
        // damped body thump sliding down in pitch
        const f = 42 + (f0 - 42) * Math.exp(-t / 0.085);
        phase += (Math.PI * 2 * f) / rate;
        const env = Math.min(1, t / 0.0016) * Math.exp(-t / 0.06);
        let v = Math.sin(phase) * env * 0.9;
        // strike transient (cheap high-passed noise)
        const n = Math.random() * 2 - 1;
        hp = 0.96 * hp - n + prevN;
        prevN = n;
        v += hp * Math.exp(-t / 0.03) * 0.34;
        // second, quieter contact for the coupled knock
        if (name === "knock2" && t > 0.13) {
          v += Math.sin(phase * 1.05) * Math.exp(-(t - 0.13) / 0.045) * 0.35;
        }
        d[i] = Math.max(-1, Math.min(1, v));
      }
      return buf;
    }

    if (name === "door-open") {
      const { buf, d, s } = make(4.4);
      let phase = 0;
      let lp = 0;
      let lpFreq = 260;
      for (let i = 0; i < s; i++) {
        const t = i / rate;
        // wooden groan, pitch rises then relaxes
        const g = Math.min(1, t / 1.1);
        const f = 78 + 42 * g - 26 * Math.min(1, Math.max(0, (t - 2.6) / 1.4));
        phase += (Math.PI * 2 * f) / rate;
        const genv = Math.min(1, t / 0.7) * Math.exp(-Math.max(0, t - 2.2) / 1.6) * 0.55;
        // air, filtered noise, intensity swells then collapses
        const n = Math.random() * 2 - 1;
        lpFreq = 260 + 900 * Math.min(1, t / 1.6) - 500 * Math.max(0, (t - 2.4) / 1.8);
        lp += (n - lp) * Math.min(1, (2 * Math.PI * Math.max(40, lpFreq)) / rate);
        const aenv = Math.min(1, t / 1.3) * (1 - 0.92 * Math.min(1, t / 4.4)) * 0.5;
        d[i] = Math.max(-1, Math.min(1, Math.sin(phase) * genv + lp * aenv));
        if (t > 4.2) d[i] *= Math.max(0, 1 - (t - 4.2) / 0.6);
      }
      return buf;
    }

    if (name === "unlock") {
      const { buf, d, s } = make(1.7);
      const notes = [392, 523.25, 659.25];
      const ph: number[] = notes.map(() => 0);
      for (let i = 0; i < s; i++) {
        const t = i / rate;
        let v = 0;
        notes.forEach((f, n) => {
          const tn = Math.max(0, t - n * 0.13);
          ph[n] += (Math.PI * 2 * f) / rate;
          v += Math.sin(ph[n]) * Math.exp(-tn / 1.15) * 0.55 * (tn > 0 ? 1 : 0);
        });
        d[i] = Math.max(-1, Math.min(1, v * 0.5));
      }
      return buf;
    }

    if (name === "error") {
      const { buf, d, s } = make(0.65);
      let phase = 0;
      for (let i = 0; i < s; i++) {
        const t = i / rate;
        const f = 110 * Math.exp(-t / 0.22) + 40;
        phase += (Math.PI * 2 * f) / rate;
        d[i] = Math.sin(phase) * Math.min(1, t / 0.006) * Math.exp(-t / 0.16) * 0.8;
        if (t > 0.5) d[i] *= Math.max(0, 1 - (t - 0.5) / 0.3);
      }
      return buf;
    }

    if (name === "enter") {
      const { buf, d, s } = make(1.8);
      let phase = 0;
      let lp = 0;
      let lpFreq = 400;
      for (let i = 0; i < s; i++) {
        const t = i / rate;
        const f = 200 + 700 * (t / 1.8);
        phase += (Math.PI * 2 * f) / rate;
        const n = Math.random() * 2 - 1;
        lpFreq = 400 + 600 * Math.min(1, t / 1.5);
        lp += (n - lp) * Math.min(1, (2 * Math.PI * lpFreq) / rate);
        const env = Math.min(1, t / 0.25) * Math.exp(-Math.max(0, t - 1.0) / 0.6) * 0.55;
        d[i] = Math.max(-1, Math.min(1, lp * env + Math.sin(phase) * env * 0.2));
      }
      return buf;
    }

    // click
    const { buf, d, s } = make(0.14);
    let phase = 0;
    for (let i = 0; i < s; i++) {
      const t = i / rate;
      phase += (Math.PI * 2 * 1300) / rate;
      d[i] = Math.sin(phase) * Math.min(1, t / 0.001) * Math.exp(-t / 0.02) * 0.9;
    }
    return buf;
  }

  /** A soft stereo underscore — felt, not noticed. 32s seamless loop. */
  private renderAmbientBed(): AudioBuffer {
    const c = this.ctx!;
    const rate = c.sampleRate;
    const dur = 32;
    const buf = c.createBuffer(2, Math.floor(rate * dur), rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      const det = ch === 0 ? -0.004 : 0.005;
      const p1: number[] = [55 * (1 + det), 55.6 * (1 + det), 110.2 * (1 + det), 220.4 * (1 + det)];
      const ph = p1.map(() => Math.random() * Math.PI * 2);
      let lp = 0;
      for (let i = 0; i < d.length; i++) {
        const t = i / rate;
        let v = 0;
        for (let k = 0; k < p1.length; k++) {
          ph[k] += (Math.PI * 2 * p1[k]) / rate;
          v += Math.sin(ph[k]);
        }
        const am = 0.78 + 0.22 * Math.sin((Math.PI * 2 * 0.05 * t) / 1 + ch * 0.7);
        const n = Math.random() * 2 - 1;
        lp += (n - lp) * Math.min(1, (2 * Math.PI * 180) / rate);
        const pad = (v * 0.16 * am + lp * 0.05);
        d[i] = Math.max(-1, Math.min(1, pad * 0.55));
      }
    }
    return buf;
  }

  /**
   * Preload pass. Renders procedural buffers, then tries to decode optional
   * real sample files (they override the procedural versions). Fails
   * silently; the app never depends on any file.
   */
  async warm(manifest: readonly string[]): Promise<void> {
    if (!experienceConfig.audio.enabled) return;
    if (this.warmed) return;
    if (!this.initCtx()) return;
    this.warmed = true;

    // procedural synthesis happens once, here
    this.noisePool = this.synthNoise(8);
    this.ambientBed = this.renderAmbientBed();
    for (const name of ["knock1", "knock2", "door-open", "unlock", "error", "click", "enter"] as const) {
      this.synthBuffers.set(name, this.renderSfx(name));
    }

    // optional real samples, decoded ahead of knock time
    for (const name of manifest) {
      if (name === "ambient") {
        const buf = await this.tryDecode(name);
        if (buf) this.ambientBed = buf;
        continue;
      }
      const buf = await this.tryDecode(name);
      if (buf) this.fileBuffers.set(name, buf);
    }
  }

  private async tryDecode(name: string): Promise<AudioBuffer | null> {
    const c = this.ctx;
    if (!c) return null;
    for (const ext of ["mp3", "ogg", "wav"]) {
      try {
        const r = await fetch(`/audio/${name}.${ext}`, { signal: AbortSignal.timeout(1800) });
        if (!r.ok) continue;
        const data = await r.arrayBuffer();
        return await c.decodeAudioData(data);
      } catch {
        /* try next extension */
      }
    }
    return null;
  }

  /* ------------------------------------------------------------------ */
  /* Playback                                                           */
  /* ------------------------------------------------------------------ */

  private ensure(): boolean {
    return !!(this.ctx && this.master && this.ctx.state === "running");
  }

  /** One cached buffer through gain → pan → SFX bus (+ reverb send). */
  private playSfx(name: SfxName, opts: SfxOptions = {}): void {
    if (!this.ensure()) return;
    const c = this.ctx!;
    let buf = this.fileBuffers.get(name);
    if (!buf) {
      buf = this.synthBuffers.get(name);
      if (!buf) {
        // warm skipped for some reason — synth one out right now, once
        this.synthBuffers.set(name, this.renderSfx(name));
        buf = this.synthBuffers.get(name)!;
      }
    }

    const t = c.currentTime;
    const vol = opts.volume ?? 0.85;
    const src = c.createBufferSource();
    src.buffer = buf;
    if (opts.rate) src.playbackRate.value = opts.rate;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.004);

    let head: AudioNode = g;
    if (typeof c.createStereoPanner === "function" && opts.pan) {
      const p = c.createStereoPanner();
      p.pan.value = opts.pan;
      g.connect(p);
      head = p;
    }
    head.connect(this.sfxBus!);

    if (opts.reverb && this.reverbSend) {
      const send = c.createGain();
      send.gain.value = Math.min(1, opts.reverb);
      g.connect(send);
      send.connect(this.reverbSend);
    }

    const tail = buf.duration + 0.05;
    src.start(t);
    src.stop(t + tail);
  }

  applyMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.linearRampToValueAtTime(muted ? 0 : 1, this.ctx.currentTime + 0.2);
    }
  }

  /** Knock — localized slightly to the knocking side of the door. */
  knock(variant = 0): void {
    const name: SfxName = variant === 1 ? "knock1" : "knock2";
    this.playSfx(name, {
      volume: 0.95,
      pan: experienceConfig.audio.spatialize ? (variant === 1 ? -0.16 : 0.16) : 0,
      reverb: quality.spatialAudio ? 0.75 : 0,
    });
  }

  /** Long wooden sigh as the door swings. */
  doorOpen(): void {
    this.playSfx("door-open", { volume: 0.9, pan: 0, reverb: quality.spatialAudio ? 0.4 : 0 });
  }

  /** Soft chime on successful unlock. */
  chime(): void {
    this.playSfx("unlock", { volume: 0.5, reverb: quality.spatialAudio ? 0.22 : 0 });
  }

  /** Low dull thud for a wrong PIN. */
  error(): void {
    this.playSfx("error", { volume: 0.5, reverb: quality.spatialAudio ? 0.2 : 0 });
  }

  /** Tiny tick for PIN digits / buttons. */
  click(): void {
    this.playSfx("click", { volume: 0.35 });
  }

  /** Subtle cinematic riser as the user physically passes through the doorway. */
  entryTransition(): void {
    this.playSfx("enter", { volume: 0.48, reverb: quality.spatialAudio ? 0.25 : 0 });
  }

  private interiorSrc: AudioBufferSourceNode | null = null;
  private interiorGain: GainNode | null = null;

  /**
   * A quieter, brighter version of the ambient bed that fades in once the
   * camera has entered the interior — layered with the existing bed so
   * the world quietly "opens up".
   */
  startInteriorAmbience(): void {
    if (!this.ensure() || !this.ambientBed || this.interiorSrc) return;
    const c = this.ctx!;
    const t = c.currentTime;
    this.interiorGain = c.createGain();
    this.interiorGain.gain.setValueAtTime(0.0001, t);
    this.interiorGain.gain.linearRampToValueAtTime(experienceConfig.audio.ambientVolume * 0.3, t + 2.8);
    this.interiorGain.connect(this.ambBus!);

    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 520;
    this.interiorGain.connect(lp);
    lp.connect(this.master!);

    const src = c.createBufferSource();
    src.buffer = this.ambientBed;
    src.playbackRate.value = 1.35;
    src.loop = true;
    src.connect(this.interiorGain);
    src.start(t);
    this.interiorSrc = src;
  }

  /* ------------------------------------------------------------------ */
  /* Ambient                                                            */
  /* ------------------------------------------------------------------ */

  /**
   * A single looping pre-rendered bed (sample file if provided, else the
   * synthesized underscore), breathing through a lowpass. Idempotent.
   */
  startAmbient(): void {
    if (!this.ensure() || this.started || !this.ambientBed) return;
    this.started = true;
    const c = this.ctx!;
    const t = c.currentTime;

    this.ambientGain = c.createGain();
    this.ambientGain.gain.setValueAtTime(0.0001, t);
    this.ambientGain.gain.exponentialRampToValueAtTime(
      experienceConfig.audio.ambientVolume,
      t + experienceConfig.audio.fadeInMs / 1000,
    );
    this.ambientGain.connect(this.ambBus!);

    this.ambFilter = c.createBiquadFilter();
    this.ambFilter.type = "lowpass";
    this.ambFilter.frequency.value = 240;
    this.ambFilter.Q.value = 0.4;
    this.ambientGain.connect(this.ambFilter);
    this.ambFilter.connect(this.master!);

    const src = c.createBufferSource();
    src.buffer = this.ambientBed;
    src.loop = true;
    src.connect(this.ambientGain);
    src.start(t);
    this.ambientSrc = src;

    // slow breathing on the filter
    const lfo = c.createOscillator();
    lfo.frequency.value = 0.04;
    const lg = c.createGain();
    lg.gain.value = 50;
    lfo.connect(lg);
    lg.connect(this.ambFilter.frequency);
    lfo.start(t);
  }

  stopAmbient(): void {
    if (!this.ctx || !this.ambientGain) return;
    const t = this.ctx.currentTime;
    this.ambientGain.gain.cancelScheduledValues(t);
    this.ambientGain.gain.linearRampToValueAtTime(0.0001, t + experienceConfig.audio.fadeOutMs / 1000);
    const dur = experienceConfig.audio.fadeOutMs + 150;
    const src = this.ambientSrc;
    window.setTimeout(() => { try { src?.stop(); } catch { /* already stopped */ } }, dur);
    this.started = false;
    this.ambientSrc = null;
    this.ambientGain = null;
  }

  /** Open the lowpass a touch as light floods the room. */
  brightenAmbient(): void {
    if (!this.ctx || !this.ambFilter) return;
    const t = this.ctx.currentTime;
    this.ambFilter.frequency.linearRampToValueAtTime(340, t + 3);
  }

  /** Slow harmonic swell as the world behind the door arrives. */
  revealSwell(): void {
    if (!this.ensure()) return;
    const c = this.ctx!;
    const t = c.currentTime;
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
      g.gain.linearRampToValueAtTime(0.32, t + 1.4 + i * 0.4);
      g.gain.linearRampToValueAtTime(0.0001, t + 9);
      o.connect(g).connect(lp);
      o.start(t);
      o.stop(t + 9.2);
    });

    // breath of air crossing the threshold — uses the cached noise pool
    if (this.noisePool && this.reverbSend) {
      const noise = c.createBufferSource();
      noise.buffer = this.noisePool;
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