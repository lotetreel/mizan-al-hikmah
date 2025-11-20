import { Link } from 'react-router-dom';
import { Book } from 'lucide-react';
import { motion } from 'framer-motion';

const VOLUMES = [
    { num: 1, title: "Volume 1", desc: "Chapters 1-80" },
    { num: 2, title: "Volume 2", desc: "Chapters 81-160" },
    { num: 3, title: "Volume 3", desc: "Chapters 161-240" },
    { num: 4, title: "Volume 4", desc: "Chapters 241-318" },
];

export function VolumeSelector() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {VOLUMES.map((vol, index) => (
                <Link key={vol.num} to={`/volume/${vol.num}`}>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ y: -5 }}
                        className="h-full bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-xl hover:border-primary-200 dark:hover:border-primary-800 transition-all group cursor-pointer text-center"
                    >
                        <div className="w-16 h-16 mx-auto bg-primary-50 dark:bg-primary-900/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                            <Book className="text-primary-600 dark:text-primary-400" size={32} />
                        </div>
                        <h3 className="font-serif text-2xl font-bold text-slate-900 dark:text-white mb-2">
                            {vol.title}
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400">
                            {vol.desc}
                        </p>
                    </motion.div>
                </Link>
            ))}
        </div>
    );
}
