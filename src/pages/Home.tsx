import { VolumeSelector } from '../components/VolumeSelector';
import { RandomHadithSpotlight } from '../components/RandomHadithSpotlight';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { MonitorPlay } from 'lucide-react';
import { enterFullscreen } from '../ambient/fullscreen';

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
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.35 }}
                    className="pt-2"
                >
                    <Link
                        to="/ambient"
                        onClick={enterFullscreen}
                        className="inline-flex items-center gap-2.5 rounded-full border border-gold-300 bg-gold-50 px-5 py-2.5 text-sm font-semibold text-gold-800 transition-colors hover:bg-gold-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 dark:border-gold-700/60 dark:bg-gold-900/20 dark:text-gold-200 dark:hover:bg-gold-900/40"
                    >
                        <MonitorPlay size={18} />
                        Ambient display
                    </Link>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                        Hadith over living backgrounds, for a television or a quiet screen.
                    </p>
                </motion.div>
            </div>

            <div className="mt-12">
                <RandomHadithSpotlight />
            </div>

            <div className="mt-8">
                <VolumeSelector />
            </div>
        </div>
    );
}
