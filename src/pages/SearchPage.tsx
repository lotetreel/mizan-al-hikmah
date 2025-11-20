import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { searchHadiths } from '../lib/data';
import type { SearchResult } from '../lib/types';
import { HadithCard } from '../components/HadithCard';
import { Loader2 } from 'lucide-react';

export function SearchPage() {
    const [searchParams] = useSearchParams();
    const query = searchParams.get('q') || '';
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (query) {
            setLoading(true);
            searchHadiths(query)
                .then(setResults)
                .finally(() => setLoading(false));
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
                <div className="space-y-6 max-w-3xl mx-auto">
                    {results.length === 0 ? (
                        <p className="text-center text-slate-500 py-12">No results found.</p>
                    ) : (
                        results.map((result, index) => (
                            <HadithCard
                                key={`${result.volume}-${result.chapter.chapter_num}-${result.hadith.hadith_num}-${index}`}
                                hadith={result.hadith}
                                showChapterInfo
                                chapterTitle={result.chapter.chapter_title_en}
                                sectionTitle={result.section.section_title_en}
                            />
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
