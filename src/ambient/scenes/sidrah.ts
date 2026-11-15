import type { Scene, SceneDef } from '../types';
import { ctx2d, glowSprite, makeCanvas, mulberry32, noise1d } from '../util';
import type { Rand } from '../util';

interface Petal {
    x: number;
    y: number;
    z: number;
    size: number;
    fall: number;
    rot: number;
    spin: number;
    flip: number;
    flipSpeed: number;
    swayPhase: number;
    swaySpeed: number;
    swayAmp: number;
    sprite: number;
    age: number;
}

interface Mote {
    x: number;
    y: number;
    phase: number;
    speed: number;
    radius: number;
}

const BACK_LEAVES = ['#0d2a25', '#11332b', '#163d31', '#0b231f'];
const FRONT_LEAVES = ['#1f5a44', '#2c6f4f', '#3f8559', '#5d9c63', '#84b274'];

function petalSprite(inner: string, mid: string, outer: string): HTMLCanvasElement {
    const size = 48;
    const canvas = makeCanvas(size, size);
    const ctx = ctx2d(canvas);
    const gradient = ctx.createLinearGradient(size / 2, 4, size / 2, size - 4);
    gradient.addColorStop(0, outer);
    gradient.addColorStop(0.55, mid);
    gradient.addColorStop(1, inner);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(size / 2, size - 4);
    ctx.bezierCurveTo(size * 0.02, size * 0.62, size * 0.12, size * 0.1, size * 0.42, size * 0.08);
    ctx.quadraticCurveTo(size / 2, size * 0.2, size * 0.58, size * 0.08);
    ctx.bezierCurveTo(size * 0.88, size * 0.1, size * 0.98, size * 0.62, size / 2, size - 4);
    ctx.fill();
    return canvas;
}

function createSidrah(w: number, h: number): Scene {
    const rand = mulberry32(11);
    const s = h / 900;

    // ---------- static sky, hills and ground ----------
    const bg = makeCanvas(w, h);
    const b = ctx2d(bg);

    const sky = b.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#080c26');
    sky.addColorStop(0.3, '#1c1746');
    sky.addColorStop(0.55, '#4a2a5c');
    sky.addColorStop(0.7, '#8a4a66');
    sky.addColorStop(0.8, '#c97f66');
    sky.addColorStop(1, '#d99a70');
    b.fillStyle = sky;
    b.fillRect(0, 0, w, h);

    for (let i = 0; i < 170; i++) {
        const y = Math.pow(rand(), 1.6) * h * 0.55;
        b.globalAlpha = (0.15 + rand() * 0.6) * (1 - y / (h * 0.6));
        b.fillStyle = rand() > 0.8 ? '#ffe3c2' : '#dfe6ff';
        const r = (0.5 + rand() * 0.9) * s;
        b.beginPath();
        b.arc(rand() * w, y, r, 0, Math.PI * 2);
        b.fill();
    }
    b.globalAlpha = 1;

    const sunX = w * 0.2;
    const sunY = h * 0.76;
    const sunGlow = b.createRadialGradient(sunX, sunY, 0, sunX, sunY, h * 0.75);
    sunGlow.addColorStop(0, 'rgba(255,224,170,0.95)');
    sunGlow.addColorStop(0.18, 'rgba(255,176,124,0.55)');
    sunGlow.addColorStop(0.5, 'rgba(220,110,120,0.14)');
    sunGlow.addColorStop(1, 'rgba(200,90,120,0)');
    b.fillStyle = sunGlow;
    b.fillRect(0, 0, w, h);

    const hillNoise = noise1d(rand, 4);
    const hill = (baseY: number, amp: number, freq: number, offset: number, top: string, bottom: string) => {
        const gradient = b.createLinearGradient(0, baseY - amp, 0, h);
        gradient.addColorStop(0, top);
        gradient.addColorStop(1, bottom);
        b.fillStyle = gradient;
        b.beginPath();
        b.moveTo(0, h);
        for (let x = 0; x <= w; x += 6) {
            b.lineTo(x, baseY - hillNoise((x / h) * freq + offset) * amp);
        }
        b.lineTo(w, h);
        b.closePath();
        b.fill();
    };
    hill(h * 0.79, h * 0.09, 1.6, 3, '#5b3458', '#3a2146');
    hill(h * 0.84, h * 0.08, 2.3, 40, '#34203f', '#1d1330');

    // foreground knoll that the tree stands on
    const treeX = w * 0.83;
    const treeY = h * 0.885;
    const ground = (x: number) => {
        const d = (x - treeX) / (h * 0.9);
        return h * 0.955 - Math.exp(-d * d) * h * 0.08 - hillNoise((x / h) * 3 + 90) * h * 0.02;
    };
    const groundGradient = b.createLinearGradient(0, h * 0.86, 0, h);
    groundGradient.addColorStop(0, '#150e22');
    groundGradient.addColorStop(1, '#07050d');
    b.fillStyle = groundGradient;
    b.beginPath();
    b.moveTo(0, h);
    for (let x = 0; x <= w; x += 6) b.lineTo(x, ground(x));
    b.lineTo(w, h);
    b.closePath();
    b.fill();

    // ---------- the tree, pre-rendered in three layers ----------
    const back = makeCanvas(w, h);
    const wood = makeCanvas(w, h);
    const front = makeCanvas(w, h);
    const bk = ctx2d(back);
    const wd = ctx2d(wood);
    const fr = ctx2d(front);
    wd.lineCap = 'round';
    wd.lineJoin = 'round';

    const leaf = (ctx: CanvasRenderingContext2D, x: number, y: number, len: number, color: string, alpha: number) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rand() * Math.PI);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(0, 0, len, len * 0.46, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    };

    const cluster = (x: number, y: number, spread: number, density: number) => {
        const backCount = Math.round(16 * density);
        for (let i = 0; i < backCount; i++) {
            const a = rand() * Math.PI * 2;
            const r = Math.sqrt(rand()) * spread;
            leaf(bk, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.8, (7 + rand() * 6) * s,
                BACK_LEAVES[Math.floor(rand() * BACK_LEAVES.length)], 0.9);
        }
        const frontCount = Math.round(11 * density);
        for (let i = 0; i < frontCount; i++) {
            const a = rand() * Math.PI * 2;
            const r = Math.sqrt(rand()) * spread * 0.85;
            // light comes from the low sun on the left, so brighter leaves sit up and left
            const lx = x + Math.cos(a) * r - spread * 0.18;
            const ly = y + Math.sin(a) * r * 0.75 - spread * 0.12;
            const lit = Math.min(FRONT_LEAVES.length - 1,
                Math.floor(rand() * rand() * FRONT_LEAVES.length + (Math.cos(a) < -0.3 ? 1 : 0)));
            leaf(fr, lx, ly, (5 + rand() * 5) * s, FRONT_LEAVES[lit], 0.5 + rand() * 0.4);
        }
        if (rand() < 0.5) {
            const blossoms = 2 + Math.floor(rand() * 5);
            for (let i = 0; i < blossoms; i++) {
                const a = rand() * Math.PI * 2;
                const r = Math.sqrt(rand()) * spread * 0.8;
                fr.globalAlpha = 0.75 + rand() * 0.25;
                fr.fillStyle = rand() > 0.45 ? '#ffe9ef' : '#f7c3d0';
                fr.beginPath();
                fr.arc(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.75, (1.6 + rand() * 1.8) * s, 0, Math.PI * 2);
                fr.fill();
            }
            fr.globalAlpha = 1;
        }
    };

    const canopy: Array<[number, number]> = [];
    const MAX_DEPTH = 8;

    const branch = (x: number, y: number, angle: number, length: number, width: number, depth: number, r: Rand) => {
        const bend = (r() - 0.5) * 0.5;
        const ex = x + Math.cos(angle) * length;
        const ey = y + Math.sin(angle) * length;
        const mx = (x + ex) / 2 + Math.cos(angle + Math.PI / 2) * length * bend * 0.4;
        const my = (y + ey) / 2 + Math.sin(angle + Math.PI / 2) * length * bend * 0.4;

        wd.strokeStyle = '#120b0c';
        wd.lineWidth = width;
        wd.beginPath();
        wd.moveTo(x, y);
        wd.quadraticCurveTo(mx, my, ex, ey);
        wd.stroke();
        if (width > 5 * s) {
            // warm rim light on the sun-facing side of the larger limbs
            wd.strokeStyle = 'rgba(190,120,90,0.28)';
            wd.lineWidth = Math.max(1, width * 0.16);
            wd.beginPath();
            wd.moveTo(x - width * 0.34, y);
            wd.quadraticCurveTo(mx - width * 0.34, my, ex - width * 0.26, ey);
            wd.stroke();
        }

        if (depth >= 4) {
            cluster(ex, ey, (30 + r() * 26) * s * Math.min(1, 0.55 + width / (9 * s)), depth >= 6 ? 1 : 0.6);
            canopy.push([ex, ey]);
        }
        if (depth >= MAX_DEPTH || length < 9 * s) return;

        const kids = depth < 2 ? 3 : r() < 0.3 ? 3 : 2;
        for (let i = 0; i < kids; i++) {
            const side = kids === 2 ? (i === 0 ? -1 : 1) : i - 1;
            const spread = (0.3 + r() * 0.34) * (depth < 2 ? 1.25 : 1);
            let next = angle + side * spread + (r() - 0.5) * 0.2;
            // lote crowns spread wide and their outer twigs droop
            if (depth >= 4) next += Math.cos(next) * 0.14;
            // keep the crown from sinking below the horizon line
            if (Math.sin(next) > 0.35) next = Math.atan2(0.35, Math.cos(next));
            branch(ex, ey, next, length * (0.72 + r() * 0.13), width * (kids === 3 ? 0.6 : 0.68), depth + 1, r);
        }
    };

    branch(treeX, treeY + 6 * s, -Math.PI / 2 - 0.1, h * 0.17, 40 * s, 0, mulberry32(4));
    // root flare
    wd.fillStyle = '#120b0c';
    wd.beginPath();
    wd.moveTo(treeX - 46 * s, treeY + 16 * s);
    wd.quadraticCurveTo(treeX - 18 * s, treeY + 4 * s, treeX - 15 * s, treeY - 40 * s);
    wd.lineTo(treeX + 20 * s, treeY - 40 * s);
    wd.quadraticCurveTo(treeX + 22 * s, treeY + 4 * s, treeX + 52 * s, treeY + 16 * s);
    wd.closePath();
    wd.fill();

    // a bough reaching in from the top-left corner to frame the text
    branch(-w * 0.03, h * 0.035, 0.2, h * 0.16, 9 * s, 4, mulberry32(15));
    branch(-w * 0.03, h * 0.16, 0.5, h * 0.11, 6 * s, 5, mulberry32(3));

    // petals already resting on the ground
    for (let i = 0; i < 90; i++) {
        const x = treeX + (rand() - 0.6) * h * 0.9;
        const y = ground(x) + rand() * h * 0.035 + 2 * s;
        b.globalAlpha = 0.25 + rand() * 0.4;
        b.fillStyle = rand() > 0.5 ? '#f6cdd6' : '#fff0f2';
        b.beginPath();
        b.ellipse(x, y, (2 + rand() * 3) * s, (1 + rand()) * s, rand() * Math.PI, 0, Math.PI * 2);
        b.fill();
    }
    b.globalAlpha = 1;

    // ---------- moving parts ----------
    const sprites = [
        petalSprite('#f2a7bd', '#fbd3dc', '#fff4f5'),
        petalSprite('#f6c1c8', '#fde6e6', '#ffffff'),
        petalSprite('#eeb7a6', '#fbdccd', '#fff6ec'),
    ];
    const moteSprite = glowSprite(64, [255, 214, 150], 2.4);

    const petalRand = mulberry32(77);
    const spawn = (petal: Petal, anywhere: boolean) => {
        if (anywhere) {
            petal.x = petalRand() * w * 1.15;
            petal.y = petalRand() * h;
            petal.age = 5;
        } else if (canopy.length > 0 && petalRand() < 0.7) {
            const [cx, cy] = canopy[Math.floor(petalRand() * canopy.length)];
            petal.x = cx + (petalRand() - 0.5) * 40 * s;
            petal.y = cy + (petalRand() - 0.5) * 30 * s;
            petal.age = 0;
        } else {
            petal.x = petalRand() * w * 1.3;
            petal.y = -30 * s;
            petal.age = 5;
        }
    };

    const petalCount = Math.round(Math.min(80, 30 + (w / h) * 18));
    const petals: Petal[] = [];
    for (let i = 0; i < petalCount; i++) {
        const z = 0.55 + petalRand() * 0.95;
        const petal: Petal = {
            x: 0,
            y: 0,
            z,
            size: (6 + petalRand() * 5) * z * s,
            fall: (20 + petalRand() * 20) * s,
            rot: petalRand() * Math.PI * 2,
            spin: (petalRand() - 0.5) * 1.6,
            flip: petalRand() * Math.PI * 2,
            flipSpeed: 0.8 + petalRand() * 1.7,
            swayPhase: petalRand() * Math.PI * 2,
            swaySpeed: 0.5 + petalRand() * 0.9,
            swayAmp: (10 + petalRand() * 22) * s,
            sprite: Math.floor(petalRand() * sprites.length),
            age: 5,
        };
        spawn(petal, true);
        petals.push(petal);
    }

    const motes: Mote[] = [];
    for (let i = 0; i < 16; i++) {
        motes.push({
            x: petalRand() * w,
            y: h * (0.62 + petalRand() * 0.3),
            phase: petalRand() * Math.PI * 2,
            speed: 0.25 + petalRand() * 0.5,
            radius: (10 + petalRand() * 14) * s,
        });
    }

    const drawSheared = (ctx: CanvasRenderingContext2D, layer: HTMLCanvasElement, k: number) => {
        ctx.setTransform(1, 0, -k, 1, k * treeY, 0);
        ctx.drawImage(layer, 0, 0);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
    };

    return {
        draw(ctx, t, dt) {
            ctx.drawImage(bg, 0, 0);

            const sway = 0.0034 * Math.sin(t * 0.47) + 0.0019 * Math.sin(t * 1.13 + 1);
            const swayFront = 0.0042 * Math.sin(t * 0.47 + 0.45) + 0.0024 * Math.sin(t * 1.31 + 2);
            drawSheared(ctx, back, sway * 0.9);
            drawSheared(ctx, wood, sway * 0.75);
            drawSheared(ctx, front, swayFront);

            ctx.globalCompositeOperation = 'lighter';
            for (const mote of motes) {
                const pulse = 0.5 + 0.5 * Math.sin(t * mote.speed * 2 + mote.phase);
                const x = mote.x + Math.sin(t * mote.speed * 0.6 + mote.phase) * 46 * s;
                const y = mote.y + Math.cos(t * mote.speed * 0.45 + mote.phase * 1.7) * 26 * s;
                ctx.globalAlpha = 0.12 + pulse * 0.5;
                ctx.drawImage(moteSprite, x - mote.radius, y - mote.radius, mote.radius * 2, mote.radius * 2);
            }
            ctx.globalCompositeOperation = 'source-over';

            const wind = (-30 + 17 * Math.sin(t * 0.11) + 9 * Math.sin(t * 0.29 + 2)) * s;
            for (const petal of petals) {
                petal.age += dt;
                petal.x += (wind * petal.z + Math.sin(t * petal.swaySpeed + petal.swayPhase) * petal.swayAmp) * dt;
                petal.y += petal.fall * petal.z * dt;
                petal.rot += petal.spin * dt;
                petal.flip += petal.flipSpeed * dt;
                if (petal.y > h + 30 * s || petal.x < -50 * s) spawn(petal, false);

                const tumble = Math.cos(petal.flip);
                ctx.save();
                ctx.translate(petal.x, petal.y);
                ctx.rotate(petal.rot);
                ctx.scale(1, 0.25 + Math.abs(tumble) * 0.75);
                ctx.globalAlpha = Math.min(1, petal.age / 1.5) * (petal.z > 1.25 ? 0.6 : 0.85);
                ctx.drawImage(sprites[petal.sprite], -petal.size, -petal.size, petal.size * 2, petal.size * 2);
                ctx.restore();
            }
            ctx.globalAlpha = 1;
        },
    };
}

export const sidrah: SceneDef = {
    id: 'sidrah',
    name: 'Lote Tree',
    accent: '#f6cfae',
    create: createSidrah,
};
