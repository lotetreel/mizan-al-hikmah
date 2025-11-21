import { Link, Outlet } from 'react-router-dom';
import { ThemeToggle } from './ThemeToggle';
import { SearchBar } from './SearchBar';
import { FontSettingsPanel } from './FontSettingsPanel';
import { BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';

export function Layout() {
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
