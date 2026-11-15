import type { Scene, SceneDef } from '../types';
import { ctx2d, glowSprite, makeCanvas, mulberry32 } from '../util';

/** A star polygon: `points` tips at `outer`, with the notches between them at `inner`. */
function star(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    points: number,
    outer: number,
    inner: number,
    rotation: number
) {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
        const r = i % 2 === 0 ? outer : inner;
        const angle = rotation + (i * Math.PI) / points;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
}

function createGirih(w: number, h: number): Scene {
    const s = h / 900;
    const S = Math.round(h / 2.9);

    // The classic construction over a tiling of octagons and squares: every line
    // crosses the middle of a tile edge and carries straight on into the next tile.
    // That gives a sharp eight-pointed star in each octagon and a four-pointed
    // star in each square, all touching tip to tip.
    const R8 = S / 2;
    const r8 = R8 * 0.4142;
    const R4 = S * 0.2071;
    const r4 = R4 * 0.289;

    const tileBase = makeCanvas(S, S);
    const tileGlow = makeCanvas(S, S);
    const tb = ctx2d(tileBase);
    const tg = ctx2d(tileGlow);
    for (const ctx of [tb, tg]) {
        ctx.lineJoin = 'miter';
        ctx.miterLimit = 6;
    }

    const strap = (path: (ctx: CanvasRenderingContext2D) => void, fill?: string | CanvasGradient) => {
        if (fill) {
            path(tb);
            tb.fillStyle = fill;
            tb.fill();
        }
        path(tb);
        tb.strokeStyle = 'rgba(2,14,18,0.85)';
        tb.lineWidth = 6 * s;
        tb.stroke();
        path(tb);
        tb.strokeStyle = 'rgba(214,176,92,0.62)';
        tb.lineWidth = 2 * s;
        tb.stroke();

        path(tg);
        tg.strokeStyle = 'rgba(255,214,130,0.2)';
        tg.lineWidth = 9 * s;
        tg.stroke();
        path(tg);
        tg.strokeStyle = 'rgba(255,238,188,0.95)';
        tg.lineWidth = 2.3 * s;
        tg.stroke();
    };

    // Draw each motif for the neighbouring cells too, so strokes wrap seamlessly.
    for (let gx = -1; gx <= 1; gx++) {
        for (let gy = -1; gy <= 1; gy++) {
            const cx = S / 2 + gx * S;
            const cy = S / 2 + gy * S;
            const jewel = tb.createRadialGradient(cx, cy, 0, cx, cy, R8);
            jewel.addColorStop(0, 'rgba(60,170,160,0.5)');
            jewel.addColorStop(0.45, 'rgba(26,112,118,0.42)');
            jewel.addColorStop(1, 'rgba(14,70,92,0.3)');

            strap(ctx => star(ctx, cx, cy, 8, R8, r8, 0), jewel);
            strap(ctx => star(ctx, cx - S / 2, cy - S / 2, 4, R4, r4, Math.PI / 4), 'rgba(196,146,70,0.34)');
            strap(ctx => star(ctx, cx, cy, 8, r8 * 0.78, r8 * 0.78 * 0.7654, Math.PI / 8), 'rgba(6,40,54,0.6)');
            strap(ctx => {
                ctx.beginPath();
                ctx.arc(cx, cy, r8 * 0.22, 0, Math.PI * 2);
            }, 'rgba(226,190,110,0.55)');
        }
    }

    const bg = makeCanvas(w, h);
    const b = ctx2d(bg);
    const radial = b.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.hypot(w, h) / 2);
    radial.addColorStop(0, '#0f4d50');
    radial.addColorStop(0.55, '#07292f');
    radial.addColorStop(1, '#020d10');
    b.fillStyle = radial;
    b.fillRect(0, 0, w, h);

    // The bright strokes are composited at half resolution; they are soft anyway.
    const FX = 0.5;
    const fx = makeCanvas(w * FX, h * FX);
    const f = ctx2d(fx);
    const light = glowSprite(256, [255, 255, 255], 1.7);
    const warm = glowSprite(256, [255, 205, 120], 2);
    const dust = glowSprite(32, [255, 226, 160], 2.4);

    const basePattern = ctx2d(makeCanvas(1, 1)).createPattern(tileBase, 'repeat');
    const glowPattern = f.createPattern(tileGlow, 'repeat');

    const rand = mulberry32(31);
    const motes = Array.from({ length: 46 }, () => ({
        x: rand() * w,
        y: rand() * h,
        speed: (4 + rand() * 9) * s,
        phase: rand() * Math.PI * 2,
        size: (2 + rand() * 4) * s,
    }));

    const big = Math.hypot(w, h);
    const fillPattern = (
        ctx: CanvasRenderingContext2D,
        pattern: CanvasPattern | null,
        scale: number,
        rotation: number,
        ox: number,
        oy: number,
        unit: number
    ) => {
        if (!pattern) return;
        ctx.save();
        ctx.translate((w / 2) * unit, (h / 2) * unit);
        ctx.rotate(rotation);
        ctx.scale(scale * unit, scale * unit);
        ctx.translate(ox, oy);
        ctx.fillStyle = pattern;
        ctx.fillRect(-big - ox, -big - oy, big * 2, big * 2);
        ctx.restore();
    };

    const lights = [
        { ax: 0.38, ay: 0.3, fx: 0.031, fy: 0.043, px: 0, py: 1.2, radius: 0.62 },
        { ax: 0.42, ay: 0.34, fx: 0.023, fy: 0.037, px: 2.4, py: 0.3, radius: 0.5 },
        { ax: 0.3, ay: 0.26, fx: 0.047, fy: 0.029, px: 4.1, py: 3.3, radius: 0.42 },
    ];

    return {
        draw(ctx, t) {
            ctx.drawImage(bg, 0, 0);

            // a slow tide between teal and lapis
            ctx.globalAlpha = 0.2 + 0.2 * Math.sin(t * 0.045);
            ctx.fillStyle = '#12206e';
            ctx.fillRect(0, 0, w, h);
            ctx.globalAlpha = 1;

            const scale = 1.04 + 0.04 * Math.sin(t * 0.05);
            const rotation = 0.12 + 0.05 * Math.sin(t * 0.021);
            const ox = (t * 7 * s) % S;
            const oy = (t * 4 * s) % S;

            fillPattern(ctx, basePattern, scale, rotation, ox, oy, 1);

            f.globalCompositeOperation = 'source-over';
            f.clearRect(0, 0, fx.width, fx.height);
            ctx.globalCompositeOperation = 'lighter';
            for (const l of lights) {
                const x = w * (0.5 + l.ax * Math.sin(t * l.fx * 2 + l.px));
                const y = h * (0.5 + l.ay * Math.sin(t * l.fy * 2 + l.py));
                const radius = h * l.radius;
                ctx.globalAlpha = 0.13;
                ctx.drawImage(warm, x - radius, y - radius, radius * 2, radius * 2);
                f.globalAlpha = 0.95;
                f.drawImage(light, (x - radius) * FX, (y - radius) * FX, radius * 2 * FX, radius * 2 * FX);
            }
            f.globalAlpha = 1;
            f.globalCompositeOperation = 'destination-in';
            fillPattern(f, glowPattern, scale, rotation, ox, oy, FX);

            ctx.globalAlpha = 0.9;
            ctx.drawImage(fx, 0, 0, w, h);

            for (const mote of motes) {
                const y = (((mote.y - t * mote.speed) % h) + h) % h;
                const x = mote.x + Math.sin(t * 0.3 + mote.phase) * 30 * s;
                ctx.globalAlpha = 0.25 + 0.45 * (0.5 + 0.5 * Math.sin(t * 1.3 + mote.phase));
                ctx.drawImage(dust, x - mote.size, y - mote.size, mote.size * 2, mote.size * 2);
            }
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1;
        },
    };
}

export const girih: SceneDef = {
    id: 'girih',
    name: 'Tilework',
    accent: '#ecd08a',
    create: createGirih,
};
