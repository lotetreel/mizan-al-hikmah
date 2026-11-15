import type { Scene, SceneDef } from '../types';
import { ctx2d, glowSprite, makeCanvas, mulberry32 } from '../util';

interface Glint {
    row: number;
    offset: number;
    length: number;
    speed: number;
    phase: number;
    onPath: boolean;
}

function createMoonlitSea(w: number, h: number): Scene {
    const rand = mulberry32(89);
    const s = h / 900;
    const horizon = h * 0.6;
    const moonX = w * 0.7;
    const moonY = h * 0.2;
    const moonR = 44 * s;

    const bg = makeCanvas(w, h);
    const b = ctx2d(bg);
    const sky = b.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, '#030816');
    sky.addColorStop(0.55, '#0a1a38');
    sky.addColorStop(1, '#1c3a5e');
    b.fillStyle = sky;
    b.fillRect(0, 0, w, horizon);

    for (let i = 0; i < 220; i++) {
        const y = Math.pow(rand(), 1.4) * horizon * 0.92;
        const x = rand() * w;
        const nearMoon = Math.hypot(x - moonX, y - moonY) < moonR * 5;
        b.globalAlpha = (0.2 + rand() * 0.6) * (1 - y / horizon) * (nearMoon ? 0.3 : 1);
        b.fillStyle = '#e4ecff';
        const r = (0.5 + rand() * 0.8) * s;
        b.fillRect(x, y, r, r);
    }
    b.globalAlpha = 1;

    const sea = b.createLinearGradient(0, horizon, 0, h);
    sea.addColorStop(0, '#17355a');
    sea.addColorStop(0.25, '#0c2140');
    sea.addColorStop(1, '#020710');
    b.fillStyle = sea;
    b.fillRect(0, horizon, w, h - horizon);

    // far headland
    b.fillStyle = '#0a1830';
    b.beginPath();
    b.moveTo(0, horizon + 1);
    b.lineTo(0, horizon - h * 0.045);
    b.bezierCurveTo(w * 0.08, horizon - h * 0.06, w * 0.14, horizon - h * 0.02, w * 0.24, horizon - h * 0.012);
    b.lineTo(w * 0.3, horizon + 1);
    b.closePath();
    b.fill();

    // moon
    const moon = makeCanvas(moonR * 2 + 4, moonR * 2 + 4);
    const m = ctx2d(moon);
    const mc = moon.width / 2;
    const face = m.createRadialGradient(mc - moonR * 0.25, mc - moonR * 0.25, 0, mc, mc, moonR);
    face.addColorStop(0, '#ffffff');
    face.addColorStop(0.7, '#f4f1e2');
    face.addColorStop(1, '#d9d8cc');
    m.fillStyle = face;
    m.beginPath();
    m.arc(mc, mc, moonR, 0, Math.PI * 2);
    m.fill();
    m.globalCompositeOperation = 'source-atop';
    for (let i = 0; i < 9; i++) {
        m.globalAlpha = 0.06 + rand() * 0.07;
        m.fillStyle = '#8a90a0';
        m.beginPath();
        m.arc(mc + (rand() - 0.5) * moonR * 1.3, mc + (rand() - 0.5) * moonR * 1.3, moonR * (0.12 + rand() * 0.24), 0, Math.PI * 2);
        m.fill();
    }
    const halo = glowSprite(256, [200, 220, 255], 2.3);
    const sheen = glowSprite(256, [170, 200, 255], 1.8);

    // drifting cloud wisps
    const cloud = (() => {
        const canvas = makeCanvas(512, 128);
        const ctx = ctx2d(canvas);
        for (let i = 0; i < 80; i++) {
            const x = 70 + rand() * 372;
            const y = 44 + rand() * 40;
            const r = 20 + rand() * 38;
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
            gradient.addColorStop(0, 'rgba(150,175,215,0.09)');
            gradient.addColorStop(1, 'rgba(150,175,215,0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(x - r, y - r, r * 2, r * 2);
        }
        return canvas;
    })();
    const clouds = Array.from({ length: 6 }, () => ({
        offset: rand(),
        y: h * (0.06 + rand() * 0.36),
        width: h * (1 + rand() * 1.1),
        height: h * (0.1 + rand() * 0.1),
        speed: (3 + rand() * 6) * s,
        alpha: 0.5 + rand() * 0.5,
    }));

    // water glints, arranged in perspective rows
    const rows = 64;
    const rowY = (row: number) => horizon + Math.pow(row / rows, 1.8) * (h - horizon);
    const glints: Glint[] = [];
    for (let row = 0; row < rows; row++) {
        const k = row / rows;
        const onPathCount = 6 + Math.round(k * 3);
        for (let i = 0; i < onPathCount; i++) {
            glints.push({
                row,
                offset: (rand() + rand() + rand() - 1.5) / 1.5,
                length: (10 + rand() * 22) * (0.4 + k * 1.9) * s,
                speed: 0.7 + rand() * 1.7,
                phase: rand() * Math.PI * 2,
                onPath: true,
            });
        }
        for (let i = 0; i < 4; i++) {
            glints.push({
                row,
                offset: rand(),
                length: (18 + rand() * 46) * (0.4 + k * 2.6) * s,
                speed: 0.3 + rand() * 0.8,
                phase: rand() * Math.PI * 2,
                onPath: false,
            });
        }
    }

    // a small dhow crossing far out
    const boat = (() => {
        const size = Math.round(70 * s);
        const canvas = makeCanvas(size * 1.6, size * 1.3);
        const ctx = ctx2d(canvas);
        const baseY = size * 1.12;
        ctx.fillStyle = '#060e1e';
        ctx.beginPath();
        ctx.moveTo(size * 0.1, baseY - size * 0.16);
        ctx.quadraticCurveTo(size * 0.7, baseY + size * 0.08, size * 1.5, baseY - size * 0.24);
        ctx.lineTo(size * 1.28, baseY);
        ctx.lineTo(size * 0.3, baseY);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#060e1e';
        ctx.lineWidth = Math.max(1, size * 0.03);
        ctx.beginPath();
        ctx.moveTo(size * 0.72, baseY - size * 0.1);
        ctx.lineTo(size * 0.78, size * 0.08);
        ctx.stroke();
        ctx.fillStyle = '#0d1a30';
        ctx.beginPath();
        ctx.moveTo(size * 0.3, baseY - size * 0.28);
        ctx.quadraticCurveTo(size * 0.62, size * 0.5, size * 1.12, size * 0.04);
        ctx.quadraticCurveTo(size * 0.98, size * 0.6, size * 0.92, baseY - size * 0.24);
        ctx.closePath();
        ctx.fill();
        return canvas;
    })();
    const lamp = glowSprite(48, [255, 196, 120], 2);

    // one soft-ended streak of reflected light, stretched to size when drawn
    const streak = (() => {
        const canvas = makeCanvas(128, 8);
        const ctx = ctx2d(canvas);
        const along = ctx.createLinearGradient(0, 0, 128, 0);
        along.addColorStop(0, 'rgba(232,242,255,0)');
        along.addColorStop(0.3, 'rgba(232,242,255,1)');
        along.addColorStop(0.7, 'rgba(232,242,255,1)');
        along.addColorStop(1, 'rgba(232,242,255,0)');
        ctx.fillStyle = along;
        ctx.fillRect(0, 0, 128, 8);
        ctx.globalCompositeOperation = 'destination-in';
        const across = ctx.createLinearGradient(0, 0, 0, 8);
        across.addColorStop(0, 'rgba(0,0,0,0)');
        across.addColorStop(0.5, 'rgba(0,0,0,1)');
        across.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = across;
        ctx.fillRect(0, 0, 128, 8);
        return canvas;
    })();

    return {
        draw(ctx, t) {
            ctx.drawImage(bg, 0, 0);

            ctx.globalCompositeOperation = 'lighter';
            const haloRadius = moonR * (6.2 + 0.25 * Math.sin(t * 0.3));
            ctx.globalAlpha = 0.55;
            ctx.drawImage(halo, moonX - haloRadius, moonY - haloRadius, haloRadius * 2, haloRadius * 2);
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1;
            ctx.drawImage(moon, moonX - moon.width / 2, moonY - moon.height / 2);

            for (const c of clouds) {
                const span = w + c.width;
                const x = ((c.offset * span + t * c.speed) % span) - c.width;
                const lit = Math.max(0, 1 - Math.hypot(x + c.width / 2 - moonX, c.y - moonY) / (h * 0.7));
                ctx.globalAlpha = c.alpha * (0.45 + lit * 0.55);
                ctx.drawImage(cloud, x, c.y - c.height / 2, c.width, c.height);
            }
            ctx.globalAlpha = 1;

            // broad sheen where the moonlight lands on the water
            ctx.globalCompositeOperation = 'lighter';
            ctx.save();
            ctx.beginPath();
            ctx.rect(0, horizon, w, h - horizon);
            ctx.clip();
            ctx.globalAlpha = 0.32;
            ctx.drawImage(sheen, moonX - h * 0.5, horizon - h * 0.22, h, h * 0.9);
            ctx.restore();

            for (const glint of glints) {
                const k = glint.row / rows;
                const y = rowY(glint.row) + Math.sin(t * 0.9 + glint.phase) * (1 + k * 5) * s;
                const wave = Math.sin(t * glint.speed + glint.phase);
                if (wave <= 0) continue;
                const thickness = (2 + k * 5) * s;
                if (glint.onPath) {
                    const spread = (0.02 + k * 0.2) * h;
                    const x = moonX + glint.offset * spread + Math.sin(t * 0.25 + glint.phase) * spread * 0.2;
                    ctx.globalAlpha = wave * wave * (0.8 - k * 0.3);
                    ctx.drawImage(streak, x - glint.length / 2, y, glint.length, thickness);
                } else {
                    const x = ((glint.offset * w + t * (4 + k * 14) * s) % (w + glint.length)) - glint.length;
                    ctx.globalAlpha = wave * wave * wave * (0.1 + k * 0.12);
                    ctx.drawImage(streak, x, y, glint.length, thickness);
                }
            }
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1;

            // dhow
            const voyage = 420;
            const progress = ((t + 150) % voyage) / voyage;
            const boatX = w * (1.1 - progress * 1.3);
            const bob = Math.sin(t * 0.8) * 1.5 * s;
            ctx.save();
            ctx.translate(boatX, horizon + 9 * s + bob);
            ctx.rotate(Math.sin(t * 0.6) * 0.02);
            ctx.drawImage(boat, -boat.width / 2, -boat.height);
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.8 + 0.2 * Math.sin(t * 4.1);
            const lampSize = 9 * s;
            ctx.drawImage(lamp, -boat.width * 0.33 - lampSize, -boat.height * 0.24 - lampSize, lampSize * 2, lampSize * 2);
            ctx.restore();
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1;
        },
    };
}

export const moonlitSea: SceneDef = {
    id: 'moonlit-sea',
    name: 'Moonlit Sea',
    accent: '#cfe0ff',
    create: createMoonlitSea,
};
