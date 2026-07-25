import { VolumeSelector } from '../components/VolumeSelector';
import { RandomHadithSpotlight } from '../components/RandomHadithSpotlight';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const volumes = [1, 2, 3, 4];

export function Home() {
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

            <motion.nav
                aria-label="Browse volumes"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
                className="mx-auto mt-1 flex min-h-11 w-fit items-center gap-4 px-3 text-slate-500 dark:text-slate-400"
            >
                <span className="text-[0.68rem] font-semibold uppercase tracking-[0.24em]">
                    Volumes
                </span>
                <div className="flex items-center gap-2 border-b border-primary-400/80 pb-1">
                    {volumes.map((volume) => (
                        <Link
                            key={volume}
                            to={`/volume/${volume}`}
                            aria-label={`Read Volume ${volume}`}
                            className="inline-flex min-h-10 min-w-8 items-center justify-center font-serif text-lg tabular-nums transition-colors hover:text-primary-600 focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 dark:hover:text-primary-400 dark:focus-visible:ring-offset-slate-950"
                        >
                            {String(volume).padStart(2, '0')}
                        </Link>
                    ))}
                </div>
            </motion.nav>

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
