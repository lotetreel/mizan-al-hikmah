import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { searchHeadings, searchHadiths } from '../lib/data';
import type { SearchResult, HeadingResult } from '../lib/types';
import { HadithCard } from '../components/HadithCard';
import { Loader2, Book, Bookmark } from 'lucide-react';
import { Link } from 'react-router-dom';

export function SearchPage() {
    const [searchParams] = useSearchParams();
    const query = searchParams.get('q') || '';
    const [hadithResults, setHadithResults] = useState<SearchResult[]>([]);
    const [headingResults, setHeadingResults] = useState<HeadingResult[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (query) {
            setLoading(true);
            Promise.all([
                searchHeadings(query),
                searchHadiths(query)
            ])
                .then(([headings, hadiths]) => {
                    setHeadingResults(headings);
                    setHadithResults(hadiths);
                })
                .finally(() => setLoading(false));
        } else {
            setHeadingResults([]);
            setHadithResults([]);
        }
    }, [query]);

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-serif font-bold text-slate-900 dark:text-white">
                Search Results for "{query}"
            </h1>

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="animate-spin text-primary-500" size={40} />
                </div>
            ) : (
                <div className="space-y-8 max-w-3xl mx-auto">
                    {/* Headings Section */}
                    {headingResults.length > 0 && (
                        <div className="space-y-4">
                            <h2 className="text-xl font-serif font-semibold text-slate-800 dark:text-slate-200">
                                Matching Chapters & Sections
                            </h2>
                            <div className="grid gap-3 sm:grid-cols-2">
                                {headingResults.map((result, index) => (
                                    <Link
                                        key={index}
                                        to={`/volume/${result.volume}/chapter/${result.chapterId}${result.sectionId ? `#section-${result.sectionId}` : ''}`}
                                        className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-primary-500 dark:hover:border-primary-500 transition-colors flex items-start gap-3 group"
                                    >
                                        <div className="mt-1 text-slate-400 group-hover:text-primary-500 transition-colors">
                                            {result.type === 'chapter' ? <Book size={20} /> : <Bookmark size={20} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-slate-900 dark:text-white truncate">
                                                {result.title}
                                            </p>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                                                {result.type === 'chapter' ? 'Chapter' : 'Section'} • Vol {result.volume}
                                            </p>
                                            <p className="text-sm font-arabic text-slate-600 dark:text-slate-300 mt-1 truncate text-right w-full" dir="rtl">
                                                {result.arabicTitle}
                                            </p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Hadiths Section */}
                    {hadithResults.length > 0 && (
                        <div className="space-y-4">
                            <h2 className="text-xl font-serif font-semibold text-slate-800 dark:text-slate-200">
                                Matching Hadiths
                            </h2>
                            <div className="space-y-6">
                                {hadithResults.map((result, index) => (
                                    <HadithCard
                                        key={`${result.volume}-${result.chapter.chapter_num}-${result.hadith.hadith_num}-${index}`}
                                        hadith={result.hadith}
                                        showChapterInfo
                                        chapterTitle={result.chapter.chapter_title_en}
                                        sectionTitle={result.section.section_title_en}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {headingResults.length === 0 && hadithResults.length === 0 && (
                        <p className="text-center text-slate-500 py-12">No results found.</p>
                    )}
                </div>
            )}
        </div>
    );
}
