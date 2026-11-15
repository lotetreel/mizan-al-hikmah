interface FullscreenDocument extends Document {
    webkitFullscreenElement?: Element | null;
    webkitExitFullscreen?: () => Promise<void> | void;
}

interface FullscreenElement extends HTMLElement {
    webkitRequestFullscreen?: () => Promise<void> | void;
}

export function isFullscreen(): boolean {
    const doc = document as FullscreenDocument;
    return Boolean(doc.fullscreenElement ?? doc.webkitFullscreenElement);
}

export function canFullscreen(): boolean {
    const root = document.documentElement as FullscreenElement;
    return typeof root.requestFullscreen === 'function' || typeof root.webkitRequestFullscreen === 'function';
}

/** Must be called from a user gesture (click or key press). Fails quietly where unsupported. */
export function enterFullscreen(): void {
    if (isFullscreen()) return;
    const root = document.documentElement as FullscreenElement;
    try {
        const result = root.requestFullscreen
            ? root.requestFullscreen({ navigationUI: 'hide' })
            : root.webkitRequestFullscreen?.();
        if (result instanceof Promise) result.catch(() => undefined);
    } catch {
        // Fullscreen is a nicety; the mode works without it.
    }
}

export function exitFullscreen(): void {
    if (!isFullscreen()) return;
    const doc = document as FullscreenDocument;
    try {
        const result = doc.exitFullscreen ? doc.exitFullscreen() : doc.webkitExitFullscreen?.();
        if (result instanceof Promise) result.catch(() => undefined);
    } catch {
        // Nothing useful to do if the browser refuses.
    }
}
