import { Link } from 'react-router-dom';
import { ArrowLeft, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import { useFavorites } from '../contexts/FavoritesContext';
import { HadithCard } from '../components/HadithCard';

export function Favorites() {
    const { favorites } = useFavorites();

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-4">
                <Link
                    to="/"
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                    aria-label="Back to home"
                >
                    <ArrowLeft size={24} />
                </Link>
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <Heart className="text-rose-500" fill="currentColor" size={22} />
                        <h1 className="text-3xl font-serif font-bold text-slate-900 dark:text-white">
                            Favorites
                        </h1>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        {favorites.length === 0
                            ? 'Hadiths you favorite will appear here.'
                            : `${favorites.length} hadith${favorites.length === 1 ? '' : 's'} saved.`}
                    </p>
                </div>
            </div>

            {favorites.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-md mx-auto text-center bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-10"
                >
                    <div className="mx-auto w-14 h-14 rounded-full bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center mb-4">
                        <Heart className="text-rose-500" size={26} />
                    </div>
                    <h2 className="text-lg font-serif font-semibold text-slate-800 dark:text-slate-200">
                        No favorites yet
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                        Tap the heart on any hadith — or double-tap the card — to save it here.
                    </p>
                </motion.div>
            ) : (
                <div className="space-y-6 max-w-3xl mx-auto">
                    {favorites.map((fav) => (
                        <div key={`${fav.volume}-${fav.hadith.hadith_num}`} className="space-y-2">
                            <Link
                                to={`/volume/${fav.volume}/chapter/${fav.chapterNum}#h-${fav.hadith.hadith_num}`}
                                className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                            >
                                <span className="font-mono">Vol {fav.volume}</span>
                                <span className="opacity-40">/</span>
                                <span className="font-serif uppercase tracking-wider">{fav.chapterTitleEn}</span>
                                <span className="opacity-40">/</span>
                                <span className="font-medium text-primary-600 dark:text-primary-400">{fav.sectionTitleEn}</span>
                            </Link>
                            <HadithCard
                                hadith={fav.hadith}
                                volume={fav.volume}
                                chapterNum={fav.chapterNum}
                                chapterTitleEn={fav.chapterTitleEn}
                                chapterTitleAr={fav.chapterTitleAr}
                                sectionNum={fav.sectionNum}
                                sectionTitleEn={fav.sectionTitleEn}
                                sectionTitleAr={fav.sectionTitleAr}
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
