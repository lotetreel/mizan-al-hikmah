import { useEffect, useRef } from 'react';
import type { Scene, SceneDef } from './types';
import { SCENES, sceneById } from './scenes';
import { ctx2d, makeCanvas, smoothstep } from './util';

// Televisions have modest processors; the scenes are soft enough to upscale well.
const MAX_WIDTH = 1600;
const MAX_HEIGHT = 1600;
const CROSSFADE_SECONDS = 4;
const SLOW_FRAME_MS = 13;

interface LiveScene {
    def: SceneDef;
    scene: Scene;
    born: number;
}

interface SceneController {
    show(id: string): void;
    destroy(): void;
}

function createController(canvas: HTMLCanvasElement, initialId: string): SceneController {
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return { show: () => undefined, destroy: () => undefined };

    let width = 0;
    let height = 0;
    let buffer = makeCanvas(1, 1);
    let bufferCtx = ctx2d(buffer);
    let current: LiveScene | null = null;
    let incoming: LiveScene | null = null;
    let fadeStart = 0;
    let raf = 0;
    let last = performance.now() / 1000;
    let frame = 0;
    let cost = 0;
    let halfRate = false;
    let wanted = sceneById(initialId) ?? SCENES[0];

    const build = (def: SceneDef, born: number): LiveScene => ({ def, scene: def.create(width, height), born });

    const resize = () => {
        const cssWidth = Math.max(1, canvas.clientWidth || window.innerWidth);
        const cssHeight = Math.max(1, canvas.clientHeight || window.innerHeight);
        const scale = Math.min(window.devicePixelRatio || 1, MAX_WIDTH / cssWidth, MAX_HEIGHT / cssHeight);
        const nextWidth = Math.max(2, Math.round(cssWidth * scale));
        const nextHeight = Math.max(2, Math.round(cssHeight * scale));
        if (nextWidth === width && nextHeight === height) return;

        width = nextWidth;
        height = nextHeight;
        canvas.width = width;
        canvas.height = height;
        buffer = makeCanvas(width, height);
        bufferCtx = ctx2d(buffer);

        const now = performance.now() / 1000;
        current = build(current?.def ?? wanted, current?.born ?? now);
        if (incoming) incoming = build(incoming.def, incoming.born);
    };

    const paint = (now: number, dt: number) => {
        if (!current) return;
        ctx.save();
        current.scene.draw(ctx, now - current.born, dt);
        ctx.restore();

        if (!incoming) return;
        bufferCtx.save();
        incoming.scene.draw(bufferCtx, now - incoming.born, dt);
        bufferCtx.restore();

        const progress = (now - fadeStart) / CROSSFADE_SECONDS;
        ctx.globalAlpha = smoothstep(progress);
        ctx.drawImage(buffer, 0, 0);
        ctx.globalAlpha = 1;
        if (progress >= 1) {
            current = incoming;
            incoming = null;
        }
    };

    const tick = (ms: number) => {
        raf = requestAnimationFrame(tick);
        frame += 1;
        if (halfRate && frame % 2 === 1) return;

        const now = ms / 1000;
        const dt = Math.min(0.1, Math.max(0, now - last));
        last = now;

        const started = performance.now();
        paint(now, dt);
        cost = cost * 0.92 + (performance.now() - started) * 0.08;
        // If frames are expensive on this device, settle for 30 a second rather than stutter.
        if (!halfRate && frame > 90 && cost > SLOW_FRAME_MS) halfRate = true;
    };

    resize();
    window.addEventListener('resize', resize);
    raf = requestAnimationFrame(tick);

    return {
        show(id) {
            const def = sceneById(id);
            if (!def) return;
            wanted = def;
            const showing = incoming ?? current;
            if (!showing || showing.def.id === def.id) return;
            if (incoming) current = incoming;
            const now = performance.now() / 1000;
            incoming = build(def, now);
            fadeStart = now;
        },
        destroy() {
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', resize);
        },
    };
}

export function SceneCanvas({ sceneId }: { sceneId: string }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const controllerRef = useRef<SceneController | null>(null);
    const sceneIdRef = useRef(sceneId);

    useEffect(() => {
        sceneIdRef.current = sceneId;
        controllerRef.current?.show(sceneId);
    }, [sceneId]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const controller = createController(canvas, sceneIdRef.current);
        controllerRef.current = controller;
        return () => {
            controller.destroy();
            controllerRef.current = null;
        };
    }, []);

    return <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 h-full w-full" />;
}
