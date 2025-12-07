import { Search } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export function SearchBar() {
    const [searchParams] = useSearchParams();
    const [query, setQuery] = useState(searchParams.get('q') || '');
    const navigate = useNavigate();

    // Sync local state with URL param if it changes externally (e.g. back button)
    useEffect(() => {
        const urlQuery = searchParams.get('q');
        if (urlQuery !== null && urlQuery !== query) {
            setQuery(urlQuery);
        }
    }, [searchParams]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (query.trim()) {
                // Navigate to search page with replace: true to avoid history stack pollution
                // Only navigate if we are not already on the search page with this query?
                // Actually, duplicate navigation is handled by router usually, but let's be safe.
                // But specifically we want to trigger 'replace' if we are just typing.

                // We simplify: just navigate.
                navigate(`/search?q=${encodeURIComponent(query)}`, { replace: true });
            } else if (query === '') {
                // If query is cleared, maybe go back or stay?
                // For now, let's do nothing or maybe allow clearing search if on search page.
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query, navigate]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Force navigation even if debounce hasn't fired
        if (query.trim()) {
            navigate(`/search?q=${encodeURIComponent(query)}`);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="relative w-full max-w-md">
            <div className="relative">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search hadiths..."
                    className="w-full py-2 pl-10 pr-4 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-slate-100 placeholder-slate-400 transition-all shadow-sm"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            </div>
        </form>
    );
}
