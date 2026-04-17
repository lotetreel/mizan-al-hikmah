import { Link, Outlet, NavLink } from 'react-router-dom';
import { ThemeToggle } from './ThemeToggle';
import { SearchBar } from './SearchBar';
import { FontSettingsPanel } from './FontSettingsPanel';
import { BookOpen, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import { useFavorites } from '../contexts/FavoritesContext';
import { cn } from '../lib/utils';

export function Layout() {
    const { favorites } = useFavorites();

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
            <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
                    <Link to="/" className="flex items-center gap-2 font-serif text-xl font-bold text-slate-900 dark:text-white hover:opacity-80 transition-opacity">
                        <motion.div
                            initial={{ rotate: -10 }}
                            animate={{ rotate: 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            <BookOpen className="text-primary-600 dark:text-primary-400" />
                        </motion.div>
                        <span className="hidden sm:inline">Mizan al Hikmah</span>
                    </Link>

                    <div className="flex-1 flex justify-center max-w-md">
                        <SearchBar />
                    </div>

                    <div className="flex items-center gap-2">
                        <NavLink
                            to="/favorites"
                            title="Favorites"
                            aria-label="Favorites"
                            className={({ isActive }) =>
                                cn(
                                    "relative p-2 rounded-full transition-colors",
                                    isActive
                                        ? "text-rose-500 bg-rose-50 dark:bg-rose-900/20"
                                        : "text-slate-500 dark:text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                                )
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    <Heart size={20} fill={isActive ? 'currentColor' : 'none'} />
                                    {favorites.length > 0 && (
                                        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-semibold flex items-center justify-center">
                                            {favorites.length > 99 ? '99+' : favorites.length}
                                        </span>
                                    )}
                                </>
                            )}
                        </NavLink>
                        <FontSettingsPanel />
                        <ThemeToggle />
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8">
                <Outlet />
            </main>

            <footer className="border-t border-slate-200 dark:border-slate-800 py-8 mt-auto">
                <div className="container mx-auto px-4 text-center text-slate-500 dark:text-slate-400 text-sm">
                    <p>Mizan al Hikmah - The Scale of Wisdom</p>
                </div>
            </footer>
        </div>
    );
}
