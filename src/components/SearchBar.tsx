import { Search } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchHeadings } from '../lib/data';
import type { HeadingResult } from '../lib/types';

export function SearchBar() {
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<HeadingResult[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const wrapperRef = useRef<HTMLFormElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const timer = setTimeout(() => {
            if (query.length >= 2) {
                searchHeadings(query).then(setSuggestions);
            } else {
                setSuggestions([]);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setShowSuggestions(false);
        if (query.trim()) {
            navigate(`/search?q=${encodeURIComponent(query)}`);
        }
    };

    const handleSuggestionClick = (result: HeadingResult) => {
        setShowSuggestions(false);
        setQuery('');

        let url = `/volume/${result.volume}/chapter/${result.chapterId}`;

        if (result.type === 'section' && result.sectionId) {
            url += `#section-${result.sectionId}`;
        }
        navigate(url);
    };

    return (
        <form onSubmit={handleSubmit} className="relative w-full max-w-md" ref={wrapperRef}>
            <div className="relative">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder="Search hadiths..."
                    className="w-full py-2 pl-10 pr-4 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-slate-100 placeholder-slate-400 transition-all shadow-sm"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50">
                    <ul className="max-h-96 overflow-y-auto">
                        {suggestions.map((result, index) => (
                            <li key={index}>
                                <button
                                    type="button"
                                    onClick={() => handleSuggestionClick(result)}
                                    className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-b border-slate-100 dark:border-slate-700/50 last:border-0"
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">
                                                {result.title}
                                            </p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                {result.type === 'chapter' ? 'Chapter' : 'Section'} • Vol {result.volume}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-arabic text-sm text-slate-800 dark:text-slate-200" dir="rtl">
                                                {result.arabicTitle}
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </form>
    );
}
