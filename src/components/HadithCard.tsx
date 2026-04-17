import type { Hadith } from '../lib/types';
import { Copy, Check, Image as ImageIcon, Heart, Link2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { HadithShareModal } from './HadithShareModal';
import { useFontSettings } from '../contexts/FontSettingsContext';
import { useFavorites } from '../contexts/FavoritesContext';

interface HadithCardProps {
    hadith: Hadith;
    volume: number;
    chapterNum: number;
    chapterTitleEn: string;
    chapterTitleAr: string;
    sectionNum: number;
    sectionTitleEn: string;
    sectionTitleAr: string;
    showChapterInfo?: boolean;
}

const DOUBLE_TAP_MS = 300;
const CELEBRATION_MS = 900;

const floatingHearts = [
    { x: -32, rotate: -25, delay: 0 },
    { x: 28, rotate: 20, delay: 0.05 },
    { x: -12, rotate: -8, delay: 0.1 },
    { x: 14, rotate: 12, delay: 0.15 },
    { x: 0, rotate: 0, delay: 0.2 },
];

const sparkleAngles = [0, 45, 90, 135, 180, 225, 270, 315];

export function HadithCard({
    hadith,
    volume,
    chapterNum,
    chapterTitleEn,
    chapterTitleAr,
    sectionNum,
    sectionTitleEn,
    sectionTitleAr,
    showChapterInfo,
}: HadithCardProps) {
    const [copied, setCopied] = useState(false);
    const [linkCopied, setLinkCopied] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [celebrate, setCelebrate] = useState(false);
    const [highlighted, setHighlighted] = useState(false);
    const lastTapRef = useRef(0);
    const celebrateTimerRef = useRef<number | null>(null);
    const { settings } = useFontSettings();
    const { isFavorite, toggleFavorite } = useFavorites();
    const location = useLocation();

    const favorited = isFavorite(volume, hadith.hadith_num);
    const anchorId = `h-${hadith.hadith_num}`;
    const permalinkPath = `/volume/${volume}/chapter/${chapterNum}#${anchorId}`;

    useEffect(() => {
        if (location.hash !== `#${anchorId}`) return;
        const raf = requestAnimationFrame(() => {
            document
                .getElementById(anchorId)
                ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setHighlighted(true);
        });
        const t = window.setTimeout(() => setHighlighted(false), 2200);
        return () => {
            cancelAnimationFrame(raf);
            window.clearTimeout(t);
        };
    }, [location.hash, anchorId]);

    const copyToClipboard = () => {
        const text = `${hadith.arabic}\n\n${hadith.english}\n\n(Mizan al Hikmah, Hadith #${hadith.hadith_num})`;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const copyPermalink = () => {
        const url = `${window.location.origin}${permalinkPath}`;
        navigator.clipboard.writeText(url);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
    };

    const triggerCelebration = () => {
        setCelebrate(true);
        if (celebrateTimerRef.current) {
            window.clearTimeout(celebrateTimerRef.current);
        }
        celebrateTimerRef.current = window.setTimeout(() => setCelebrate(false), CELEBRATION_MS);
    };

    const handleToggleFavorite = () => {
        const added = toggleFavorite({
            volume,
            chapterNum,
            chapterTitleEn,
            chapterTitleAr,
            sectionNum,
            sectionTitleEn,
            sectionTitleAr,
            hadith,
        });
        if (added) triggerCelebration();
    };

    const handleCardClick = (event: React.MouseEvent<HTMLDivElement>) => {
        const target = event.target as HTMLElement;
        if (target.closest('button, a, input, textarea')) return;

        const now = Date.now();
        if (now - lastTapRef.current < DOUBLE_TAP_MS) {
            lastTapRef.current = 0;
            handleToggleFavorite();
        } else {
            lastTapRef.current = now;
        }
    };

    return (
        <>
            <motion.div
                id={anchorId}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                onClick={handleCardClick}
                className={cn(
                    "relative bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border transition-all select-none scroll-mt-44",
                    highlighted &&
                        "ring-4 ring-primary-400/70 ring-offset-2 ring-offset-slate-50 dark:ring-offset-slate-950",
                    favorited
                        ? "border-rose-300 dark:border-rose-500/40 shadow-rose-100/40 dark:shadow-rose-900/10"
                        : "border-slate-200 dark:border-slate-800 hover:shadow-md"
                )}
            >
                {showChapterInfo && (
                    <div className="mb-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                        <div className="text-xs font-serif text-slate-500 uppercase tracking-wider mb-1">
                            {chapterTitleEn}
                        </div>
                        <div className="text-sm font-medium text-primary-600 dark:text-primary-400">
                            {sectionTitleEn}
                        </div>
                    </div>
                )}

                <div className="space-y-6">
                    <div className="flex justify-between items-start gap-4">
                        <span className="text-xs font-mono text-slate-400 shrink-0 mt-1">
                            #{hadith.hadith_num}
                        </span>
                        <p
                            className="leading-loose text-slate-800 dark:text-slate-200 text-right"
                            dir="rtl"
                            style={{
                                fontFamily: settings.arabicFontFamily === 'arabic' ? 'var(--font-arabic)' : `'${settings.arabicFontFamily}', var(--font-arabic)`,
                                fontSize: `${settings.arabicFontSize}px`
                            }}
                        >
                            {hadith.arabic}
                        </p>
                    </div>

                    <p
                        className="leading-relaxed text-slate-600 dark:text-slate-400"
                        style={{
                            fontSize: `${settings.englishFontSize}px`
                        }}
                    >
                        {hadith.english}
                    </p>

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            onClick={handleToggleFavorite}
                            aria-pressed={favorited}
                            aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
                            title={favorited ? 'Remove from favorites' : 'Favorite this hadith (or double-tap the card)'}
                            className={cn(
                                "relative p-2 rounded-full transition-colors",
                                favorited
                                    ? "text-rose-500 bg-rose-50 dark:bg-rose-900/20"
                                    : "text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                            )}
                        >
                            <motion.span
                                key={favorited ? 'on' : 'off'}
                                initial={{ scale: 1 }}
                                animate={celebrate ? { scale: [1, 1.5, 0.9, 1.15, 1] } : { scale: 1 }}
                                transition={{ duration: 0.6, ease: 'easeOut' }}
                                className="inline-flex"
                            >
                                <Heart
                                    size={18}
                                    fill={favorited ? 'currentColor' : 'none'}
                                    strokeWidth={favorited ? 2 : 2}
                                />
                            </motion.span>

                            <AnimatePresence>
                                {celebrate && (
                                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                        {sparkleAngles.map((angle) => (
                                            <motion.span
                                                key={`sparkle-${angle}`}
                                                initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
                                                animate={{
                                                    opacity: [0, 1, 0],
                                                    x: Math.cos((angle * Math.PI) / 180) * 28,
                                                    y: Math.sin((angle * Math.PI) / 180) * 28,
                                                    scale: [0, 1, 0.6],
                                                }}
                                                exit={{ opacity: 0 }}
                                                transition={{ duration: 0.7, ease: 'easeOut' }}
                                                className="absolute h-1.5 w-1.5 rounded-full bg-rose-400 dark:bg-rose-300"
                                            />
                                        ))}
                                        {floatingHearts.map((h, i) => (
                                            <motion.span
                                                key={`float-${i}`}
                                                initial={{ opacity: 0, y: 0, x: 0, scale: 0.6, rotate: 0 }}
                                                animate={{
                                                    opacity: [0, 1, 0],
                                                    y: -48,
                                                    x: h.x,
                                                    rotate: h.rotate,
                                                    scale: [0.6, 1.1, 0.9],
                                                }}
                                                exit={{ opacity: 0 }}
                                                transition={{ duration: 0.85, delay: h.delay, ease: 'easeOut' }}
                                                className="absolute text-rose-500"
                                            >
                                                <Heart size={14} fill="currentColor" strokeWidth={0} />
                                            </motion.span>
                                        ))}
                                    </span>
                                )}
                            </AnimatePresence>
                        </button>
                        <button
                            onClick={copyPermalink}
                            className={cn(
                                "p-2 rounded-full transition-colors",
                                linkCopied
                                    ? "text-green-500 bg-green-50 dark:bg-green-900/20"
                                    : "text-slate-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20"
                            )}
                            title={linkCopied ? 'Link copied' : 'Copy link to this hadith'}
                            aria-label="Copy link to this hadith"
                        >
                            {linkCopied ? <Check size={18} /> : <Link2 size={18} />}
                        </button>
                        <button
                            onClick={() => setIsShareModalOpen(true)}
                            className="p-2 text-slate-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-full transition-colors"
                            title="Create Image"
                        >
                            <ImageIcon size={18} />
                        </button>
                        <button
                            onClick={copyToClipboard}
                            className={cn(
                                "p-2 rounded-full transition-colors",
                                copied
                                    ? "text-green-500 bg-green-50 dark:bg-green-900/20"
                                    : "text-slate-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20"
                            )}
                            title="Copy to clipboard"
                        >
                            {copied ? <Check size={18} /> : <Copy size={18} />}
                        </button>
                    </div>
                </div>

                <AnimatePresence>
                    {celebrate && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
                        >
                            <motion.div
                                initial={{ scale: 0.2, opacity: 0 }}
                                animate={{ scale: [0.2, 1.6, 1.3], opacity: [0, 0.9, 0] }}
                                transition={{ duration: 0.7, ease: 'easeOut' }}
                                className="text-rose-500 drop-shadow-[0_0_12px_rgba(244,63,94,0.6)]"
                            >
                                <Heart size={96} fill="currentColor" strokeWidth={0} />
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            <HadithShareModal
                isOpen={isShareModalOpen}
                onClose={() => setIsShareModalOpen(false)}
                hadith={hadith}
                chapterTitle={chapterTitleEn}
            />
        </>
    );
}
