export type Rand = () => number;
export type Rgb = [number, number, number];

/** Small seeded PRNG so every scene lays itself out the same way each time. */
export function mulberry32(seed: number): Rand {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export function makeCanvas(width: number, height: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.ceil(width));
    canvas.height = Math.max(1, Math.ceil(height));
    return canvas;
}

export function ctx2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas is not available');
    return ctx;
}

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smoothstep = (t: number) => {
    const x = clamp(t, 0, 1);
    return x * x * (3 - 2 * x);
};

export function mixRgb(a: Rgb, b: Rgb, t: number): Rgb {
    return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

export function rgb(color: Rgb, alpha = 1): string {
    const [r, g, b] = color;
    return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${alpha.toFixed(3)})`;
}

/** A soft round glow, pre-rendered once so frames can just blit it. */
export function glowSprite(size: number, color: Rgb, falloff = 2): HTMLCanvasElement {
    const canvas = makeCanvas(size, size);
    const ctx = ctx2d(canvas);
    const r = canvas.width / 2;
    const gradient = ctx.createRadialGradient(r, r, 0, r, r, r);
    const steps = 14;
    for (let i = 0; i <= steps; i++) {
        const p = i / steps;
        gradient.addColorStop(p, rgb(color, Math.pow(1 - p, falloff)));
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return canvas;
}

/** Smooth 1D fractal noise in the range 0..1. */
export function noise1d(rand: Rand, octaves = 4): (x: number) => number {
    const size = 256;
    const lattice = new Float32Array(size);
    for (let i = 0; i < size; i++) lattice[i] = rand();

    const sample = (x: number) => {
        const xi = Math.floor(x);
        const f = x - xi;
        const a = lattice[((xi % size) + size) % size];
        const b = lattice[(((xi + 1) % size) + size) % size];
        return lerp(a, b, f * f * (3 - 2 * f));
    };

    return (x: number) => {
        let total = 0;
        let amplitude = 1;
        let frequency = 1;
        let norm = 0;
        for (let o = 0; o < octaves; o++) {
            total += sample(x * frequency + o * 17.3) * amplitude;
            norm += amplitude;
            amplitude *= 0.5;
            frequency *= 2;
        }
        return total / norm;
    };
}

/** Rough gaussian from two uniforms; good enough for scattering things. */
export function gauss(rand: Rand): number {
    return (rand() + rand() + rand() + rand() - 2) / 1.15;
}

/**
 * A tile of faint film grain. Laid over the scenes it breaks up the banding that
 * dark, slow gradients otherwise show on large television panels.
 */
export function grainDataUrl(size = 160, strength = 0.045): string {
    const canvas = makeCanvas(size, size);
    const ctx = ctx2d(canvas);
    const image = ctx.createImageData(size, size);
    for (let i = 0; i < image.data.length; i += 4) {
        const value = Math.random() < 0.5 ? 0 : 255;
        image.data[i] = value;
        image.data[i + 1] = value;
        image.data[i + 2] = value;
        image.data[i + 3] = Math.random() * 255 * strength;
    }
    ctx.putImageData(image, 0, 0);
    return canvas.toDataURL('image/png');
}
