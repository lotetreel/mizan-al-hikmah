import { VolumeSelector } from '../components/VolumeSelector';
import { RandomHadithSpotlight } from '../components/RandomHadithSpotlight';
import { motion } from 'framer-motion';
import { BookCopy, ChevronDown } from 'lucide-react';

export function Home() {
    const browseVolumes = () => {
        const volumeSelector = document.getElementById('volume-selector');
        if (!volumeSelector) return;

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        volumeSelector.scrollIntoView({
            behavior: prefersReducedMotion ? 'auto' : 'smooth',
            block: 'start',
        });
        volumeSelector.focus({ preventScroll: true });
    };

    return (
        <div className="pt-12">
            <div className="text-center space-y-4">
                <motion.h1
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-4xl md:text-6xl font-serif font-bold text-slate-900 dark:text-white"
                >
                    Mizan al Hikmah
                </motion.h1>
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto"
                >
                    The Scale of Wisdom. A comprehensive collection of Shi'a hadith.
                </motion.p>
            </div>

            <motion.button
                type="button"
                onClick={browseVolumes}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
                className="group mx-auto mt-1 flex min-h-11 items-center gap-2 px-3 text-sm font-medium text-slate-500 transition-colors hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 dark:text-slate-400 dark:hover:text-primary-400 dark:focus-visible:ring-offset-slate-950"
            >
                <BookCopy size={16} aria-hidden="true" />
                <span>Browse all volumes</span>
                <ChevronDown
                    size={15}
                    aria-hidden="true"
                    className="text-primary-500 transition-transform group-hover:translate-y-0.5 dark:text-primary-400"
                />
            </motion.button>

            <div className="mt-1">
                <RandomHadithSpotlight />
            </div>

            <div
                id="volume-selector"
                tabIndex={-1}
                className="mt-8 scroll-mt-24 focus:outline-none"
                aria-label="All volumes"
            >
                <VolumeSelector />
            </div>
        </div>
    );
}
