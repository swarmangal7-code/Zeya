import * as THREE from "three";

/** Procedurally painted wood-grain texture. No external asset needed. */
export function makeWoodTexture(base: string, streak: string, accent: string): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 512;
  const g = c.getContext("2d")!;

  g.fillStyle = base;
  g.fillRect(0, 0, 512, 512);

  // vertical grain streaks
  for (let i = 0; i < 90; i++) {
    const x = Math.random() * 512;
    const w = 1 + Math.random() * 7;
    const light = Math.random() > 0.5;
    const grad = g.createLinearGradient(x - w, 0, x + w, 0);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    const rgba = light ? streak : accent;
    grad.addColorStop(0.5, rgba);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grad;
    g.fillRect(x - w, 0, w * 2, 512);
  }

  // subtle horizontal knots
  g.globalCompositeOperation = "destination-over";
  for (let i = 0; i < 14; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    g.globalAlpha = 0.05 + Math.random() * 0.08;
    g.fillStyle = "#000";
    g.beginPath();
    g.ellipse(x, y, 4 + Math.random() * 9, 3 + Math.random() * 5, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
  g.globalCompositeOperation = "source-over";

  // soft micro noise
  const img = g.getImageData(0, 0, 512, 512);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 10;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  g.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Soft radial gradient used for fake volumetric light / glow sprites. */
export function makeGlowTexture(inner = "#DCE6FF", outer = "#8FA8E0"): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const g = c.getContext("2d")!;
  const hex = (hex: string, a: number) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  };
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, inner);
  grad.addColorStop(0.35, hex(inner, 0.55));
  grad.addColorStop(1, outer);
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

/** Procedurally generated reverb impulse response. */
export function makeImpulseResponse(seconds = 1.8, decay = 3.2, sampleRate?: number): AudioBuffer {
  const rate = sampleRate ?? 44100;
  const length = Math.floor(rate * seconds);
  const buffer = new AudioBuffer({ numberOfChannels: 2, length, sampleRate: rate });
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  return buffer;
}

/* ------------------------------------------------------------------ */
/* Wood height field → color / normal / roughness maps.                */
/* Gives the procedural door believable micro-surface relief.          */
/* ------------------------------------------------------------------ */

function drawWoodHeight(c: HTMLCanvasElement): void {
  const w = c.width;
  const h = c.height;
  const g = c.getContext("2d")!;
  g.fillStyle = "#808080";
  g.fillRect(0, 0, w, h);
  // long vertical grain
  for (let i = 0; i < w / 3; i++) {
    const x = Math.random() * w;
    const wd = 1 + Math.random() * 5;
    const l = Math.random() > 0.5 ? 1 : 0.25;
    const grad = g.createLinearGradient(x - wd, 0, x + wd, 0);
    grad.addColorStop(0, `rgba(${l * 255},${l * 255},${l * 255},0)`);
    grad.addColorStop(0.5, `rgba(${l * 255},${l * 255},${l * 255},0.55)`);
    grad.addColorStop(1, `rgba(${l * 255},${l * 255},${l * 255},0)`);
    g.fillStyle = grad;
    g.fillRect(x - wd, 0, wd * 2, h);
  }
  // pores / micro knots
  for (let i = 0; i < 22; i++) {
    g.globalAlpha = 0.18;
    g.fillStyle = Math.random() > 0.5 ? "#ddd" : "#444";
    g.beginPath();
    g.ellipse(Math.random() * w, Math.random() * h, 2 + Math.random() * 7, 1 + Math.random() * 3, 0, 0, Math.PI * 2);
    g.fill();
  }
}

function heightToNormal(src: HTMLCanvasElement, strength = 3.2): THREE.CanvasTexture {
  const w = src.width;
  const h = src.height;
  const data = src.getContext("2d")!.getImageData(0, 0, w, h).data;
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const ctx = out.getContext("2d")!;
  const img = ctx.createImageData(w, h);
  const d = img.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const hl = data[((y * w + Math.max(0, x - 1)) * 4)];
      const hr = data[((y * w + Math.min(w - 1, x + 1)) * 4)];
      const hu = data[((Math.max(0, y - 1) * w + x) * 4)];
      const hd = data[((Math.min(h - 1, y + 1) * w + x) * 4)];
      const dx = (hl - hr) / 255;
      const dy = (hu - hd) / 255;
      let nx = -dx * strength;
      let ny = -dy * strength;
      const nz = 1;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      nx /= len;
      ny /= len;
      d[i] = (nx * 0.5 + 0.5) * 255;
      d[i + 1] = (ny * 0.5 + 0.5) * 255;
      d[i + 2] = (nz * 0.5 + 0.5) * 255;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(out);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function heightToGrayscale(src: HTMLCanvasElement): THREE.CanvasTexture {
  const w = src.width;
  const h = src.height;
  const data = src.getContext("2d")!.getImageData(0, 0, w, h).data;
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const ctx = out.getContext("2d")!;
  const img = ctx.createImageData(w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = 255 - data[i];
    d[i] = d[i + 1] = d[i + 2] = v;
    d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(out);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export interface WoodMaps {
  color: THREE.CanvasTexture;
  normal: THREE.CanvasTexture;
  rough: THREE.CanvasTexture;
  ao: THREE.CanvasTexture;
}

const woodCache = new Map<string, WoodMaps>();

function heightToAO(src: HTMLCanvasElement): THREE.CanvasTexture {
  const w = src.width;
  const h = src.height;
  const data = src.getContext("2d")!.getImageData(0, 0, w, h).data;
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const ctx = out.getContext("2d")!;
  const img = ctx.createImageData(w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = Math.max(0, Math.min(255, 0.45 + (data[i] / 255) * 0.5));
    d[i] = d[i + 1] = d[i + 2] = v * 255;
    d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(out);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function heightToColor(src: HTMLCanvasElement): THREE.CanvasTexture {
  const w = src.width;
  const h = src.height;
  const data = src.getContext("2d")!.getImageData(0, 0, w, h).data;
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const ctx = out.getContext("2d")!;
  const img = ctx.createImageData(w, h);
  const d = img.data;
  const warmC = [0x6b, 0x49, 0x2c];
  const deepC = [0x2e, 0x22, 0x16];
  for (let i = 0; i < d.length; i += 4) {
    const t = data[i] / 255;
    const n = (Math.random() - 0.5) * 9;
    d[i] = deepC[0] + (warmC[0] - deepC[0]) * t + n;
    d[i + 1] = deepC[1] + (warmC[1] - deepC[1]) * t + n;
    d[i + 2] = deepC[2] + (warmC[2] - deepC[2]) * t + n;
    d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(out);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Returns a cached set of coherent maps painted from one height field,
 * so veins line up across color/normal/roughness.
 */
export function makeWoodMaps(seed = "walnut"): WoodMaps {
  const cached = woodCache.get(seed);
  if (cached) return cached;

  const height = document.createElement("canvas");
  height.width = height.height = 512;
  drawWoodHeight(height);

  const maps: WoodMaps = {
    color: heightToColor(height),
    normal: heightToNormal(height),
    rough: heightToGrayscale(height),
    ao: heightToAO(height),
  };
  woodCache.set(seed, maps);
  return maps;
}