import { Search } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export function SearchBar() {
    const [searchParams] = useSearchParams();
    const [query, setQuery] = useState(searchParams.get('q') || '');
    const navigate = useNavigate();
    // Auto-navigation should only fire when the user types — not when we sync
    // from the URL (back button, route change clearing ?q, etc). Otherwise the
    // stale query re-navigates the user back to /search after every click.
    const isUserInputRef = useRef(false);

    // Sync local state with URL param when it changes externally.
    useEffect(() => {
        const urlQuery = searchParams.get('q') ?? '';
        if (urlQuery !== query) {
            isUserInputRef.current = false;
            setQuery(urlQuery);
        }
    }, [searchParams]);

    useEffect(() => {
        if (!isUserInputRef.current) return;
        const timer = setTimeout(() => {
            if (query.trim()) {
                navigate(`/search?q=${encodeURIComponent(query)}`, { replace: true });
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query, navigate]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
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
                    onChange={(e) => {
                        isUserInputRef.current = true;
                        setQuery(e.target.value);
                    }}
                    placeholder="Search hadiths..."
                    className="w-full py-2 pl-10 pr-4 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-slate-100 placeholder-slate-400 transition-all shadow-sm"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            </div>
        </form>
    );
}
