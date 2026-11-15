import type { Scene, SceneDef } from '../types';
import { ctx2d, gauss, glowSprite, makeCanvas, mulberry32, noise1d } from '../util';

const STAR_COLORS = ['#ffffff', '#cfdcff', '#ffe6c4'];

function createDesertNight(w: number, h: number): Scene {
    const rand = mulberry32(23);
    const s = h / 900;
    const horizon = h * 0.76;

    // ---------- sky ----------
    const bg = makeCanvas(w, h);
    const b = ctx2d(bg);
    const sky = b.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#02040f');
    sky.addColorStop(0.35, '#07102b');
    sky.addColorStop(0.6, '#122149');
    sky.addColorStop(0.76, '#2b3466');
    sky.addColorStop(0.84, '#4a4670');
    b.fillStyle = sky;
    b.fillRect(0, 0, w, h);

    // The sky turns slowly about a point below the horizon, so stars arc overhead.
    const pivotX = w * 0.44;
    const pivotY = h * 1.4;
    const reach = Math.hypot(Math.max(pivotX, w - pivotX), pivotY) + 30;
    const bandRadius = pivotY - h * 0.2;

    // Milky Way: blurry by nature, so a small texture scaled up is plenty.
    const GAL = 1024;
    const galaxy = makeCanvas(GAL, GAL);
    const g = ctx2d(galaxy);
    const gs = GAL / (reach * 2);
    const cloudColors = ['150,170,255', '205,200,255', '255,214,190', '120,140,235'];
    for (let i = 0; i < 900; i++) {
        const angle = rand() * Math.PI * 2;
        const radius = bandRadius + gauss(rand) * h * 0.1;
        const size = (30 + rand() * 110) * s * gs;
        const x = GAL / 2 + Math.cos(angle) * radius * gs;
        const y = GAL / 2 + Math.sin(angle) * radius * gs;
        const gradient = g.createRadialGradient(x, y, 0, x, y, size);
        const color = cloudColors[Math.floor(rand() * cloudColors.length)];
        gradient.addColorStop(0, `rgba(${color},${(0.045 + rand() * 0.075).toFixed(3)})`);
        gradient.addColorStop(1, `rgba(${color},0)`);
        g.fillStyle = gradient;
        g.fillRect(x - size, y - size, size * 2, size * 2);
    }
    // dust lanes
    g.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 260; i++) {
        const angle = rand() * Math.PI * 2;
        const radius = bandRadius + gauss(rand) * h * 0.028;
        const size = (14 + rand() * 40) * s * gs;
        const x = GAL / 2 + Math.cos(angle) * radius * gs;
        const y = GAL / 2 + Math.sin(angle) * radius * gs;
        const gradient = g.createRadialGradient(x, y, 0, x, y, size);
        gradient.addColorStop(0, 'rgba(0,0,0,0.22)');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gradient;
        g.fillRect(x - size, y - size, size * 2, size * 2);
    }

    // ---------- stars (polar coordinates about the pivot) ----------
    const starCount = Math.round(Math.min(7000, (Math.PI * reach * reach) / (w * h) * 1150));
    const starR = new Float32Array(starCount);
    const starA = new Float32Array(starCount);
    const starSize = new Float32Array(starCount);
    const starAlpha = new Float32Array(starCount);
    const starTwinkle = new Float32Array(starCount);
    const starPhase = new Float32Array(starCount);
    const starColor = new Uint8Array(starCount);
    for (let i = 0; i < starCount; i++) {
        const inBand = rand() < 0.3;
        starR[i] = inBand ? bandRadius + gauss(rand) * h * 0.1 : reach * Math.sqrt(rand());
        starA[i] = rand() * Math.PI * 2;
        const magnitude = Math.pow(rand(), 5);
        starSize[i] = (0.9 + magnitude * 2) * s;
        starAlpha[i] = 0.35 + rand() * 0.5 + magnitude * 0.3;
        starTwinkle[i] = 0.6 + rand() * 2.4;
        starPhase[i] = rand() * Math.PI * 2;
        starColor[i] = i % STAR_COLORS.length;
    }
    const starGlow = glowSprite(48, [220, 230, 255], 2.6);

    // ---------- crescent moon ----------
    const moonR = 36 * s;
    const moon = makeCanvas(moonR * 2 + 4, moonR * 2 + 4);
    const m = ctx2d(moon);
    const mc = moon.width / 2;
    const moonFill = m.createRadialGradient(mc - moonR * 0.3, mc - moonR * 0.2, 0, mc, mc, moonR);
    moonFill.addColorStop(0, '#fffdf2');
    moonFill.addColorStop(1, '#f1e3b8');
    m.fillStyle = moonFill;
    m.beginPath();
    m.arc(mc, mc, moonR, 0, Math.PI * 2);
    m.fill();
    m.globalCompositeOperation = 'destination-out';
    m.beginPath();
    m.arc(mc + moonR * 0.42, mc - moonR * 0.2, moonR * 0.92, 0, Math.PI * 2);
    m.fill();
    const moonHalo = glowSprite(256, [255, 240, 200], 2.2);
    const moonX = w * 0.15;
    const moonY = h * 0.2;

    // ---------- dunes ----------
    const fg = makeCanvas(w, h);
    const f = ctx2d(fg);
    const duneNoise = noise1d(rand, 3);
    const duneY = (x: number, baseY: number, amp: number, freq: number, offset: number) => {
        const n = duneNoise((x / h) * freq + offset);
        const ridged = 1 - Math.abs(2 * duneNoise((x / h) * freq * 0.6 + offset + 50) - 1);
        return baseY - amp * (0.45 * n + 0.55 * ridged * ridged);
    };
    const dune = (baseY: number, amp: number, freq: number, offset: number, top: string, bottom: string, rim: string) => {
        const gradient = f.createLinearGradient(0, baseY - amp, 0, Math.min(h, baseY + h * 0.1));
        gradient.addColorStop(0, top);
        gradient.addColorStop(1, bottom);
        f.fillStyle = gradient;
        f.beginPath();
        f.moveTo(0, h);
        for (let x = 0; x <= w + 6; x += 6) f.lineTo(x, duneY(x, baseY, amp, freq, offset));
        f.lineTo(w, h);
        f.closePath();
        f.fill();
        f.strokeStyle = rim;
        f.lineWidth = 1.4 * s;
        f.beginPath();
        for (let x = 0; x <= w + 6; x += 6) {
            const y = duneY(x, baseY, amp, freq, offset);
            if (x === 0) f.moveTo(x, y); else f.lineTo(x, y);
        }
        f.stroke();
    };

    dune(horizon + h * 0.03, h * 0.085, 2.4, 2, '#343c74', '#171b40', 'rgba(190,200,255,0.42)');

    // a small shrine and palms resting on the far ridge
    const oasisX = w * 0.79;
    const oasisY = duneY(oasisX, horizon + h * 0.03, h * 0.085, 2.4, 2) + 3 * s;
    const ink = '#0b0d22';
    f.fillStyle = ink;
    f.strokeStyle = ink;
    const u = 5.2 * s;
    f.fillRect(oasisX - 6 * u, oasisY - 4 * u, 12 * u, 4.4 * u);
    f.beginPath();
    f.moveTo(oasisX - 3.4 * u, oasisY - 4 * u);
    f.bezierCurveTo(oasisX - 4.6 * u, oasisY - 7.6 * u, oasisX - 1.2 * u, oasisY - 8.6 * u, oasisX, oasisY - 10.4 * u);
    f.bezierCurveTo(oasisX + 1.2 * u, oasisY - 8.6 * u, oasisX + 4.6 * u, oasisY - 7.6 * u, oasisX + 3.4 * u, oasisY - 4 * u);
    f.closePath();
    f.fill();
    f.fillRect(oasisX - 0.12 * u, oasisY - 11.6 * u, 0.24 * u, 1.4 * u);
    for (const side of [-1, 1]) {
        const mx = oasisX + side * 8.2 * u;
        f.fillRect(mx - 0.55 * u, oasisY - 12 * u, 1.1 * u, 12.4 * u);
        f.fillRect(mx - 0.95 * u, oasisY - 9.6 * u, 1.9 * u, 0.5 * u);
        f.beginPath();
        f.moveTo(mx - 0.75 * u, oasisY - 12 * u);
        f.quadraticCurveTo(mx, oasisY - 15.4 * u, mx + 0.75 * u, oasisY - 12 * u);
        f.closePath();
        f.fill();
    }
    const palm = (x: number, y: number, height: number, lean: number) => {
        f.lineWidth = Math.max(1, height * 0.055);
        f.lineCap = 'round';
        const topX = x + lean * height;
        const topY = y - height;
        f.beginPath();
        f.moveTo(x, y);
        f.quadraticCurveTo(x + lean * height * 0.2, y - height * 0.6, topX, topY);
        f.stroke();
        f.lineWidth = Math.max(1, height * 0.035);
        for (let i = 0; i < 9; i++) {
            const angle = -Math.PI + (i / 8) * Math.PI + (rand() - 0.5) * 0.2;
            const length = height * (0.42 + rand() * 0.16);
            f.beginPath();
            f.moveTo(topX, topY);
            f.quadraticCurveTo(
                topX + Math.cos(angle) * length * 0.6,
                topY + Math.sin(angle) * length * 0.75,
                topX + Math.cos(angle) * length,
                topY + Math.sin(angle) * length * 0.3 + length * 0.42
            );
            f.stroke();
        }
    };
    palm(oasisX - 15 * u, oasisY + u, 13 * u, 0.12);
    palm(oasisX - 19 * u, oasisY + 1.4 * u, 9 * u, -0.16);
    palm(oasisX + 14.5 * u, oasisY + 1.2 * u, 11 * u, -0.1);
    const lampX = oasisX;
    const lampY = oasisY - 1.3 * u;
    f.fillStyle = '#ffcf7a';
    f.beginPath();
    f.moveTo(lampX - 0.8 * u, oasisY);
    f.lineTo(lampX - 0.8 * u, lampY);
    f.quadraticCurveTo(lampX, lampY - 1.6 * u, lampX + 0.8 * u, lampY);
    f.lineTo(lampX + 0.8 * u, oasisY);
    f.closePath();
    f.fill();

    dune(horizon + h * 0.11, h * 0.12, 1.7, 30, '#232a58', '#0c0f26', 'rgba(170,182,250,0.32)');
    dune(horizon + h * 0.22, h * 0.15, 1.2, 61, '#141836', '#04050d', 'rgba(140,155,230,0.22)');

    const lampGlow = glowSprite(96, [255, 190, 100], 2);
    const haze = glowSprite(256, [120, 130, 200], 1.6);

    // ---------- shooting stars ----------
    const meteorRand = mulberry32(5);
    let meteorAt = 6;
    let meteor: { x: number; y: number; vx: number; vy: number; life: number } | null = null;

    return {
        draw(ctx, t, dt) {
            ctx.drawImage(bg, 0, 0);

            const turn = t * 0.0021;
            ctx.save();
            ctx.translate(pivotX, pivotY);
            ctx.rotate(turn);
            ctx.globalAlpha = 0.9;
            ctx.drawImage(galaxy, -reach, -reach, reach * 2, reach * 2);
            ctx.restore();

            let color = -1;
            for (let i = 0; i < starCount; i++) {
                const angle = starA[i] + turn;
                const x = pivotX + Math.cos(angle) * starR[i];
                if (x < -4 || x > w + 4) continue;
                const y = pivotY + Math.sin(angle) * starR[i];
                if (y < -4 || y > horizon + h * 0.04) continue;
                if (starColor[i] !== color) {
                    color = starColor[i];
                    ctx.fillStyle = STAR_COLORS[color];
                }
                const fade = Math.min(1, (horizon + h * 0.04 - y) / (h * 0.22));
                const twinkle = 0.72 + 0.28 * Math.sin(t * starTwinkle[i] + starPhase[i]);
                const size = starSize[i];
                ctx.globalAlpha = starAlpha[i] * twinkle * fade;
                ctx.fillRect(x - size / 2, y - size / 2, size, size);
                if (size > 1.9 * s) {
                    const glow = size * 5;
                    ctx.globalAlpha = 0.45 * twinkle * fade;
                    ctx.drawImage(starGlow, x - glow, y - glow, glow * 2, glow * 2);
                }
            }
            ctx.globalAlpha = 1;

            // moon
            ctx.globalCompositeOperation = 'lighter';
            const haloSize = moonR * (7.5 + 0.3 * Math.sin(t * 0.4));
            ctx.globalAlpha = 0.5;
            ctx.drawImage(moonHalo, moonX - haloSize, moonY - haloSize, haloSize * 2, haloSize * 2);
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1;
            ctx.save();
            ctx.translate(moonX, moonY);
            ctx.rotate(-0.5);
            ctx.drawImage(moon, -moon.width / 2, -moon.height / 2);
            ctx.restore();

            // shooting star
            if (!meteor && t > meteorAt) {
                const angle = 0.35 + meteorRand() * 0.5;
                const speed = (900 + meteorRand() * 500) * s;
                meteor = {
                    x: w * (0.25 + meteorRand() * 0.7),
                    y: h * (0.04 + meteorRand() * 0.25),
                    vx: -Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    life: 0,
                };
            }
            if (meteor) {
                meteor.life += dt;
                meteor.x += meteor.vx * dt;
                meteor.y += meteor.vy * dt;
                const duration = 0.9;
                const strength = Math.sin(Math.min(1, meteor.life / duration) * Math.PI);
                const tailX = meteor.x - meteor.vx * 0.16;
                const tailY = meteor.y - meteor.vy * 0.16;
                const trail = ctx.createLinearGradient(meteor.x, meteor.y, tailX, tailY);
                trail.addColorStop(0, `rgba(255,255,255,${(0.9 * strength).toFixed(3)})`);
                trail.addColorStop(1, 'rgba(180,200,255,0)');
                ctx.strokeStyle = trail;
                ctx.lineWidth = 1.8 * s;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(meteor.x, meteor.y);
                ctx.lineTo(tailX, tailY);
                ctx.stroke();
                if (meteor.life > duration) {
                    meteor = null;
                    meteorAt = t + 9 + meteorRand() * 16;
                }
            }

            // horizon haze drifting behind the dunes
            ctx.globalCompositeOperation = 'lighter';
            for (let i = 0; i < 3; i++) {
                const hw = h * (1.3 + i * 0.3);
                const span = w + hw * 2;
                const x = ((t * (5 + i * 3) * s + i * span * 0.37) % span) - hw;
                ctx.globalAlpha = 0.2;
                ctx.drawImage(haze, x - hw, horizon - h * 0.09, hw * 2, h * 0.2);
            }
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1;

            ctx.drawImage(fg, 0, 0);

            // the shrine's lamp
            ctx.globalCompositeOperation = 'lighter';
            const flicker = 0.75 + 0.14 * Math.sin(t * 5.3) + 0.11 * Math.sin(t * 8.7 + 1);
            const lampSize = 24 * s;
            ctx.globalAlpha = 0.85 * flicker;
            ctx.drawImage(lampGlow, lampX - lampSize, lampY - lampSize, lampSize * 2, lampSize * 2);
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1;
        },
    };
}

export const desertNight: SceneDef = {
    id: 'desert-night',
    name: 'Desert Night',
    accent: '#e9d7a4',
    create: createDesertNight,
};
