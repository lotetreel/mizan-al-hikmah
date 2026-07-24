import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, BookOpen, Heart, Image as ImageIcon, Quote, RefreshCw } from 'lucide-react';
import { loadVolume } from '../lib/data';
import type { Chapter, Hadith, Section, VolumeData } from '../lib/types';
import { HadithShareModal } from './HadithShareModal';
import { useFavorites } from '../contexts/FavoritesContext';

const VOLUMES = [1, 2, 3, 4];
const MIN_ARABIC_LENGTH = 50;
const MAX_ARABIC_LENGTH = 240;
const MIN_ENGLISH_LENGTH = 55;
const MAX_ENGLISH_LENGTH = 115;

const LOWERCASE_TITLE_WORDS = new Set([
    'a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'from', 'in', 'nor', 'of', 'on', 'or', 'the', 'to',
]);

interface SectionLink {
    volume: number;
    chapterNum: number;
    sectionNum: number;
    title: string;
}

interface HadithSelection {
    volume: number;
    chapter: Chapter;
    section: Section;
    hadith: Hadith;
    relatedSections: SectionLink[];
}

function withoutHadithNumber(text: string): string {
    return text.replace(/^\s*\d+\.\s*/, '').trim();
}

function displayTitle(title: string): string {
    const words = title.toLocaleLowerCase().split(/\s+/);
    return words
        .map((word, index) => {
            if (index > 0 && index < words.length - 1 && LOWERCASE_TITLE_WORDS.has(word)) {
                return word;
            }
            return word.charAt(0).toLocaleUpperCase() + word.slice(1);
        })
        .join(' ');
}

function parseEnglishHadith(text: string): { attribution: string | null; text: string } {
    const cleanText = withoutHadithNumber(text);
    const quoteMatch = cleanText.match(
        /^(.{2,80}?)\s+(?:said|narrated|reported|related),?\s*['“](.+)['”]\s*$/i
    );

    if (!quoteMatch) {
        return { attribution: null, text: cleanText };
    }

    return {
        attribution: quoteMatch[1].trim(),
        text: quoteMatch[2].trim(),
    };
}

function selectionKey(selection: HadithSelection): string {
    return `${selection.volume}-${selection.hadith.hadith_num}`;
}

function sectionHref(section: SectionLink): string {
    return `/volume/${section.volume}/chapter/${section.chapterNum}#section-${section.sectionNum}`;
}

function shuffledVolumes(): number[] {
    return [...VOLUMES].sort(() => Math.random() - 0.5);
}

function collectCandidates(volume: number, data: VolumeData): HadithSelection[] {
    const candidates: HadithSelection[] = [];

    data.forEach(chapter => {
        chapter.sections.forEach(section => {
            section.hadiths.forEach(hadith => {
                const arabic = withoutHadithNumber(hadith.arabic);
                const english = parseEnglishHadith(hadith.english);
                const comfortableLength =
                    arabic.length >= MIN_ARABIC_LENGTH &&
                    arabic.length <= MAX_ARABIC_LENGTH &&
                    english.text.length >= MIN_ENGLISH_LENGTH &&
                    english.text.length <= MAX_ENGLISH_LENGTH;

                if (!comfortableLength || !english.attribution) return;

                candidates.push({
                    volume,
                    chapter,
                    section,
                    hadith,
                    relatedSections: [],
                });
            });
        });
    });

    return candidates;
}

function relatedSectionsFor(
    volume: number,
    data: VolumeData,
    chapter: Chapter,
    selectedSection: Section
): SectionLink[] {
    const currentChapter = [
        selectedSection,
        ...chapter.sections.filter(section => section.section_num !== selectedSection.section_num),
    ].map(section => ({
        volume,
        chapterNum: chapter.chapter_num,
        sectionNum: section.section_num,
        title: section.section_title_en,
    }));

    const nearbyChapters = data
        .filter(candidate => candidate.chapter_num !== chapter.chapter_num)
        .flatMap(candidate =>
            candidate.sections.map(section => ({
                volume,
                chapterNum: candidate.chapter_num,
                sectionNum: section.section_num,
                title: section.section_title_en,
            }))
        );

    const seen = new Set<string>();
    return [...currentChapter, ...nearbyChapters]
        .filter(section => {
            const key = `${section.chapterNum}-${section.sectionNum}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        })
        .slice(0, 3);
}

async function chooseRandomHadith(avoidKey?: string): Promise<HadithSelection | null> {
    for (const volume of shuffledVolumes()) {
        const data = await loadVolume(volume);
        const allCandidates = collectCandidates(volume, data);
        const freshCandidates = allCandidates.filter(candidate => selectionKey(candidate) !== avoidKey);
        const candidates = freshCandidates.length > 0 ? freshCandidates : allCandidates;
        if (candidates.length === 0) continue;

        const selection = candidates[Math.floor(Math.random() * candidates.length)];
        return {
            ...selection,
            relatedSections: relatedSectionsFor(
                volume,
                data,
                selection.chapter,
                selection.section
            ),
        };
    }

    return null;
}

export function RandomHadithSpotlight() {
    const [selection, setSelection] = useState<HadithSelection | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const currentKeyRef = useRef<string | undefined>(undefined);
    const requestIdRef = useRef(0);
    const { isFavorite, toggleFavorite } = useFavorites();

    const showAnotherHadith = useCallback(async () => {
        const requestId = ++requestIdRef.current;
        setLoading(true);
        setError(false);

        const nextSelection = await chooseRandomHadith(currentKeyRef.current);
        if (requestId !== requestIdRef.current) return;

        if (!nextSelection) {
            setError(true);
            setLoading(false);
            return;
        }

        currentKeyRef.current = selectionKey(nextSelection);
        setSelection(nextSelection);
        setLoading(false);
    }, []);

    useEffect(() => {
        const requestId = ++requestIdRef.current;

        const loadInitialHadith = async () => {
            const initialSelection = await chooseRandomHadith();
            if (requestId !== requestIdRef.current) return;

            if (!initialSelection) {
                setError(true);
                setLoading(false);
                return;
            }

            currentKeyRef.current = selectionKey(initialSelection);
            setSelection(initialSelection);
            setLoading(false);
        };

        void loadInitialHadith();
        return () => {
            requestIdRef.current += 1;
        };
    }, []);

    const englishHadith = selection ? parseEnglishHadith(selection.hadith.english) : null;
    const favorited = selection
        ? isFavorite(selection.volume, selection.hadith.hadith_num)
        : false;

    const handleToggleFavorite = () => {
        if (!selection) return;

        toggleFavorite({
            volume: selection.volume,
            chapterNum: selection.chapter.chapter_num,
            chapterTitleEn: selection.chapter.chapter_title_en,
            chapterTitleAr: selection.chapter.chapter_title_ar,
            sectionNum: selection.section.section_num,
            sectionTitleEn: selection.section.section_title_en,
            sectionTitleAr: selection.section.section_title_ar,
            hadith: selection.hadith,
        });
    };

    return (
        <section className="space-y-7" aria-labelledby="random-hadith-heading">
            <div className="flex items-center gap-3">
                <Quote
                    size={21}
                    strokeWidth={2.5}
                    className="fill-gold-500 text-gold-500 dark:fill-gold-300 dark:text-gold-300"
                />
                <h2
                    id="random-hadith-heading"
                    className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
                >
                    A hadith to reflect on
                </h2>
            </div>

            {error && !selection ? (
                <div className="flex min-h-72 flex-col items-center justify-center gap-4 border-y border-slate-200 py-12 text-center dark:border-slate-800">
                    <p className="text-slate-600 dark:text-slate-400">
                        We couldn&apos;t load a hadith just now.
                    </p>
                    <button
                        type="button"
                        onClick={showAnotherHadith}
                        className="inline-flex items-center gap-2 font-medium text-primary-600 transition-colors hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                    >
                        <RefreshCw size={16} />
                        Try again
                    </button>
                </div>
            ) : !selection ? (
                <HadithSpotlightSkeleton />
            ) : (
                <div className="grid gap-10 lg:min-h-[420px] lg:grid-cols-[minmax(0,1.8fr)_minmax(280px,0.9fr)] lg:gap-0">
                    <div className="min-w-0 lg:border-r lg:border-slate-200 lg:pr-12 dark:lg:border-slate-800">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={selectionKey(selection)}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.25 }}
                                className="flex h-full min-h-[420px] flex-col gap-7"
                                aria-live="polite"
                            >
                                <div className="h-0.5 w-14 bg-gold-500 dark:bg-gold-300" />
                                <Link
                                    to={`/volume/${selection.volume}/chapter/${selection.chapter.chapter_num}#h-${selection.hadith.hadith_num}`}
                                    aria-label={`Read Hadith ${selection.hadith.hadith_num}`}
                                    className="group -m-3 block max-w-3xl space-y-7 rounded-2xl p-3 transition-colors hover:bg-primary-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-4 focus-visible:ring-offset-slate-50 dark:hover:bg-primary-950/30 dark:focus-visible:ring-offset-slate-950"
                                >
                                    <p
                                        dir="rtl"
                                        lang="ar"
                                        className="text-right font-arabic text-3xl leading-[1.85] text-slate-900 transition-colors group-hover:text-primary-800 dark:text-slate-100 dark:group-hover:text-primary-200 sm:text-4xl lg:text-[2.65rem]"
                                    >
                                        {withoutHadithNumber(selection.hadith.arabic)}
                                    </p>
                                    <p className="font-serif text-2xl leading-snug text-slate-900 transition-colors group-hover:text-primary-800 dark:text-white dark:group-hover:text-primary-200 sm:text-3xl lg:text-[2rem]">
                                        {englishHadith?.text}
                                    </p>
                                </Link>

                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500 dark:text-slate-400 sm:text-base">
                                    <span>{englishHadith?.attribution ?? `Volume ${selection.volume}`}</span>
                                    <span aria-hidden="true" className="text-gold-500">•</span>
                                    <span>{displayTitle(selection.chapter.chapter_title_en)}</span>
                                    <span aria-hidden="true" className="text-gold-500">•</span>
                                    <span>{displayTitle(selection.section.section_title_en)}</span>
                                </div>

                                <div className="mt-auto flex flex-wrap items-center justify-between gap-5 pt-2">
                                    <Link
                                        to={`/volume/${selection.volume}/chapter/${selection.chapter.chapter_num}#section-${selection.section.section_num}`}
                                        className="group inline-flex items-center gap-3 font-semibold text-primary-600 transition-colors hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                                    >
                                        Read this section
                                        <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                                    </Link>

                                    <div
                                        role="group"
                                        aria-label="Hadith actions"
                                        className="flex items-center gap-1.5 rounded-2xl border border-slate-200/80 bg-white/90 p-1.5 shadow-sm shadow-slate-200/50 backdrop-blur dark:border-slate-700/80 dark:bg-slate-900/90 dark:shadow-none"
                                    >
                                        <button
                                            type="button"
                                            onClick={showAnotherHadith}
                                            disabled={loading}
                                            aria-label={loading ? 'Finding another hadith' : 'Show another hadith'}
                                            title={loading ? 'Finding another hadith…' : 'Show another hadith'}
                                            className="group inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary-600 text-white shadow-sm shadow-primary-600/20 transition-all hover:-translate-y-0.5 hover:bg-primary-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60 disabled:hover:translate-y-0 dark:bg-primary-500 dark:hover:bg-primary-400"
                                        >
                                            <RefreshCw
                                                size={20}
                                                strokeWidth={2.25}
                                                className={loading ? 'animate-spin' : 'transition-transform group-hover:rotate-45'}
                                            />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleToggleFavorite}
                                            aria-pressed={favorited}
                                            aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
                                            title={favorited ? 'Remove from favorites' : 'Add to favorites'}
                                            className={`inline-flex h-11 w-11 items-center justify-center rounded-xl transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 ${
                                                favorited
                                                    ? 'bg-rose-50 text-rose-500 shadow-sm shadow-rose-200/60 dark:bg-rose-950/50 dark:text-rose-300 dark:shadow-none'
                                                    : 'text-slate-500 hover:bg-rose-50 hover:text-rose-500 dark:text-slate-400 dark:hover:bg-rose-950/40 dark:hover:text-rose-300'
                                            }`}
                                        >
                                            <motion.span
                                                key={favorited ? 'favorited' : 'not-favorited'}
                                                initial={{ scale: favorited ? 0.65 : 1 }}
                                                animate={{ scale: 1 }}
                                                transition={{ type: 'spring', stiffness: 500, damping: 24 }}
                                                className="inline-flex"
                                            >
                                                <Heart
                                                    size={20}
                                                    strokeWidth={2.25}
                                                    fill={favorited ? 'currentColor' : 'none'}
                                                />
                                            </motion.span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsShareModalOpen(true)}
                                            aria-label="Generate a shareable image"
                                            aria-haspopup="dialog"
                                            aria-expanded={isShareModalOpen}
                                            title="Generate a shareable image"
                                            className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 transition-all hover:-translate-y-0.5 hover:bg-gold-50 hover:text-gold-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2 dark:text-slate-400 dark:hover:bg-gold-950/40 dark:hover:text-gold-300"
                                        >
                                            <ImageIcon size={20} strokeWidth={2.25} />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    <aside className="space-y-5 lg:pl-11" aria-label="Continue reading">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            Continue reading
                        </h3>
                        <div className="divide-y divide-slate-200 dark:divide-slate-800">
                            {selection.relatedSections.map(section => (
                                <Link
                                    key={`${section.chapterNum}-${section.sectionNum}`}
                                    to={sectionHref(section)}
                                    className="group flex items-center gap-4 py-5 first:pt-1"
                                >
                                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400">
                                        <BookOpen size={21} />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block font-serif text-base font-semibold leading-snug text-slate-900 dark:text-white">
                                            {displayTitle(section.title)}
                                        </span>
                                        <span className="mt-1 block text-sm text-slate-400">
                                            Section from Volume {section.volume}
                                        </span>
                                    </span>
                                    <ArrowRight
                                        size={17}
                                        className="shrink-0 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-primary-500"
                                    />
                                </Link>
                            ))}
                        </div>
                    </aside>
                </div>
            )}
            {selection && (
                <HadithShareModal
                    isOpen={isShareModalOpen}
                    onClose={() => setIsShareModalOpen(false)}
                    hadith={selection.hadith}
                    volume={selection.volume}
                    chapterNum={selection.chapter.chapter_num}
                    chapterTitle={selection.chapter.chapter_title_en}
                />
            )}
        </section>
    );
}

function HadithSpotlightSkeleton() {
    return (
        <div className="grid min-h-80 animate-pulse gap-10 lg:grid-cols-[minmax(0,1.8fr)_minmax(280px,0.9fr)] lg:gap-0">
            <div className="space-y-7 lg:border-r lg:border-slate-200 lg:pr-12 dark:lg:border-slate-800">
                <div className="h-0.5 w-14 bg-slate-200 dark:bg-slate-800" />
                <div className="ml-auto h-20 w-4/5 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-20 w-3/4 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-5 w-2/3 rounded bg-slate-200 dark:bg-slate-800" />
            </div>
            <div className="space-y-5 lg:pl-11">
                <div className="h-5 w-32 rounded bg-slate-200 dark:bg-slate-800" />
                {[0, 1, 2].map(index => (
                    <div key={index} className="flex items-center gap-4 py-3">
                        <div className="h-11 w-11 rounded-2xl bg-slate-200 dark:bg-slate-800" />
                        <div className="flex-1 space-y-2">
                            <div className="h-4 w-4/5 rounded bg-slate-200 dark:bg-slate-800" />
                            <div className="h-3 w-1/2 rounded bg-slate-200 dark:bg-slate-800" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
