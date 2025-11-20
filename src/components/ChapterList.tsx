import { Link } from 'react-router-dom';
import type { Chapter } from '../lib/types';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

interface ChapterListProps {
    chapters: Chapter[];
    volumeNum: number;
}

export function ChapterList({ chapters, volumeNum }: ChapterListProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {chapters.map((chapter, index) => (
                <Link key={chapter.chapter_num} to={`/volume/${volumeNum}/chapter/${chapter.chapter_num}`}>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.02 }}
                        className="group bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-100 dark:border-slate-800 hover:border-primary-200 dark:hover:border-primary-800 hover:shadow-md transition-all flex items-center justify-between"
                    >
                        <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2 mb-1">
                                <span className="text-xs font-mono text-slate-400">#{chapter.chapter_num}</span>
                                <h3 className="font-serif font-semibold text-slate-900 dark:text-slate-100 truncate">
                                    {chapter.chapter_title_en}
                                </h3>
                            </div>
                            <p className="font-arabic text-slate-500 dark:text-slate-400 text-sm truncate text-right" dir="rtl">
                                {chapter.chapter_title_ar}
                            </p>
                        </div>
                        <ChevronRight className="text-slate-300 group-hover:text-primary-500 transition-colors ml-4" size={20} />
                    </motion.div>
                </Link>
            ))}
        </div>
    );
}
