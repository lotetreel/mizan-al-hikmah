import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Book, Bookmark, Loader2, Search } from 'lucide-react';
import { searchCollection } from '../lib/data';
import { MIN_SEARCH_LENGTH } from '../lib/search';
import type { SearchResultsBundle } from '../lib/types';
import { HadithCard } from '../components/HadithCard';
import { HighlightedText } from '../components/HighlightedText';
import { cn } from '../lib/utils';

type ResultFilter = 'all' | 'hadiths' | 'headings';

const EMPTY_RESULTS: SearchResultsBundle = {
    headingResults: [],
    hadithResults: [],
    totalHeadingMatches: 0,
    totalHadithMatches: 0,
};

const FILTERS: Array<{ id: ResultFilter; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'hadiths', label: 'Hadiths' },
    { id: 'headings', label: 'Chapters & sections' },
];

const FIELD_LABELS = {
    arabic: 'Arabic',
    english: 'English',
    chapter: 'Chapter',
    section: 'Section',
} as const;

const validFilter = (value: string | null): ResultFilter =>
    value === 'hadiths' || value === 'headings' ? value : 'all';

export function SearchPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const query = searchParams.get('q') || '';
    const activeFilter = validFilter(searchParams.get('type'));
    const trimmedQuery = query.trim();
    const queryIsSearchable = trimmedQuery.length >= MIN_SEARCH_LENGTH;
    const [resultsState, setResultsState] = useState({
        query: '',
        error: '',
        results: EMPTY_RESULTS,
    });

    useEffect(() => {
        let active = true;

        async function runSearch() {
            if (!queryIsSearchable) return;

            const nextState = await searchCollection(trimmedQuery)
                .then(results => ({
                    query: trimmedQuery,
                    error: '',
                    results,
                }))
                .catch(error => {
                    console.error('Search failed', error);
                    return {
                        query: trimmedQuery,
                        error: 'Search failed. Please try again.',
                        results: EMPTY_RESULTS,
                    };
                });

            if (active) setResultsState(nextState);
        }

        void runSearch();

        return () => {
            active = false;
        };
    }, [queryIsSearchable, trimmedQuery]);

    const currentResults = queryIsSearchable && resultsState.query === trimmedQuery
        ? resultsState.results
        : EMPTY_RESULTS;
    const currentError = resultsState.query === trimmedQuery ? resultsState.error : '';
    const visibleHeadingResults = activeFilter === 'hadiths' ? [] : currentResults.headingResults;
    const visibleHadithResults = activeFilter === 'headings' ? [] : currentResults.hadithResults;
    const hasResults = visibleHeadingResults.length > 0 || visibleHadithResults.length > 0;
    const totalMatches = currentResults.totalHeadingMatches + currentResults.totalHadithMatches;
    const showingMatches = currentResults.headingResults.length + currentResults.hadithResults.length;
    const isLoading = queryIsSearchable && resultsState.query !== trimmedQuery;

    const resultSummary = useMemo(() => {
        if (!queryIsSearchable || isLoading || currentError) return '';
        const headingLabel = currentResults.totalHeadingMatches === 1 ? 'chapter or section' : 'chapters or sections';
        const hadithLabel = currentResults.totalHadithMatches === 1 ? 'hadith' : 'hadiths';
        return `${currentResults.totalHeadingMatches} ${headingLabel} and ${currentResults.totalHadithMatches} ${hadithLabel}`;
    }, [
        currentError,
        currentResults.totalHadithMatches,
        currentResults.totalHeadingMatches,
        isLoading,
        queryIsSearchable,
    ]);

    const setFilter = (filter: ResultFilter) => {
        const nextParams = new URLSearchParams(searchParams);
        if (filter === 'all') {
            nextParams.delete('type');
        } else {
            nextParams.set('type', filter);
        }
        setSearchParams(nextParams, { replace: true });
    };

    const filterCount = (filter: ResultFilter) => {
        if (filter === 'hadiths') return currentResults.totalHadithMatches;
        if (filter === 'headings') return currentResults.totalHeadingMatches;
        return totalMatches;
    };

    const renderIntroState = () => {
        if (!trimmedQuery) {
            return (
                <div className="max-w-xl mx-auto text-center py-16">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-300">
                        <Search size={24} />
                    </div>
                    <h2 className="text-xl font-serif font-semibold text-slate-900 dark:text-white">
                        Search the collection
                    </h2>
                    <p className="mt-2 text-slate-500 dark:text-slate-400">
                        Search Arabic, English, chapter titles, and section titles.
                    </p>
                </div>
            );
        }

        if (!queryIsSearchable) {
            return (
                <p className="text-center text-slate-500 py-12">
                    Enter at least {MIN_SEARCH_LENGTH} characters to search.
                </p>
            );
        }

        return null;
    };

    return (
        <div className="space-y-8">
            <div className="space-y-3">
                <h1 className="text-3xl font-serif font-bold text-slate-900 dark:text-white">
                    Search Results
                </h1>
                {trimmedQuery && (
                    <div className="space-y-1">
                        <p className="text-slate-600 dark:text-slate-300">
                            Results for <span className="font-semibold text-slate-900 dark:text-white">"{trimmedQuery}"</span>
                        </p>
                        {resultSummary && (
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Found {resultSummary}.
                            </p>
                        )}
                        {showingMatches < totalMatches && (
                            <p className="text-sm text-amber-600 dark:text-amber-300">
                                Showing the top {showingMatches} ranked matches.
                            </p>
                        )}
                    </div>
                )}
            </div>

            {queryIsSearchable && (
                <div className="flex flex-wrap gap-2">
                    {FILTERS.map(filter => (
                        <button
                            key={filter.id}
                            onClick={() => setFilter(filter.id)}
                            className={cn(
                                "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                                activeFilter === filter.id
                                    ? "bg-primary-600 text-white"
                                    : "bg-white text-slate-600 hover:bg-primary-50 hover:text-primary-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-primary-900/20 dark:hover:text-primary-300"
                            )}
                        >
                            {filter.label}
                            <span className="ml-2 font-mono text-xs opacity-70">{filterCount(filter.id)}</span>
                        </button>
                    ))}
                </div>
            )}

            {isLoading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="animate-spin text-primary-500" size={40} />
                </div>
            ) : currentError ? (
                <p className="text-center text-rose-500 py-12">{currentError}</p>
            ) : (
                <div className="space-y-8 max-w-3xl mx-auto">
                    {renderIntroState()}

                    {visibleHeadingResults.length > 0 && (
                        <div className="space-y-4">
                            <h2 className="text-xl font-serif font-semibold text-slate-800 dark:text-slate-200">
                                Matching Chapters & Sections
                            </h2>
                            <div className="grid gap-3 sm:grid-cols-2">
                                {visibleHeadingResults.map((result, index) => (
                                    <Link
                                        key={`${result.volume}-${result.chapterId}-${result.sectionId ?? 0}-${index}`}
                                        to={`/volume/${result.volume}/chapter/${result.chapterId}${result.sectionId ? `#section-${result.sectionId}` : ''}`}
                                        className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-primary-500 dark:hover:border-primary-500 transition-colors flex items-start gap-3 group"
                                    >
                                        <div className="mt-1 text-slate-400 group-hover:text-primary-500 transition-colors">
                                            {result.type === 'chapter' ? <Book size={20} /> : <Bookmark size={20} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-slate-900 dark:text-white truncate">
                                                <HighlightedText text={result.title} query={trimmedQuery} />
                                            </p>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                                                {result.type === 'chapter' ? 'Chapter' : 'Section'} / Vol {result.volume}
                                            </p>
                                            <p className="text-sm font-arabic text-slate-600 dark:text-slate-300 mt-1 truncate text-right w-full" dir="rtl">
                                                <HighlightedText text={result.arabicTitle} query={trimmedQuery} />
                                            </p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {visibleHadithResults.length > 0 && (
                        <div className="space-y-4">
                            <h2 className="text-xl font-serif font-semibold text-slate-800 dark:text-slate-200">
                                Matching Hadiths
                            </h2>
                            <div className="space-y-6">
                                {visibleHadithResults.map((result, index) => (
                                    <div key={`${result.volume}-${result.chapter.chapter_num}-${result.hadith.hadith_num}-${index}`} className="space-y-2">
                                        <div className="flex flex-wrap gap-1.5">
                                            {result.matchedFields.map(field => (
                                                <span
                                                    key={field}
                                                    className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                                                >
                                                    {FIELD_LABELS[field]}
                                                </span>
                                            ))}
                                        </div>
                                        <HadithCard
                                            hadith={result.hadith}
                                            volume={result.volume}
                                            chapterNum={result.chapter.chapter_num}
                                            chapterTitleEn={result.chapter.chapter_title_en}
                                            chapterTitleAr={result.chapter.chapter_title_ar}
                                            sectionNum={result.section.section_num}
                                            sectionTitleEn={result.section.section_title_en}
                                            sectionTitleAr={result.section.section_title_ar}
                                            showChapterInfo
                                            highlightQuery={trimmedQuery}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {queryIsSearchable && !hasResults && (
                        <p className="text-center text-slate-500 py-12">No results found.</p>
                    )}
                </div>
            )}
        </div>
    );
}
