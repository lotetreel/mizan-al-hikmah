import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { loadVolume } from '../lib/data';
import type { Chapter } from '../lib/types';
import { HadithFeed } from '../components/HadithFeed';
import { ArrowLeft, Loader2 } from 'lucide-react';

export function ChapterPage() {
    const { volumeNum, chapterNum } = useParams();
    const [chapter, setChapter] = useState<Chapter | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeSectionNum, setActiveSectionNum] = useState<number | null>(null);
    const navStripRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (volumeNum && chapterNum) {
            setLoading(true);
            loadVolume(parseInt(volumeNum))
                .then(data => {
                    const found = data.find(c => c.chapter_num === parseInt(chapterNum));
                    setChapter(found || null);
                })
                .finally(() => setLoading(false));
        }
    }, [volumeNum, chapterNum]);

    // Track which section is in view
    useEffect(() => {
        if (!chapter || chapter.sections.length <= 1) return;

        const observer = new IntersectionObserver(
            entries => {
                const visible = entries.filter(e => e.isIntersecting);
                if (visible.length > 0) {
                    const topmost = visible.reduce((a, b) =>
                        a.boundingClientRect.top < b.boundingClientRect.top ? a : b
                    );
                    setActiveSectionNum(
                        parseInt(topmost.target.id.replace('section-', ''))
                    );
                }
            },
            { rootMargin: '-10% 0px -60% 0px', threshold: 0 }
        );

        chapter.sections.forEach(s => {
            const el = document.getElementById(`section-${s.section_num}`);
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    }, [chapter]);

    // Keep active pill centred in the strip
    useEffect(() => {
        if (!activeSectionNum || !navStripRef.current) return;
        navStripRef.current
            .querySelector(`[data-section="${activeSectionNum}"]`)
            ?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }, [activeSectionNum]);

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[50vh]">
                <Loader2 className="animate-spin text-primary-500" size={40} />
            </div>
        );
    }

    if (!chapter) {
        return <div className="text-center py-12">Chapter not found.</div>;
    }

    const hasMultipleSections = chapter.sections.length > 1;

    return (
        <div className="space-y-8">
            {/* Sticky header + section pill strip */}
            <div className="sticky top-16 z-40">
                {/* Chapter title row */}
                <div className="flex items-center gap-4 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur py-4 border-b border-slate-200 dark:border-slate-800">
                    <Link to={`/volume/${volumeNum}`} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                        <ArrowLeft size={24} />
                    </Link>
                    <div className="flex-1">
                        <div className="flex items-baseline gap-3">
                            <span className="text-sm font-mono text-slate-400">#{chapter.chapter_num}</span>
                            <h1 className="text-2xl font-serif font-bold text-slate-900 dark:text-white">
                                {chapter.chapter_title_en}
                            </h1>
                        </div>
                        <p className="font-arabic text-xl text-slate-600 dark:text-slate-400 text-right" dir="rtl">
                            {chapter.chapter_title_ar}
                        </p>
                    </div>
                </div>

                {/* Section pill strip */}
                {hasMultipleSections && (
                    <div
                        ref={navStripRef}
                        className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-3 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur border-b border-slate-200 dark:border-slate-800"
                    >
                        {chapter.sections.map((s, i) => (
                            <button
                                key={s.section_num}
                                data-section={s.section_num}
                                onClick={() =>
                                    document.getElementById(`section-${s.section_num}`)
                                        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                                }
                                className={`shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                                    activeSectionNum === s.section_num
                                        ? 'bg-primary-500 text-white shadow-sm'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600 dark:hover:text-primary-400'
                                }`}
                            >
                                <span className="font-mono text-[10px] opacity-60">{i + 1}</span>
                                <span>{s.section_title_en}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="space-y-12">
                {chapter.sections.map((section) => (
                    <div key={section.section_num} id={`section-${section.section_num}`} className={`space-y-6 ${hasMultipleSections ? 'scroll-mt-44' : 'scroll-mt-24'}`}>
                        <div className="bg-slate-100 dark:bg-slate-900 p-4 rounded-lg border-l-4 border-primary-500">
                            <h2 className="text-lg font-serif font-semibold text-slate-800 dark:text-slate-200 mb-1">
                                {section.section_title_en}
                            </h2>
                            <p className="font-arabic text-lg text-slate-600 dark:text-slate-400 text-right" dir="rtl">
                                {section.section_title_ar}
                            </p>
                        </div>

                        <HadithFeed hadiths={section.hadiths} />
                    </div>
                ))}
            </div>
        </div>
    );
}
