import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { loadVolume } from '../lib/data';
import type { Chapter } from '../lib/types';
import { HadithFeed } from '../components/HadithFeed';
import { ArrowLeft, Loader2 } from 'lucide-react';

export function ChapterPage() {
    const { volumeNum, chapterNum } = useParams();
    const [chapter, setChapter] = useState<Chapter | null>(null);
    const [loading, setLoading] = useState(true);

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

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-4 sticky top-16 z-40 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur py-4 border-b border-slate-200 dark:border-slate-800">
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

            <div className="space-y-12">
                {chapter.sections.map((section) => (
                    <div key={section.section_num} className="space-y-6">
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
