import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { toPng } from 'html-to-image';
import {
    BookOpen,
    ChevronLeft,
    ChevronRight,
    Download,
    Globe2,
    Loader2,
    Quote,
    Share2,
    X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Hadith } from '../lib/types';

interface HadithShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    hadith: Hadith;
    volume: number;
    chapterNum: number;
    chapterTitle?: string;
}

type SharePageKind = 'combined' | 'arabic' | 'english';

interface ParsedHadithText {
    attribution: string | null;
    text: string;
}

interface SharePage {
    id: string;
    kind: SharePageKind;
    isExcerpt?: boolean;
    arabic?: string;
    arabicAttribution?: string | null;
    english?: string;
    englishAttribution?: string | null;
    pageNumber: number;
    totalPages: number;
}

interface ShareCardProps {
    page: SharePage;
    theme: ShareTheme;
    volume: number;
    chapterTitle?: string;
    hadithNumber: number;
    captureRef?: (element: HTMLDivElement | null) => void;
    testId?: string;
}

interface ShareTheme {
    id: 'ivory' | 'midnight' | 'cedar' | 'burgundy';
    name: string;
    background: string;
    primaryText: string;
    secondaryText: string;
    brand: string;
    accent: string;
}

const EXPORT_CARD_SIZE = 540;
const EXPORT_PIXEL_RATIO = 2;
const MAX_COMBINED_ARABIC_LENGTH = 115;
const MAX_COMBINED_ENGLISH_LENGTH = 150;
const MAX_COMBINED_WEIGHT = 240;
const MAX_ARABIC_PAGE_LENGTH = 400;
const MAX_ENGLISH_PAGE_LENGTH = 520;

const SHARE_THEMES: ShareTheme[] = [
    {
        id: 'ivory',
        name: 'Nur',
        background: '#fbfaf7',
        primaryText: '#0f172a',
        secondaryText: '#475569',
        brand: '#0284c7',
        accent: '#c99a16',
    },
    {
        id: 'midnight',
        name: 'Layl',
        background: '#071426',
        primaryText: '#f4ede0',
        secondaryText: '#aabbd0',
        brand: '#45a7e8',
        accent: '#cdaa52',
    },
    {
        id: 'cedar',
        name: 'Rawdah',
        background: '#0b2e2a',
        primaryText: '#f4e9d3',
        secondaryText: '#b7c7ba',
        brand: '#a8d5ba',
        accent: '#d0aa55',
    },
    {
        id: 'burgundy',
        name: 'Aqiq',
        background: '#3b0d1a',
        primaryText: '#f4e8d8',
        secondaryText: '#cbb4b8',
        brand: '#d89aaa',
        accent: '#cda75a',
    },
];

const LOWERCASE_TITLE_WORDS = new Set([
    'a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'from', 'in', 'nor', 'of', 'on', 'or', 'the', 'to',
]);

function withoutHadithNumber(text: string): string {
    return text.replace(/^\s*\d+\.\s*/, '').trim();
}

function displayTitle(title?: string): string {
    if (!title) return 'The Scale of Wisdom';

    const words = title.toLocaleLowerCase().split(/\s+/);
    return words
        .map((word, index) => {
            if (index > 0 && index < words.length - 1 && LOWERCASE_TITLE_WORDS.has(word)) {
                return word;
            }
            if (/^\([a-z]+\)$/i.test(word)) return word.toLocaleUpperCase();
            return word
                .split('-')
                .map(part => part.charAt(0).toLocaleUpperCase() + part.slice(1))
                .join('-');
        })
        .join(' ');
}

function normalizeArabicAttribution(text: string): string {
    return text
        .replace(/^ا\s+لإمام/u, 'الإمام')
        .replace(/\s+/g, ' ')
        .trim();
}

function parseArabicHadith(text: string): ParsedHadithText {
    const cleanText = withoutHadithNumber(text);
    const separatorIndex = cleanText.search(/\s[:：]\s/u);

    if (separatorIndex === -1) {
        return { attribution: null, text: cleanText };
    }

    return {
        attribution: normalizeArabicAttribution(cleanText.slice(0, separatorIndex)),
        text: cleanText.slice(separatorIndex).replace(/^\s*[:：]\s*/u, '').trim(),
    };
}

function parseEnglishHadith(text: string): ParsedHadithText {
    const cleanText = withoutHadithNumber(text);
    const quoteMatch = cleanText.match(
        /^(.{2,220}?)\s+(?:said|narrated|reported|related),?\s*['“](.+)['”]\s*$/i,
    );

    if (!quoteMatch) {
        return { attribution: null, text: cleanText };
    }

    return {
        attribution: quoteMatch[1].trim(),
        text: quoteMatch[2].trim(),
    };
}

function punctuationUnits(text: string, punctuation: RegExp): string[] {
    return text
        .match(punctuation)
        ?.map(unit => unit.trim())
        .filter(Boolean) ?? [text];
}

function splitOversizedUnit(text: string, maxLength: number): string[] {
    const clauses = punctuationUnits(text, /[^,،]+(?:[,،]+|$)/gu);
    if (clauses.length > 1) {
        return packUnits(clauses, maxLength);
    }

    const words = text.split(/\s+/).filter(Boolean);
    const chunks: string[] = [];
    let current = '';

    words.forEach(word => {
        const next = current ? `${current} ${word}` : word;
        if (current && next.length > maxLength) {
            chunks.push(current);
            current = word;
        } else {
            current = next;
        }
    });

    if (current) chunks.push(current);
    return chunks.length ? chunks : [text];
}

function packUnits(units: string[], maxLength: number): string[] {
    const chunks: string[] = [];
    let current = '';

    units.forEach(unit => {
        if (unit.length > maxLength) {
            if (current) {
                chunks.push(current);
                current = '';
            }
            chunks.push(...splitOversizedUnit(unit, maxLength));
            return;
        }

        const next = current ? `${current} ${unit}` : unit;
        if (current && next.length > maxLength) {
            chunks.push(current);
            current = unit;
        } else {
            current = next;
        }
    });

    if (current) chunks.push(current);
    return chunks.filter(Boolean);
}

function splitAtNaturalBreaks(text: string, maxLength: number): string[] {
    if (text.length <= maxLength) return [text];

    const sentences = punctuationUnits(text, /[^.!?؟؛;]+(?:[.!?؟؛;]+|$)/gu);
    return packUnits(sentences, maxLength);
}

function buildSharePages(hadith: Hadith): SharePage[] {
    const arabic = parseArabicHadith(hadith.arabic);
    const english = parseEnglishHadith(hadith.english);
    const combinedWeight = arabic.text.length + english.text.length;
    const fitsCombined =
        arabic.text.length <= MAX_COMBINED_ARABIC_LENGTH &&
        english.text.length <= MAX_COMBINED_ENGLISH_LENGTH &&
        combinedWeight <= MAX_COMBINED_WEIGHT;

    let pageDrafts: Omit<SharePage, 'pageNumber' | 'totalPages'>[] = fitsCombined
        ? [{
            id: 'combined-1',
            kind: 'combined',
            arabic: arabic.text,
            arabicAttribution: arabic.attribution,
            english: english.text,
            englishAttribution: english.attribution,
        }]
        : [
            ...splitAtNaturalBreaks(arabic.text, MAX_ARABIC_PAGE_LENGTH).map((text, index) => ({
                id: `arabic-${index + 1}`,
                kind: 'arabic' as const,
                arabic: text,
                arabicAttribution: arabic.attribution,
            })),
            ...splitAtNaturalBreaks(english.text, MAX_ENGLISH_PAGE_LENGTH).map((text, index) => ({
                id: `english-${index + 1}`,
                kind: 'english' as const,
                english: text,
                englishAttribution: english.attribution,
            })),
        ];

    if (pageDrafts.length > 4) {
        const arabicExcerpt = splitAtNaturalBreaks(arabic.text, MAX_COMBINED_ARABIC_LENGTH)[0];
        const englishExcerpt = splitAtNaturalBreaks(english.text, MAX_COMBINED_ENGLISH_LENGTH)[0];

        pageDrafts = [{
            id: 'combined-excerpt',
            kind: 'combined',
            isExcerpt: true,
            arabic: arabicExcerpt === arabic.text ? arabicExcerpt : `${arabicExcerpt} …`,
            arabicAttribution: arabic.attribution,
            english: englishExcerpt === english.text ? englishExcerpt : `${englishExcerpt} …`,
            englishAttribution: english.attribution,
        }];
    }

    return pageDrafts.map((page, index) => ({
        ...page,
        pageNumber: index + 1,
        totalPages: pageDrafts.length,
    }));
}

function arabicFontSize(page: SharePage): string {
    const length = page.arabic?.length ?? 0;
    if (page.kind === 'combined') {
        if (length <= 70) return '9.5cqw';
        if (length <= 105) return '7.5cqw';
        return '6.1cqw';
    }
    if (length <= 90) return '9.6cqw';
    if (length <= 170) return '7.4cqw';
    if (length <= 260) return '5.7cqw';
    if (length <= 340) return '4.7cqw';
    return '4cqw';
}

function englishFontSize(page: SharePage): string {
    const length = page.english?.length ?? 0;
    if (page.kind === 'combined') {
        if (page.isExcerpt) return '4.2cqw';
        return length <= 100 ? '4.65cqw' : '3.8cqw';
    }
    if (length <= 140) return '6.4cqw';
    if (length <= 240) return '5.1cqw';
    if (length <= 360) return '4.2cqw';
    if (length <= 520) return '3.65cqw';
    return '3.2cqw';
}

function ShareDivider({ theme }: { theme: ShareTheme }) {
    return (
        <div
            className="flex w-full items-center justify-center gap-[2.6cqw]"
            style={{ color: theme.accent }}
            aria-hidden="true"
        >
            <span className="h-px w-[19cqw]" style={{ backgroundColor: theme.accent }} />
            <Quote className="h-[4.5cqw] w-[4.5cqw] fill-current" strokeWidth={1.5} />
            <span className="h-px w-[19cqw]" style={{ backgroundColor: theme.accent }} />
        </div>
    );
}

function FittedShareContent({
    children,
    fitKey,
    spacingClass,
}: {
    children: ReactNode;
    fitKey: string;
    spacingClass: string;
}) {
    const frameRef = useRef<HTMLElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);

    useLayoutEffect(() => {
        const frame = frameRef.current;
        const content = contentRef.current;
        if (!frame || !content) return;

        let animationFrame = 0;
        let cancelled = false;

        const measure = () => {
            if (cancelled) return;

            const availableHeight = frame.clientHeight;
            const requiredHeight = content.scrollHeight;
            if (!availableHeight || !requiredHeight) return;

            const fitScale = Math.min(1, (availableHeight * 0.96) / requiredHeight);
            const nextScale = Math.max(0.68, fitScale);
            setScale(currentScale => (
                Math.abs(currentScale - nextScale) < 0.002 ? currentScale : nextScale
            ));
        };

        const scheduleMeasure = () => {
            cancelAnimationFrame(animationFrame);
            animationFrame = requestAnimationFrame(measure);
        };

        scheduleMeasure();
        void document.fonts.ready.then(scheduleMeasure);

        const resizeObserver = typeof ResizeObserver === 'undefined'
            ? null
            : new ResizeObserver(scheduleMeasure);
        resizeObserver?.observe(frame);
        resizeObserver?.observe(content);
        window.addEventListener('resize', scheduleMeasure);

        return () => {
            cancelled = true;
            cancelAnimationFrame(animationFrame);
            resizeObserver?.disconnect();
            window.removeEventListener('resize', scheduleMeasure);
        };
    }, [fitKey]);

    return (
        <main
            ref={frameRef}
            className="flex min-h-0 flex-1 items-center justify-center overflow-hidden"
        >
            <div
                ref={contentRef}
                data-share-content="true"
                data-fit-scale={scale.toFixed(3)}
                className={`flex w-full flex-col items-center ${spacingClass}`}
                style={{
                    transform: `scale(${scale})`,
                    transformOrigin: 'center center',
                }}
            >
                {children}
            </div>
        </main>
    );
}

function ShareCard({
    page,
    theme,
    volume,
    chapterTitle,
    hadithNumber,
    captureRef,
    testId,
}: ShareCardProps) {
    const title = displayTitle(chapterTitle);
    const isCombined = page.kind === 'combined';
    const sourceFontSize = title.length > 28 ? '1.9cqw' : '2.45cqw';

    return (
        <div
            ref={captureRef}
            data-testid={testId}
            data-theme={theme.id}
            className="relative aspect-square w-full overflow-hidden transition-colors duration-300"
            style={{
                containerType: 'inline-size',
                backgroundColor: theme.background,
                backgroundImage: "url('/hadith-card-paper-texture.png')",
                backgroundBlendMode: 'multiply',
                backgroundPosition: 'center',
                backgroundSize: 'cover',
                color: theme.primaryText,
            }}
        >
            {page.isExcerpt ? (
                <span
                    className="absolute right-[6.5cqw] top-[6cqw] font-sans text-[2.05cqw] font-bold uppercase tracking-[0.14em]"
                    style={{ color: theme.brand }}
                >
                    Excerpt
                </span>
            ) : page.totalPages > 1 && (
                <span
                    className="absolute right-[6.5cqw] top-[6cqw] font-sans text-[2.35cqw] font-semibold tracking-[0.08em]"
                    style={{ color: theme.brand }}
                >
                    {page.pageNumber}/{page.totalPages}
                </span>
            )}

            <div className="flex h-full flex-col px-[7.4cqw] pb-[5.5cqw] pt-[5.8cqw] text-center">
                <header className="flex shrink-0 flex-col items-center">
                    <BookOpen
                        className="h-[5.8cqw] w-[5.8cqw]"
                        strokeWidth={1.8}
                        style={{ color: theme.brand }}
                        aria-hidden="true"
                    />
                    <div
                        className="mt-[1.5cqw] font-serif text-[4.1cqw] font-semibold tracking-[-0.025em]"
                        style={{ color: theme.primaryText }}
                    >
                        Mizan al Hikmah
                    </div>
                </header>

                <FittedShareContent
                    fitKey={`${page.id}-${theme.id}-${page.arabic?.length ?? 0}-${page.english?.length ?? 0}`}
                    spacingClass={page.isExcerpt ? 'gap-[1.6cqw]' : isCombined ? 'gap-[3cqw]' : 'gap-[4.2cqw]'}
                >
                    {page.arabic && (
                        <div className="w-full">
                            <p
                                className="font-arabic"
                                dir="rtl"
                                style={{
                                    fontSize: arabicFontSize(page),
                                    lineHeight: page.kind === 'combined' ? 1.58 : 1.62,
                                    color: theme.primaryText,
                                }}
                            >
                                {page.arabic}
                            </p>
                            {page.arabicAttribution && (
                                <p
                                    className="mt-[2.3cqw] font-arabic"
                                    dir="rtl"
                                    style={{
                                        fontSize: page.isExcerpt ? '2.55cqw' : isCombined ? '3.7cqw' : '3.65cqw',
                                        lineHeight: 1.45,
                                        color: theme.secondaryText,
                                    }}
                                >
                                    {page.arabicAttribution}
                                </p>
                            )}
                        </div>
                    )}

                    {isCombined && <ShareDivider theme={theme} />}

                    {page.english && (
                        <div className="w-full">
                            <p
                                className="font-serif"
                                style={{
                                    fontSize: englishFontSize(page),
                                    lineHeight: 1.28,
                                    color: theme.primaryText,
                                }}
                            >
                                {page.english}
                            </p>
                            {page.englishAttribution && (
                                <p
                                    className="mt-[2.1cqw] font-sans font-medium"
                                    style={{
                                        fontSize: page.isExcerpt ? '2.35cqw' : isCombined ? '3cqw' : '3.15cqw',
                                        lineHeight: 1.35,
                                        color: theme.secondaryText,
                                    }}
                                >
                                    {page.englishAttribution}
                                </p>
                            )}
                        </div>
                    )}
                </FittedShareContent>

                <footer className="shrink-0">
                    <p
                        className="font-serif font-medium"
                        style={{ fontSize: sourceFontSize, color: theme.secondaryText }}
                    >
                        Volume {volume}
                        <span className="mx-[1.4cqw]" style={{ color: theme.accent }}>•</span>
                        {title}
                        <span className="mx-[1.4cqw]" style={{ color: theme.accent }}>•</span>
                        Hadith {hadithNumber}
                    </p>
                    <div
                        className="mx-auto my-[1.8cqw] h-px w-[22cqw]"
                        style={{ backgroundColor: theme.accent }}
                        aria-hidden="true"
                    />
                    <div
                        className="flex items-center justify-center gap-[1.2cqw] font-serif text-[2.45cqw]"
                        style={{ color: theme.brand }}
                    >
                        <Globe2 className="h-[2.55cqw] w-[2.55cqw]" strokeWidth={1.75} aria-hidden="true" />
                        <span>mizan-al-hikmah.web.app</span>
                    </div>
                </footer>
            </div>
        </div>
    );
}

async function dataUrlToFile(dataUrl: string, filename: string): Promise<File> {
    const blob = await (await fetch(dataUrl)).blob();
    return new File([blob], filename, { type: 'image/png' });
}

async function combineImagesVertically(dataUrls: string[]): Promise<string> {
    const images = await Promise.all(dataUrls.map(dataUrl => new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = dataUrl;
    })));

    const canvas = document.createElement('canvas');
    canvas.width = EXPORT_CARD_SIZE * EXPORT_PIXEL_RATIO;
    canvas.height = canvas.width * images.length;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Unable to create image canvas');

    images.forEach((image, index) => {
        context.drawImage(image, 0, index * canvas.width, canvas.width, canvas.width);
    });

    return canvas.toDataURL('image/png');
}

function triggerDownload(dataUrl: string, filename: string) {
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();
}

function waitForShareLayout(): Promise<void> {
    return new Promise(resolve => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
}

export function HadithShareModal({
    isOpen,
    onClose,
    hadith,
    volume,
    chapterNum,
    chapterTitle,
}: HadithShareModalProps) {
    const captureRefs = useRef<Array<HTMLDivElement | null>>([]);
    const [currentPageIndex, setCurrentPageIndex] = useState(0);
    const [currentThemeIndex, setCurrentThemeIndex] = useState(0);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);
    const pages = useMemo(() => buildSharePages(hadith), [hadith]);
    const currentPage = pages[Math.min(currentPageIndex, pages.length - 1)];
    const currentTheme = SHARE_THEMES[currentThemeIndex];
    const permalink = `${window.location.origin}/volume/${volume}/chapter/${chapterNum}#h-${hadith.hadith_num}`;

    const generatePageDataUrls = async () => {
        await document.fonts.ready;
        await waitForShareLayout();

        return Promise.all(pages.map(async (_, index) => {
            const element = captureRefs.current[index];
            if (!element) throw new Error(`Missing share card ${index + 1}`);

            return toPng(element, {
                cacheBust: true,
                pixelRatio: EXPORT_PIXEL_RATIO,
                width: EXPORT_CARD_SIZE,
                height: EXPORT_CARD_SIZE,
                backgroundColor: currentTheme.background,
                style: {
                    width: `${EXPORT_CARD_SIZE}px`,
                    height: `${EXPORT_CARD_SIZE}px`,
                },
            });
        }));
    };

    const downloadDataUrls = (dataUrls: string[]) => {
        dataUrls.forEach((dataUrl, index) => {
            const suffix = dataUrls.length > 1 ? `-${index + 1}-of-${dataUrls.length}` : '';
            triggerDownload(dataUrl, `mizan-hadith-${hadith.hadith_num}-${currentTheme.id}${suffix}.png`);
        });
    };

    const handleDownload = async () => {
        setIsGenerating(true);
        setNotice(null);
        try {
            const dataUrls = await generatePageDataUrls();
            downloadDataUrls(dataUrls);
            setNotice(dataUrls.length > 1 ? `${dataUrls.length} square images downloaded in order.` : 'Square image downloaded.');
        } catch (error) {
            console.error('Failed to generate share image', error);
            setNotice('The image could not be generated. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleShare = async () => {
        setIsSharing(true);
        setNotice(null);

        try {
            const dataUrls = await generatePageDataUrls();
            const files = await Promise.all(dataUrls.map((dataUrl, index) => {
                const suffix = dataUrls.length > 1 ? `-${index + 1}-of-${dataUrls.length}` : '';
                return dataUrlToFile(dataUrl, `mizan-hadith-${hadith.hadith_num}-${currentTheme.id}${suffix}.png`);
            }));
            const shareText = `Read Hadith ${hadith.hadith_num} in Mizan al Hikmah: ${permalink}`;

            if (navigator.share) {
                const canShareFiles = !navigator.canShare || navigator.canShare({ files });

                if (canShareFiles) {
                    await navigator.share({
                        title: `Hadith ${hadith.hadith_num} — Mizan al Hikmah`,
                        text: shareText,
                        url: permalink,
                        files,
                    });
                    return;
                }

                const combinedDataUrl = await combineImagesVertically(dataUrls);
                const combinedFile = await dataUrlToFile(
                    combinedDataUrl,
                    `mizan-hadith-${hadith.hadith_num}-${currentTheme.id}.png`,
                );

                if (!navigator.canShare || navigator.canShare({ files: [combinedFile] })) {
                    await navigator.share({
                        title: `Hadith ${hadith.hadith_num} — Mizan al Hikmah`,
                        text: shareText,
                        url: permalink,
                        files: [combinedFile],
                    });
                    return;
                }
            }

            downloadDataUrls(dataUrls);
            setNotice('Sharing is not available here, so the image files were downloaded instead.');
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            console.error('Failed to share hadith', error);
            setNotice('Sharing did not complete. You can download the images instead.');
        } finally {
            setIsSharing(false);
        }
    };

    const goToPreviousPage = () => {
        setCurrentPageIndex(index => Math.max(0, index - 1));
    };

    const goToNextPage = () => {
        setCurrentPageIndex(index => Math.min(pages.length - 1, index + 1));
    };

    const goToPreviousTheme = () => {
        setNotice(null);
        setCurrentThemeIndex(index => (index - 1 + SHARE_THEMES.length) % SHARE_THEMES.length);
    };

    const goToNextTheme = () => {
        setNotice(null);
        setCurrentThemeIndex(index => (index + 1) % SHARE_THEMES.length);
    };

    const selectTheme = (index: number) => {
        setNotice(null);
        setCurrentThemeIndex(index);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-5">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        data-testid="hadith-share-modal"
                        className="relative flex max-h-[94vh] w-full max-w-[760px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900"
                    >
                        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-3.5 dark:border-slate-800 sm:px-5">
                            <div>
                                <h3 className="font-serif text-lg font-bold text-slate-950 dark:text-white">Share Hadith</h3>
                                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                    {pages[0]?.isExcerpt
                                        ? 'A concise excerpt image; the full hadith link is included when shared.'
                                        : pages.length === 1
                                        ? 'A square image, ready for messages and social apps.'
                                        : `${pages.length} readable square images, arranged in sharing order.`}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                aria-label="Close share dialog"
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:hover:bg-slate-800 dark:hover:text-white"
                            >
                                <X size={20} />
                            </button>
                        </header>

                        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-100 px-3 py-4 dark:bg-slate-950 sm:px-8 sm:py-6">
                            <div className="mx-auto w-full max-w-[540px] overflow-hidden rounded-md shadow-xl shadow-slate-900/10">
                                <ShareCard
                                    page={currentPage}
                                    theme={currentTheme}
                                    volume={volume}
                                    chapterTitle={chapterTitle}
                                    hadithNumber={hadith.hadith_num}
                                    testId="share-preview-card"
                                />
                            </div>

                            <div
                                className="mx-auto mt-4 flex max-w-[540px] items-center gap-2 rounded-xl bg-white p-2.5 shadow-sm dark:bg-slate-900"
                                aria-label="Card colour selector"
                            >
                                <button
                                    type="button"
                                    onClick={goToPreviousTheme}
                                    disabled={isGenerating || isSharing}
                                    aria-label="Previous card colour"
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800"
                                >
                                    <ChevronLeft size={20} />
                                </button>

                                <div className="min-w-0 flex-1 text-center">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                                        Card colour
                                    </p>
                                    <p
                                        className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100"
                                        aria-live="polite"
                                    >
                                        {currentTheme.name}
                                    </p>
                                    <div
                                        role="radiogroup"
                                        aria-label="Choose a card colour"
                                        className="mt-1.5 flex items-center justify-center gap-2"
                                    >
                                        {SHARE_THEMES.map((theme, index) => (
                                            <button
                                                key={theme.id}
                                                type="button"
                                                role="radio"
                                                aria-checked={index === currentThemeIndex}
                                                aria-label={theme.name}
                                                onClick={() => selectTheme(index)}
                                                disabled={isGenerating || isSharing}
                                                className={`h-5 w-5 rounded-full border transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-40 ${
                                                    index === currentThemeIndex
                                                        ? 'scale-110 border-white ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-slate-900'
                                                        : 'border-slate-300 dark:border-slate-600'
                                                }`}
                                                style={{ backgroundColor: theme.background }}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={goToNextTheme}
                                    disabled={isGenerating || isSharing}
                                    aria-label="Next card colour"
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800"
                                >
                                    <ChevronRight size={20} />
                                </button>
                            </div>

                            {pages.length > 1 && (
                                <div className="mx-auto mt-4 flex max-w-[540px] items-center justify-between">
                                    <button
                                        type="button"
                                        onClick={goToPreviousPage}
                                        disabled={currentPageIndex === 0}
                                        aria-label="Preview previous image"
                                        className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm transition hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-35 dark:bg-slate-900 dark:text-slate-200"
                                    >
                                        <ChevronLeft size={20} />
                                    </button>
                                    <div className="text-center">
                                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                                            Image {currentPageIndex + 1} of {pages.length}
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            {currentPage.kind === 'arabic' ? 'Arabic' : currentPage.kind === 'english' ? 'English' : 'Arabic and English'}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={goToNextPage}
                                        disabled={currentPageIndex === pages.length - 1}
                                        aria-label="Preview next image"
                                        className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm transition hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-35 dark:bg-slate-900 dark:text-slate-200"
                                    >
                                        <ChevronRight size={20} />
                                    </button>
                                </div>
                            )}

                            {notice && (
                                <p className="mx-auto mt-4 max-w-[540px] rounded-lg bg-primary-50 px-3 py-2 text-center text-sm text-primary-800 dark:bg-primary-900/30 dark:text-primary-200">
                                    {notice}
                                </p>
                            )}
                        </div>

                        <footer className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:justify-end sm:p-4">
                            <button
                                type="button"
                                onClick={handleDownload}
                                disabled={isGenerating || isSharing}
                                className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                            >
                                {isGenerating ? <Loader2 size={17} className="animate-spin" /> : <Download size={17} />}
                                Download {pages.length > 1 ? `${pages.length} images` : 'image'}
                            </button>
                            <button
                                type="button"
                                onClick={handleShare}
                                disabled={isSharing || isGenerating}
                                className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50"
                            >
                                {isSharing ? <Loader2 size={17} className="animate-spin" /> : <Share2 size={17} />}
                                Share {pages.length > 1 ? `${pages.length} images` : 'image'}
                            </button>
                        </footer>

                        <div
                            className="pointer-events-none fixed left-[-10000px] top-0"
                            aria-hidden="true"
                        >
                            {pages.map((page, index) => (
                                <div
                                    key={`${page.id}-${currentTheme.id}`}
                                    style={{ width: EXPORT_CARD_SIZE, height: EXPORT_CARD_SIZE }}
                                >
                                    <ShareCard
                                        page={page}
                                        theme={currentTheme}
                                        volume={volume}
                                        chapterTitle={chapterTitle}
                                        hadithNumber={hadith.hadith_num}
                                        captureRef={element => {
                                            captureRefs.current[index] = element;
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
