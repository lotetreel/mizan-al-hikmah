import type { Scene, SceneDef } from '../types';
import { ctx2d, glowSprite, makeCanvas, mixRgb, mulberry32, noise1d, rgb, smoothstep } from '../util';
import type { Rgb } from '../util';

interface Ridge {
    points: Float32Array;
    depth: number;
}

// Each colour is [before dawn, at dawn].
const SKY: Array<[number, Rgb, Rgb]> = [
    [0, [6, 10, 34], [24, 32, 78]],
    [0.4, [16, 26, 66], [74, 62, 118]],
    [0.62, [34, 48, 96], [176, 104, 122]],
    [0.76, [62, 74, 118], [240, 160, 112]],
    [1, [70, 80, 120], [250, 196, 140]],
];
const FAR: [Rgb, Rgb] = [[52, 64, 108], [150, 104, 130]];
const NEAR: [Rgb, Rgb] = [[5, 8, 20], [16, 14, 30]];

function createFajr(w: number, h: number): Scene {
    const rand = mulberry32(67);
    const s = h / 900;
    const step = 5;
    const count = Math.ceil(w / step) + 2;

    const ridgeNoise = noise1d(rand, 5);
    const layers = 5;
    const ridges: Ridge[] = [];
    for (let i = 0; i < layers; i++) {
        const depth = i / (layers - 1);
        const baseY = h * (0.62 + depth * 0.25);
        const amp = h * (0.3 - depth * 0.15);
        const freq = 1.9 + depth * 1.6;
        const points = new Float32Array(count);
        for (let k = 0; k < count; k++) {
            const x = (k * step) / h;
            const n = ridgeNoise(x * freq + i * 37.7);
            const peak = 1 - Math.abs(2 * ridgeNoise(x * freq * 0.5 + i * 91.3) - 1);
            const sharp = 0.75 - depth * 0.5;
            points[k] = baseY - amp * ((1 - sharp) * n + sharp * peak * peak);
        }
        ridges.push({ points, depth });
    }

    // pines along the nearest ridge
    const nearest = ridges[layers - 1].points;
    const pines: Array<{ x: number; y: number; height: number }> = [];
    for (let x = -20 * s; x < w + 20 * s; x += (9 + rand() * 20) * s) {
        const index = Math.min(count - 1, Math.max(0, Math.round(x / step)));
        pines.push({ x, y: nearest[index] + 4 * s, height: (20 + rand() * 44) * s });
    }

    const stars = Array.from({ length: 150 }, () => ({
        x: rand() * w,
        y: Math.pow(rand(), 1.5) * h * 0.5,
        size: (0.6 + rand() * 1.1) * s,
        alpha: 0.3 + rand() * 0.6,
        twinkle: 0.7 + rand() * 2,
        phase: rand() * Math.PI * 2,
    }));

    const sun = glowSprite(256, [255, 214, 160], 2.1);
    const mistSprite = (() => {
        const canvas = makeCanvas(512, 128);
        const ctx = ctx2d(canvas);
        for (let i = 0; i < 70; i++) {
            const x = 60 + rand() * 392;
            const y = 40 + rand() * 48;
            const r = 24 + rand() * 40;
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
            gradient.addColorStop(0, 'rgba(255,255,255,0.11)');
            gradient.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(x - r, y - r, r * 2, r * 2);
        }
        return canvas;
    })();
    const mists = Array.from({ length: 9 }, (_, i) => ({
        layer: 1 + (i % (layers - 1)),
        offset: rand(),
        speed: (5 + rand() * 9) * s * (rand() > 0.5 ? 1 : -1),
        width: h * (1.3 + rand() * 1.2),
        height: h * (0.12 + rand() * 0.1),
        lift: (rand() - 0.2) * h * 0.06,
        alpha: 0.45 + rand() * 0.4,
    }));

    const birds = Array.from({ length: 7 }, (_, i) => ({
        dx: -i * 34 * s - (i % 2) * 14 * s,
        dy: ((i % 2 === 0 ? 1 : -1) * Math.ceil(i / 2)) * 15 * s,
        phase: rand() * Math.PI * 2,
        size: (7 + rand() * 3) * s,
    }));

    const sunX = w * 0.3;

    return {
        draw(ctx, t) {
            // First light is already showing; dawn breaks over a couple of minutes, then eases back.
            const dawn = 0.16 + 0.84 * smoothstep(0.5 - 0.5 * Math.cos((t / 130) * Math.PI));

            const sky = ctx.createLinearGradient(0, 0, 0, h * 0.9);
            for (const [stop, night, day] of SKY) sky.addColorStop(stop, rgb(mixRgb(night, day, dawn)));
            ctx.fillStyle = sky;
            ctx.fillRect(0, 0, w, h);

            ctx.fillStyle = '#eaf0ff';
            const starFade = 1 - dawn * 0.85;
            for (const star of stars) {
                ctx.globalAlpha = star.alpha * starFade * (0.7 + 0.3 * Math.sin(t * star.twinkle + star.phase));
                ctx.fillRect(star.x, star.y, star.size, star.size);
            }

            ctx.globalCompositeOperation = 'lighter';
            const sunY = h * (0.6 - dawn * 0.1);
            const sunRadius = h * (0.5 + dawn * 0.45);
            ctx.globalAlpha = 0.25 + dawn * 0.6;
            ctx.drawImage(sun, sunX - sunRadius * 1.5, sunY - sunRadius, sunRadius * 3, sunRadius * 2);
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1;

            // a small flock crossing the sky now and then
            const cycle = 55;
            const flight = (t % cycle) / 26;
            if (flight < 1) {
                const leadX = -60 * s + flight * (w + 360 * s);
                const leadY = h * (0.3 - 0.07 * flight) + Math.sin(t * 0.5) * 6 * s;
                ctx.strokeStyle = rgb(mixRgb([150, 160, 200], [50, 36, 60], dawn), 0.75);
                ctx.lineWidth = 1.6 * s;
                ctx.lineCap = 'round';
                ctx.beginPath();
                for (const bird of birds) {
                    const x = leadX + bird.dx;
                    const y = leadY + bird.dy;
                    const flap = Math.sin(t * 5 + bird.phase) * bird.size * 0.5;
                    ctx.moveTo(x - bird.size, y - flap);
                    ctx.quadraticCurveTo(x - bird.size * 0.4, y - bird.size * 0.25, x, y);
                    ctx.quadraticCurveTo(x + bird.size * 0.4, y - bird.size * 0.25, x + bird.size, y - flap);
                }
                ctx.stroke();
            }

            const far = mixRgb(FAR[0], FAR[1], dawn);
            const near = mixRgb(NEAR[0], NEAR[1], dawn);
            for (let i = 0; i < layers; i++) {
                const ridge = ridges[i];
                const color = mixRgb(far, near, Math.pow(ridge.depth, 0.85));
                ctx.fillStyle = rgb(color);
                ctx.beginPath();
                ctx.moveTo(0, h);
                for (let k = 0; k < count; k++) ctx.lineTo(k * step, ridge.points[k]);
                ctx.lineTo(w, h);
                ctx.closePath();
                ctx.fill();

                if (i === layers - 1) {
                    ctx.beginPath();
                    for (const pine of pines) {
                        const half = pine.height * 0.24;
                        ctx.moveTo(pine.x, pine.y - pine.height);
                        ctx.lineTo(pine.x + half * 0.55, pine.y - pine.height * 0.55);
                        ctx.lineTo(pine.x + half * 0.3, pine.y - pine.height * 0.55);
                        ctx.lineTo(pine.x + half, pine.y);
                        ctx.lineTo(pine.x - half, pine.y);
                        ctx.lineTo(pine.x - half * 0.3, pine.y - pine.height * 0.55);
                        ctx.lineTo(pine.x - half * 0.55, pine.y - pine.height * 0.55);
                        ctx.closePath();
                    }
                    ctx.fill();
                }

                // mist pooling in the valley in front of this ridge
                for (const mist of mists) {
                    if (mist.layer !== i + 1) continue;
                    const span = w + mist.width;
                    const x = ((((mist.offset * span + t * mist.speed) % span) + span) % span) - mist.width;
                    const y = h * (0.62 + ridge.depth * 0.25) - mist.height * 0.45 + mist.lift;
                    ctx.globalAlpha = mist.alpha * (0.55 + dawn * 0.45);
                    ctx.drawImage(mistSprite, x, y, mist.width, mist.height);
                }
                ctx.globalAlpha = 1;
            }
        },
    };
}

export const fajr: SceneDef = {
    id: 'fajr',
    name: 'Dawn',
    accent: '#ffd9a8',
    create: createFajr,
};
