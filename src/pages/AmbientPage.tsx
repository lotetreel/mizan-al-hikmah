import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, Maximize, Minimize, Pause, Play, SkipBack, SkipForward, X } from 'lucide-react';
import { SceneCanvas } from '../ambient/SceneCanvas';
import { SCENES, sceneById } from '../ambient/scenes';
import { dwellSeconds, loadAmbientPool } from '../ambient/hadithPool';
import type { AmbientHadith } from '../ambient/hadithPool';
import { canFullscreen, enterFullscreen, exitFullscreen, isFullscreen } from '../ambient/fullscreen';
import { useFontSettings } from '../contexts/FontSettingsContext';
import { grainDataUrl } from '../ambient/util';
import { cn } from '../lib/utils';

type Pace = 'slow' | 'normal' | 'fast';

interface AmbientSettings {
    /** 'auto' rotates through every scene; otherwise the id of the scene to stay on. */
    scene: string;
    pace: Pace;
}

const SETTINGS_KEY = 'mizan-ambient-settings';
const PACE_FACTOR: Record<Pace, number> = { slow: 1.6, normal: 1, fast: 0.6 };
const PACE_LABEL: Record<Pace, string> = { slow: 'Unhurried', normal: 'Normal', fast: 'Brisk' };
const HADITH_PER_SCENE = 3;
const HISTORY_LENGTH = 60;
const INTRO_MS = 4500;
const CONTROLS_VISIBLE_MS = 4500;
const MIN_FIT = 0.56;
const MAX_FIT = 1.3;

function isPace(value: unknown): value is Pace {
    return value === 'slow' || value === 'normal' || value === 'fast';
}

function loadSettings(): AmbientSettings {
    const settings: AmbientSettings = { scene: 'auto', pace: 'normal' };
    try {
        const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') as Partial<AmbientSettings>;
        if (typeof saved.scene === 'string' && (saved.scene === 'auto' || sceneById(saved.scene))) {
            settings.scene = saved.scene;
        }
        if (isPace(saved.pace)) settings.pace = saved.pace;
    } catch {
        // Ignore unreadable settings and fall back to the defaults.
    }

    // A television can be bookmarked straight onto one scene: /ambient?scene=lanterns
    const params = new URLSearchParams(window.location.search);
    const scene = params.get('scene');
    if (scene && (scene === 'auto' || sceneById(scene))) settings.scene = scene;
    const pace = params.get('pace');
    if (isPace(pace)) settings.pace = pace;
    return settings;
}

interface RotationState {
    history: AmbientHadith[];
    position: number;
    shown: number;
    sceneIndex: number;
}

type RotationAction =
    | { type: 'next'; pick: AmbientHadith | null; rotateScene: boolean }
    | { type: 'previous' }
    | { type: 'scene'; index: number };

function rotationReducer(state: RotationState, action: RotationAction): RotationState {
    switch (action.type) {
        case 'next': {
            let { history, position } = state;
            if (position < history.length - 1) {
                position += 1;
            } else if (action.pick) {
                history = [...history, action.pick].slice(-HISTORY_LENGTH);
                position = history.length - 1;
            } else {
                return state;
            }
            const shown = state.shown + 1;
            const turnScene = action.rotateScene && shown > 1 && (shown - 1) % HADITH_PER_SCENE === 0;
            return {
                history,
                position,
                shown,
                sceneIndex: turnScene ? (state.sceneIndex + 1) % SCENES.length : state.sceneIndex,
            };
        }
        case 'previous':
            return state.position > 0 ? { ...state, position: state.position - 1 } : state;
        case 'scene':
            return { ...state, sceneIndex: action.index };
    }
}

const TEXT_SHADOW = '0 2px 3px rgba(0,0,0,0.55), 0 0 26px rgba(0,0,0,0.6), 0 0 60px rgba(0,0,0,0.35)';

const groupVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.8, delayChildren: 0.5 } },
    exit: { opacity: 0, y: -10, transition: { duration: 1.3, ease: 'easeInOut' as const } },
};

const lineVariants = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 2, ease: 'easeOut' as const } },
};

function Ornament({ color }: { color: string }) {
    return (
        <svg
            aria-hidden="true"
            viewBox="0 0 240 24"
            className="mx-auto"
            style={{ width: 'calc(var(--fit) * 26vmin)', height: 'calc(var(--fit) * 2.6vmin)', color, transition: 'color 4s ease' }}
        >
            <path d="M0 12h92M148 12h92" stroke="currentColor" strokeWidth="1" strokeOpacity="0.7" />
            <g fill="none" stroke="currentColor" strokeWidth="1.3">
                <rect x="112" y="4" width="16" height="16" />
                <rect x="112" y="4" width="16" height="16" transform="rotate(45 120 12)" />
            </g>
            <circle cx="120" cy="12" r="2.2" fill="currentColor" />
            <circle cx="100" cy="12" r="1.4" fill="currentColor" fillOpacity="0.8" />
            <circle cx="140" cy="12" r="1.4" fill="currentColor" fillOpacity="0.8" />
        </svg>
    );
}

/** Finds the largest text size at which the whole hadith fits on screen. */
function useFitToScreen(dependency: string) {
    const ref = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        const element = ref.current;
        if (!element) return;

        const fit = () => {
            const available = window.innerHeight * 0.76;
            const fits = (scale: number) => {
                element.style.setProperty('--fit', scale.toFixed(3));
                return element.scrollHeight <= available;
            };
            if (fits(MAX_FIT)) return;
            let low = MIN_FIT;
            let high = MAX_FIT;
            for (let i = 0; i < 7; i++) {
                const middle = (low + high) / 2;
                if (fits(middle)) low = middle; else high = middle;
            }
            fits(low);
        };

        fit();
        window.addEventListener('resize', fit);
        let cancelled = false;
        // Web fonts change the measurements once they arrive.
        document.fonts?.ready.then(() => {
            if (!cancelled) fit();
        });
        return () => {
            cancelled = true;
            window.removeEventListener('resize', fit);
        };
    }, [dependency]);

    return ref;
}

function TextBlock({ fitKey, children }: { fitKey: string; children: ReactNode }) {
    const ref = useFitToScreen(fitKey);
    return (
        <motion.div
            ref={ref}
            variants={groupVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            className="text-center"
            style={{ '--fit': 1, width: 'min(88vw, 168vh)', textShadow: TEXT_SHADOW } as CSSProperties}
        >
            {children}
        </motion.div>
    );
}

function HadithView({ hadith, accent, arabicFont }: { hadith: AmbientHadith; accent: string; arabicFont: string }) {
    return (
        <TextBlock fitKey={`${hadith.key}|${arabicFont}`}>
            <motion.div variants={lineVariants} dir="rtl" lang="ar" style={{ fontFamily: arabicFont }}>
                <p
                    style={{
                        fontSize: 'calc(var(--fit) * 3vmin)',
                        lineHeight: 1.6,
                        color: accent,
                        transition: 'color 4s ease',
                        marginBottom: 'calc(var(--fit) * 1.2vmin)',
                    }}
                >
                    {hadith.arabicSpeaker}
                </p>
                <p
                    className="text-[#fffaf0]"
                    style={{ fontSize: 'calc(var(--fit) * 6.1vmin)', lineHeight: 1.78, textWrap: 'balance' }}
                >
                    {hadith.arabicText}
                </p>
            </motion.div>

            <motion.div
                variants={lineVariants}
                style={{ margin: 'calc(var(--fit) * 3vmin) 0 calc(var(--fit) * 2.8vmin)' }}
            >
                <Ornament color={accent} />
            </motion.div>

            <motion.div variants={lineVariants} lang="en" style={{ fontFamily: "'Lora', Georgia, serif" }}>
                <p
                    className="text-[#f7f5ee]"
                    style={{ fontSize: 'calc(var(--fit) * 3.95vmin)', lineHeight: 1.42, textWrap: 'balance' }}
                >
                    &ldquo;{hadith.englishText}&rdquo;
                </p>
                <p
                    className="font-sans font-medium uppercase"
                    style={{
                        fontSize: 'calc(var(--fit) * 1.95vmin)',
                        letterSpacing: '0.22em',
                        color: accent,
                        transition: 'color 4s ease',
                        marginTop: 'calc(var(--fit) * 2.4vmin)',
                    }}
                >
                    {hadith.speaker}
                </p>
            </motion.div>
        </TextBlock>
    );
}

function IntroView({ accent, arabicFont }: { accent: string; arabicFont: string }) {
    return (
        <TextBlock fitKey={`intro|${arabicFont}`}>
            <motion.p
                variants={lineVariants}
                dir="rtl"
                lang="ar"
                className="text-[#fffaf0]"
                style={{ fontFamily: arabicFont, fontSize: 'calc(var(--fit) * 7.4vmin)', lineHeight: 1.7 }}
            >
                بِسْمِ اللَّهِ الرَّحْمٰنِ الرَّحِيمِ
            </motion.p>
            <motion.div variants={lineVariants} style={{ margin: 'calc(var(--fit) * 3vmin) 0' }}>
                <Ornament color={accent} />
            </motion.div>
            <motion.p
                variants={lineVariants}
                className="font-sans font-medium uppercase text-white/85"
                style={{ fontSize: 'calc(var(--fit) * 2vmin)', letterSpacing: '0.3em' }}
            >
                Mizan al-Hikmah &middot; The Scale of Wisdom
            </motion.p>
        </TextBlock>
    );
}

const chipBase =
    'rounded-full px-[1.1em] py-[0.5em] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white';
const chipIdle = 'bg-white/10 text-white/85 hover:bg-white/20';
const chipActive = 'bg-white text-slate-900';
const iconButton =
    'inline-flex items-center justify-center rounded-full bg-white/10 p-[0.75em] text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white';

export default function AmbientPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { settings: fontSettings } = useFontSettings();
    const arabicFont = fontSettings.arabicFontFamily === 'arabic'
        ? "'Amiri', 'Scheherazade New', serif"
        : `'${fontSettings.arabicFontFamily}', 'Amiri', serif`;

    const [settings, setSettings] = useState<AmbientSettings>(loadSettings);
    const [rotation, dispatch] = useReducer(rotationReducer, undefined, (): RotationState => ({
        history: [],
        position: -1,
        shown: 0,
        sceneIndex: Math.max(0, SCENES.findIndex(scene => scene.id === loadSettings().scene)),
    }));
    const [paused, setPaused] = useState(false);
    const [failed, setFailed] = useState(false);
    const [controlsVisible, setControlsVisible] = useState(true);
    const [fullscreen, setFullscreen] = useState(isFullscreen);
    const [grain] = useState(() => grainDataUrl());

    const poolRef = useRef<AmbientHadith[]>([]);
    const seenRef = useRef(new Set<string>());
    const introDoneRef = useRef(false);
    const startedRef = useRef(false);
    const elapsedRef = useRef(0);
    const progressRef = useRef<HTMLDivElement>(null);
    const hideTimerRef = useRef<number | undefined>(undefined);

    const autoScene = settings.scene === 'auto';
    const scene = (autoScene ? undefined : sceneById(settings.scene)) ?? SCENES[rotation.sceneIndex % SCENES.length];
    const sceneNumber = SCENES.indexOf(scene);
    const current = rotation.position >= 0 ? rotation.history[rotation.position] : null;
    const currentKey = current?.key ?? null;
    const dwell = current ? dwellSeconds(current) * PACE_FACTOR[settings.pace] : 0;

    useEffect(() => {
        try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        } catch {
            // Storage can be unavailable (private windows, some TV browsers).
        }
    }, [settings]);

    const pickHadith = useCallback((): AmbientHadith | null => {
        const pool = poolRef.current;
        if (pool.length === 0) return null;
        const seen = seenRef.current;
        if (seen.size > pool.length * 0.8) seen.clear();
        let candidate = pool[Math.floor(Math.random() * pool.length)];
        for (let attempt = 0; attempt < 40 && seen.has(candidate.key); attempt++) {
            candidate = pool[Math.floor(Math.random() * pool.length)];
        }
        seen.add(candidate.key);
        return candidate;
    }, []);

    const next = useCallback(() => {
        dispatch({ type: 'next', pick: pickHadith(), rotateScene: autoScene });
    }, [pickHadith, autoScene]);

    const previous = useCallback(() => dispatch({ type: 'previous' }), []);

    // Begin once the opening card has had its moment and some hadith have arrived.
    const beginIfReady = useCallback(() => {
        if (startedRef.current || !introDoneRef.current || poolRef.current.length === 0) return;
        startedRef.current = true;
        dispatch({ type: 'next', pick: pickHadith(), rotateScene: false });
    }, [pickHadith]);

    useEffect(() => {
        let cancelled = false;
        const introTimer = window.setTimeout(() => {
            introDoneRef.current = true;
            beginIfReady();
        }, INTRO_MS);

        loadAmbientPool(items => {
            if (cancelled) return;
            poolRef.current = poolRef.current.concat(items);
            beginIfReady();
        }).then(total => {
            if (!cancelled && total === 0) setFailed(true);
        });

        return () => {
            cancelled = true;
            window.clearTimeout(introTimer);
        };
    }, [beginIfReady]);

    // Reading time restarts with each hadith...
    useEffect(() => {
        elapsedRef.current = 0;
        if (progressRef.current) progressRef.current.style.transform = 'scaleX(0)';
    }, [currentKey]);

    // ...and only runs down while playing and actually on screen.
    useEffect(() => {
        if (!currentKey || paused || dwell <= 0) return;
        let last = performance.now();
        let finished = false;
        const timer = window.setInterval(() => {
            const now = performance.now();
            const delta = Math.min(1, (now - last) / 1000);
            last = now;
            if (finished || document.hidden) return;
            elapsedRef.current += delta;
            const progress = Math.min(1, elapsedRef.current / dwell);
            if (progressRef.current) progressRef.current.style.transform = `scaleX(${progress})`;
            if (progress >= 1) {
                finished = true;
                next();
            }
        }, 200);
        return () => window.clearInterval(timer);
    }, [currentKey, paused, dwell, next]);

    const selectScene = useCallback((id: string) => {
        if (id === 'auto') {
            // Carry on rotating from whichever scene is showing now.
            dispatch({ type: 'scene', index: Math.max(0, sceneNumber) });
        }
        setSettings(previousSettings => ({ ...previousSettings, scene: id }));
    }, [sceneNumber]);

    const stepScene = useCallback((delta: number) => {
        const index = (sceneNumber + delta + SCENES.length) % SCENES.length;
        setSettings(previousSettings => ({ ...previousSettings, scene: SCENES[index].id }));
    }, [sceneNumber]);

    const toggleFullscreen = useCallback(() => {
        if (isFullscreen()) exitFullscreen(); else enterFullscreen();
    }, []);

    const exit = useCallback(() => {
        exitFullscreen();
        if (location.key !== 'default') navigate(-1); else navigate('/');
    }, [location.key, navigate]);

    const showControls = useCallback(() => {
        setControlsVisible(true);
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = window.setTimeout(() => setControlsVisible(false), CONTROLS_VISIBLE_MS);
    }, []);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.metaKey || event.ctrlKey || event.altKey) return;
            const onControl = event.target instanceof HTMLButtonElement || event.target instanceof HTMLAnchorElement;
            showControls();
            switch (event.key) {
                case ' ':
                case 'Enter':
                case 'MediaPlayPause':
                    if (onControl && event.key !== 'MediaPlayPause') return;
                    setPaused(value => !value);
                    break;
                case 'ArrowRight':
                case 'MediaTrackNext':
                    next();
                    break;
                case 'ArrowLeft':
                case 'MediaTrackPrevious':
                    previous();
                    break;
                case 'ArrowUp':
                    stepScene(-1);
                    break;
                case 'ArrowDown':
                    stepScene(1);
                    break;
                case 'f':
                case 'F':
                    toggleFullscreen();
                    break;
                case 'Escape':
                case 'BrowserBack':
                case 'GoBack':
                    exit();
                    break;
                default:
                    return;
            }
            event.preventDefault();
        };
        const onFullscreenChange = () => setFullscreen(isFullscreen());

        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('pointermove', showControls);
        window.addEventListener('pointerdown', showControls);
        document.addEventListener('fullscreenchange', onFullscreenChange);
        document.addEventListener('webkitfullscreenchange', onFullscreenChange);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('pointermove', showControls);
            window.removeEventListener('pointerdown', showControls);
            document.removeEventListener('fullscreenchange', onFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
        };
    }, [exit, next, previous, showControls, stepScene, toggleFullscreen]);

    useEffect(() => {
        hideTimerRef.current = window.setTimeout(() => setControlsVisible(false), CONTROLS_VISIBLE_MS);
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            window.clearTimeout(hideTimerRef.current);
            document.body.style.overflow = previousOverflow;
        };
    }, []);

    // Keep the screen awake while the mode is showing.
    useEffect(() => {
        let sentinel: WakeLockSentinel | null = null;
        let cancelled = false;
        const acquire = async () => {
            if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
            try {
                const lock = await navigator.wakeLock.request('screen');
                if (cancelled) void lock.release(); else sentinel = lock;
            } catch {
                // Not granted (battery saver, unsupported); the mode still works.
            }
        };
        void acquire();
        document.addEventListener('visibilitychange', acquire);
        return () => {
            cancelled = true;
            document.removeEventListener('visibilitychange', acquire);
            void sentinel?.release().catch(() => undefined);
        };
    }, []);

    // A gentle shift between hadith so nothing rests on exactly the same pixels all evening.
    const driftX = ((rotation.shown * 7) % 5) - 2;
    const driftY = ((rotation.shown * 3) % 5) - 2;
    const reference = current
        ? ['Mizan al-Hikmah', current.chapterTitle, current.sectionTitle]
            .filter((part, index, parts) => parts.findIndex(other => other.toLowerCase() === part.toLowerCase()) === index)
        : [];

    return (
        <div
            className="fixed inset-0 z-[100] select-none overflow-hidden bg-black text-white"
            style={{ cursor: controlsVisible ? 'auto' : 'none' }}
        >
            <SceneCanvas sceneId={scene.id} />
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
                style={{ backgroundImage: `url(${grain})` }}
            />

            {/* Darkens the middle of the picture so the words always have something calm behind them. */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
                style={{
                    background:
                        'radial-gradient(ellipse 68% 62% at 50% 48%, rgba(2,4,12,0.62) 0%, rgba(2,4,12,0.46) 45%, rgba(2,4,12,0.16) 80%, rgba(2,4,12,0) 100%), radial-gradient(ellipse at center, rgba(0,0,0,0) 58%, rgba(0,0,0,0.42) 100%)',
                }}
            />

            <main
                className="absolute inset-0 flex items-center justify-center"
                style={{
                    paddingBottom: '5vh',
                    transform: `translate(${driftX * 0.5}vmin, ${driftY * 0.4}vmin)`,
                }}
                aria-live="polite"
            >
                <AnimatePresence mode="wait">
                    {current ? (
                        <HadithView key={current.key} hadith={current} accent={scene.accent} arabicFont={arabicFont} />
                    ) : failed ? (
                        <motion.div
                            key="failed"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="max-w-xl space-y-5 px-6 text-center"
                            style={{ textShadow: TEXT_SHADOW }}
                        >
                            <p className="font-serif text-2xl">The hadith could not be loaded.</p>
                            <p className="text-white/75">Check the connection and try again.</p>
                            <button
                                type="button"
                                onClick={() => window.location.reload()}
                                className={cn(chipBase, chipActive)}
                            >
                                Try again
                            </button>
                        </motion.div>
                    ) : (
                        <IntroView key="intro" accent={scene.accent} arabicFont={arabicFont} />
                    )}
                </AnimatePresence>
            </main>

            <AnimatePresence mode="wait">
                {current && (
                    <motion.p
                        key={current.key}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: controlsVisible ? 0 : 0.72, transition: { duration: 1.6, delay: controlsVisible ? 0 : 0.6 } }}
                        exit={{ opacity: 0, transition: { duration: 1 } }}
                        className="pointer-events-none absolute inset-x-0 truncate px-[6vw] text-center font-sans text-white"
                        style={{ bottom: '3.4vmin', fontSize: 'max(11px, 1.75vmin)', letterSpacing: '0.08em', textShadow: TEXT_SHADOW }}
                    >
                        {reference.join('  ·  ')}
                    </motion.p>
                )}
            </AnimatePresence>

            {paused && !controlsVisible && (
                <div
                    className="pointer-events-none absolute flex items-center gap-2 text-white/60"
                    style={{ right: '3vmin', top: '3vmin', fontSize: 'max(11px, 1.6vmin)', letterSpacing: '0.16em' }}
                >
                    <Pause size="1.2em" /> PAUSED
                </div>
            )}

            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[3px] bg-white/10">
                <div
                    ref={progressRef}
                    className="h-full origin-left"
                    style={{ transform: 'scaleX(0)', background: scene.accent, opacity: 0.75, transition: 'transform 220ms linear, background 4s ease' }}
                />
            </div>

            {/* Controls: appear on any movement, tap or key press, then fade away again. */}
            <div
                inert={!controlsVisible}
                className={cn(
                    'absolute inset-0 flex flex-col justify-between transition-opacity duration-500',
                    controlsVisible ? 'opacity-100' : 'pointer-events-none opacity-0'
                )}
                style={{ fontSize: 'clamp(13px, 1.75vmin, 22px)' }}
            >
                <div className="flex items-center justify-between gap-3 bg-gradient-to-b from-black/75 to-transparent px-[2.4vmin] pb-[6vmin] pt-[2.4vmin]">
                    <button type="button" onClick={exit} className={cn(chipBase, chipIdle, 'inline-flex items-center gap-2')}>
                        <X size="1.15em" /> Exit
                    </button>
                    <div className="flex items-center gap-2">
                        {current && (
                            <Link
                                to={`/volume/${current.volume}/chapter/${current.chapterNum}#h-${current.hadithNum}`}
                                onClick={exitFullscreen}
                                className={cn(chipBase, chipIdle, 'inline-flex items-center gap-2')}
                            >
                                <BookOpen size="1.15em" /> <span className="hidden sm:inline">Read in context</span>
                            </Link>
                        )}
                        {canFullscreen() && (
                            <button
                                type="button"
                                onClick={toggleFullscreen}
                                className={iconButton}
                                aria-label={fullscreen ? 'Leave full screen' : 'Full screen'}
                                title={fullscreen ? 'Leave full screen (F)' : 'Full screen (F)'}
                            >
                                {fullscreen ? <Minimize size="1.25em" /> : <Maximize size="1.25em" />}
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex flex-col items-center gap-[1.4vmin] bg-gradient-to-t from-black/95 via-black/80 to-transparent px-[2.4vmin] pb-[3vmin] pt-[10vmin]">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={previous}
                            disabled={rotation.position <= 0}
                            className={cn(iconButton, 'disabled:opacity-35')}
                            aria-label="Previous hadith"
                            title="Previous hadith (←)"
                        >
                            <SkipBack size="1.25em" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setPaused(value => !value)}
                            className={cn(iconButton, 'bg-white p-[0.95em] text-slate-900 hover:bg-white/85')}
                            aria-label={paused ? 'Resume' : 'Pause'}
                            title={paused ? 'Resume (Space)' : 'Pause (Space)'}
                        >
                            {paused ? <Play size="1.4em" /> : <Pause size="1.4em" />}
                        </button>
                        <button
                            type="button"
                            onClick={next}
                            disabled={!current}
                            className={cn(iconButton, 'disabled:opacity-35')}
                            aria-label="Next hadith"
                            title="Next hadith (→)"
                        >
                            <SkipForward size="1.25em" />
                        </button>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-[0.5em]" role="group" aria-label="Background">
                        <button
                            type="button"
                            onClick={() => selectScene('auto')}
                            aria-pressed={autoScene}
                            className={cn(chipBase, autoScene ? chipActive : chipIdle)}
                        >
                            All backgrounds
                        </button>
                        {SCENES.map(option => (
                            <button
                                key={option.id}
                                type="button"
                                onClick={() => selectScene(option.id)}
                                aria-pressed={!autoScene && option.id === scene.id}
                                className={cn(
                                    chipBase,
                                    !autoScene && option.id === scene.id ? chipActive : chipIdle,
                                    autoScene && option.id === scene.id && 'ring-1 ring-white/70'
                                )}
                            >
                                {option.name}
                            </button>
                        ))}
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-[0.5em]" role="group" aria-label="Pace">
                        <span className="mr-1 text-white/60">Pace</span>
                        {(Object.keys(PACE_FACTOR) as Pace[]).map(pace => (
                            <button
                                key={pace}
                                type="button"
                                onClick={() => setSettings(previousSettings => ({ ...previousSettings, pace }))}
                                aria-pressed={settings.pace === pace}
                                className={cn(chipBase, settings.pace === pace ? chipActive : chipIdle)}
                            >
                                {PACE_LABEL[pace]}
                            </button>
                        ))}
                    </div>

                    <p className="hidden text-white/50 md:block" style={{ fontSize: '0.82em' }}>
                        Space pause &nbsp;·&nbsp; ← → hadith &nbsp;·&nbsp; ↑ ↓ background &nbsp;·&nbsp; F full screen &nbsp;·&nbsp; Esc exit
                    </p>
                </div>
            </div>
        </div>
    );
}
