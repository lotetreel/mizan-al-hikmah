import type { Scene, SceneDef } from '../types';
import { ctx2d, glowSprite, makeCanvas, mulberry32 } from '../util';

/** Half-width of the lantern body at height v (0 = top, 1 = bottom), as a fraction of its height. */
function profile(v: number): number {
    if (v < 0.12) return 0.1 + (v / 0.12) * 0.1;
    if (v < 0.2) return 0.2 + ((v - 0.12) / 0.08) * 0.08;
    if (v < 0.78) {
        const k = (v - 0.2) / 0.58;
        return 0.28 + Math.sin(k * Math.PI) * 0.1 - k * 0.06;
    }
    if (v < 0.86) return 0.22 - ((v - 0.78) / 0.08) * 0.07;
    return Math.max(0.02, 0.15 - ((v - 0.86) / 0.14) * 0.13);
}

function lanternSprite(height: number, hue: 'amber' | 'rose' | 'gold'): HTMLCanvasElement {
    const width = height * 0.9;
    const canvas = makeCanvas(width, height * 1.18);
    const ctx = ctx2d(canvas);
    const cx = canvas.width / 2;
    const top = height * 0.07;
    const bodyTop = 0.2;
    const bodyBottom = 0.78;

    const outline = (from: number, to: number) => {
        ctx.beginPath();
        const steps = 40;
        for (let i = 0; i <= steps; i++) {
            const v = from + ((to - from) * i) / steps;
            const x = cx - profile(v) * height;
            const y = top + v * height;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        for (let i = steps; i >= 0; i--) {
            const v = from + ((to - from) * i) / steps;
            ctx.lineTo(cx + profile(v) * height, top + v * height);
        }
        ctx.closePath();
    };

    const palettes = {
        amber: ['#fff6d6', '#ffcf73', '#f08a2c', '#8a3410'],
        rose: ['#fff1e6', '#ffb98a', '#e8623f', '#7a2420'],
        gold: ['#fffbe0', '#ffe08a', '#e0a030', '#7a4a10'],
    } as const;
    const [core, light, mid, deep] = palettes[hue];

    // glass
    outline(bodyTop, bodyBottom);
    const glassY = top + ((bodyTop + bodyBottom) / 2) * height;
    const glass = ctx.createRadialGradient(cx, glassY, 0, cx, glassY, height * 0.42);
    glass.addColorStop(0, core);
    glass.addColorStop(0.3, light);
    glass.addColorStop(0.7, mid);
    glass.addColorStop(1, deep);
    ctx.fillStyle = glass;
    ctx.fill();

    // pierced metal lattice over the glass
    ctx.save();
    outline(bodyTop, bodyBottom);
    ctx.clip();
    ctx.strokeStyle = 'rgba(40,18,8,0.78)';
    ctx.lineWidth = Math.max(1, height * 0.012);
    const step = height * 0.085;
    for (let d = -height; d < height * 2; d += step) {
        ctx.beginPath();
        ctx.moveTo(cx - height * 0.5 + d, top + bodyTop * height);
        ctx.lineTo(cx - height * 0.5 + d - height * 0.34, top + bodyBottom * height);
        ctx.moveTo(cx - height * 0.5 + d, top + bodyTop * height);
        ctx.lineTo(cx - height * 0.5 + d + height * 0.34, top + bodyBottom * height);
        ctx.stroke();
    }
    ctx.lineWidth = Math.max(1.5, height * 0.02);
    for (const offset of [-0.19, 0, 0.19]) {
        ctx.beginPath();
        ctx.moveTo(cx + offset * height * 0.85, top + bodyTop * height);
        ctx.quadraticCurveTo(cx + offset * height * 1.4, glassY, cx + offset * height * 0.7, top + bodyBottom * height);
        ctx.stroke();
    }
    ctx.restore();

    // metalwork: cap, collar, base, finial
    const metal = ctx.createLinearGradient(cx - height * 0.3, 0, cx + height * 0.3, 0);
    metal.addColorStop(0, '#1b0f0a');
    metal.addColorStop(0.45, '#6b4423');
    metal.addColorStop(0.6, '#3b2414');
    metal.addColorStop(1, '#120a07');
    ctx.fillStyle = metal;
    outline(0, bodyTop);
    ctx.fill();
    outline(bodyBottom, 1);
    ctx.fill();
    ctx.fillRect(cx - profile(bodyTop) * height - height * 0.02, top + bodyTop * height - height * 0.012, (profile(bodyTop) * height + height * 0.02) * 2, height * 0.03);
    ctx.fillRect(cx - profile(bodyBottom) * height - height * 0.02, top + bodyBottom * height - height * 0.012, (profile(bodyBottom) * height + height * 0.02) * 2, height * 0.03);

    // hanging ring and tassel
    ctx.strokeStyle = '#3b2414';
    ctx.lineWidth = Math.max(1, height * 0.018);
    ctx.beginPath();
    ctx.arc(cx, top - height * 0.02, height * 0.035, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#8a5a2a';
    ctx.lineWidth = Math.max(1, height * 0.012);
    ctx.beginPath();
    ctx.moveTo(cx, top + height);
    ctx.lineTo(cx, top + height * 1.08);
    ctx.stroke();
    ctx.fillStyle = '#b07a35';
    ctx.beginPath();
    ctx.arc(cx, top + height * 1.085, height * 0.018, 0, Math.PI * 2);
    ctx.fill();

    return canvas;
}

interface Lantern {
    x: number;
    chain: number;
    size: number;
    sprite: HTMLCanvasElement;
    swing: number;
    speed: number;
    phase: number;
    flickerA: number;
    flickerB: number;
    dim: number;
}

function createLanterns(w: number, h: number): Scene {
    const rand = mulberry32(53);
    const s = h / 900;
    const wide = w / h > 1.15;

    const bg = makeCanvas(w, h);
    const b = ctx2d(bg);
    const sky = b.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#0d0618');
    sky.addColorStop(0.45, '#22102f');
    sky.addColorStop(0.8, '#3d1a36');
    sky.addColorStop(1, '#4f2334');
    b.fillStyle = sky;
    b.fillRect(0, 0, w, h);
    const ember = b.createRadialGradient(w / 2, h * 1.1, 0, w / 2, h * 1.1, h * 0.9);
    ember.addColorStop(0, 'rgba(255,150,80,0.30)');
    ember.addColorStop(1, 'rgba(255,150,80,0)');
    b.fillStyle = ember;
    b.fillRect(0, 0, w, h);

    // out-of-focus lights far behind
    const bokehSprites = [
        [255, 190, 110], [255, 140, 110], [255, 220, 150], [230, 120, 160],
    ].map(color => {
        const size = 128;
        const canvas = makeCanvas(size, size);
        const ctx = ctx2d(canvas);
        const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
        const [r, g, bl] = color;
        gradient.addColorStop(0, `rgba(${r},${g},${bl},0.55)`);
        gradient.addColorStop(0.72, `rgba(${r},${g},${bl},0.62)`);
        gradient.addColorStop(0.86, `rgba(${r},${g},${bl},0.9)`);
        gradient.addColorStop(1, `rgba(${r},${g},${bl},0)`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);
        return canvas;
    });
    const bokeh = Array.from({ length: 30 }, () => ({
        x: rand() * w,
        y: rand() * h,
        radius: (22 + rand() * 80) * s,
        speed: (3 + rand() * 7) * s,
        drift: rand() * Math.PI * 2,
        alpha: 0.04 + rand() * 0.12,
        sprite: Math.floor(rand() * bokehSprites.length),
    }));

    // Lanterns hang down the two sides so the middle stays clear for the text.
    const layout: Array<[number, number, number, 'amber' | 'rose' | 'gold']> = wide
        ? [
            [0.045, 0.5, 0.2, 'amber'], [0.115, 0.2, 0.125, 'gold'], [0.185, 0.07, 0.085, 'rose'],
            [0.29, 0.03, 0.065, 'amber'], [0.41, 0.015, 0.05, 'gold'],
            [0.6, 0.02, 0.055, 'rose'], [0.72, 0.04, 0.07, 'gold'],
            [0.82, 0.08, 0.09, 'amber'], [0.885, 0.22, 0.13, 'rose'], [0.955, 0.52, 0.19, 'gold'],
        ]
        : [
            [0.1, 0.2, 0.11, 'amber'], [0.3, 0.07, 0.07, 'gold'], [0.52, 0.03, 0.055, 'rose'],
            [0.72, 0.08, 0.075, 'amber'], [0.9, 0.22, 0.11, 'gold'],
        ];
    const lanterns: Lantern[] = layout.map(([x, chain, size, hue]) => ({
        x: x * w,
        chain: chain * h,
        size: size * h,
        sprite: lanternSprite(Math.round(size * h), hue),
        swing: 0.018 + rand() * 0.03,
        speed: 0.5 + 0.45 / Math.sqrt(0.2 + chain * 3),
        phase: rand() * Math.PI * 2,
        flickerA: 2 + rand() * 3,
        flickerB: 5 + rand() * 6,
        dim: 0.6 + Math.min(0.4, size * 2.4),
    }));
    lanterns.sort((a, c) => a.size - c.size);

    const glow = glowSprite(256, [255, 170, 80], 1.9);
    const dust = glowSprite(24, [255, 215, 160], 2.2);
    const motes = Array.from({ length: 50 }, () => ({
        x: rand() * w,
        y: rand() * h,
        speed: (5 + rand() * 12) * s,
        phase: rand() * Math.PI * 2,
        size: (1.5 + rand() * 3) * s,
    }));

    return {
        draw(ctx, t) {
            ctx.drawImage(bg, 0, 0);

            ctx.globalCompositeOperation = 'lighter';
            for (const light of bokeh) {
                const y = (((light.y - t * light.speed) % (h + 200 * s)) + h + 200 * s) % (h + 200 * s) - 100 * s;
                const x = light.x + Math.sin(t * 0.08 + light.drift) * 50 * s;
                ctx.globalAlpha = light.alpha * (0.7 + 0.3 * Math.sin(t * 0.5 + light.drift));
                ctx.drawImage(bokehSprites[light.sprite], x - light.radius, y - light.radius, light.radius * 2, light.radius * 2);
            }

            for (const mote of motes) {
                const y = (((mote.y - t * mote.speed) % h) + h) % h;
                const x = mote.x + Math.sin(t * 0.35 + mote.phase) * 24 * s;
                ctx.globalAlpha = 0.2 + 0.4 * (0.5 + 0.5 * Math.sin(t * 1.1 + mote.phase));
                ctx.drawImage(dust, x - mote.size, y - mote.size, mote.size * 2, mote.size * 2);
            }
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1;

            for (const lantern of lanterns) {
                const angle = lantern.swing * Math.sin(t * lantern.speed + lantern.phase)
                    + lantern.swing * 0.35 * Math.sin(t * lantern.speed * 2.3 + lantern.phase * 2);
                const flicker = 0.82
                    + 0.1 * Math.sin(t * lantern.flickerA + lantern.phase)
                    + 0.08 * Math.sin(t * lantern.flickerB + lantern.phase * 3);

                ctx.save();
                ctx.translate(lantern.x, -4);
                ctx.rotate(angle);

                ctx.strokeStyle = 'rgba(120,80,45,0.85)';
                ctx.lineWidth = Math.max(1, lantern.size * 0.012);
                ctx.setLineDash([lantern.size * 0.03, lantern.size * 0.02]);
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(0, lantern.chain + lantern.size * 0.05);
                ctx.stroke();
                ctx.setLineDash([]);

                const glowRadius = lantern.size * 1.9;
                const bodyY = lantern.chain + lantern.size * 0.56;
                ctx.globalCompositeOperation = 'lighter';
                ctx.globalAlpha = 0.5 * flicker * lantern.dim;
                ctx.drawImage(glow, -glowRadius, bodyY - glowRadius, glowRadius * 2, glowRadius * 2);
                ctx.globalCompositeOperation = 'source-over';

                ctx.globalAlpha = 1;
                ctx.drawImage(lantern.sprite, -lantern.sprite.width / 2, lantern.chain);

                ctx.globalCompositeOperation = 'lighter';
                ctx.globalAlpha = 0.22 * flicker;
                ctx.drawImage(glow, -lantern.size * 0.5, bodyY - lantern.size * 0.5, lantern.size, lantern.size);
                ctx.restore();
            }
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1;
        },
    };
}

export const lanterns: SceneDef = {
    id: 'lanterns',
    name: 'Lanterns',
    accent: '#ffcf8f',
    create: createLanterns,
};
