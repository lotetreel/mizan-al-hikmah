import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Saves the page scroll position when navigating away and restores it
 * when returning via back/forward. Pass `isReady = false` while async
 * data is still loading so the restore fires after content has rendered.
 */
export function useScrollRestoration(isReady = true) {
    const { key } = useLocation();
    const storageKey = `scroll:${key}`;
    // Capture the saved value at mount time so it isn't affected by the
    // cleanup write that happens when the component later unmounts.
    const savedY = useRef(sessionStorage.getItem(storageKey));

    // Restore once content is ready
    useEffect(() => {
        if (!isReady) return;
        const y = savedY.current ? parseInt(savedY.current) : 0;
        if (y > 0) {
            requestAnimationFrame(() => window.scrollTo(0, y));
        }
    }, [isReady]);

    // Save position when leaving this history entry
    useEffect(() => {
        return () => {
            sessionStorage.setItem(storageKey, String(window.scrollY));
        };
    }, [storageKey]);
}
