import { VolumeSelector } from '../components/VolumeSelector';
import { motion } from 'framer-motion';

export function Home() {
    return (
        <div className="space-y-12 py-12">
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

            <VolumeSelector />
        </div>
    );
}
