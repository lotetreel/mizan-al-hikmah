import type { Hadith } from '../lib/types';
import { Copy, Check, Image as ImageIcon } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
import { HadithShareModal } from './HadithShareModal';
import { useFontSettings } from '../contexts/FontSettingsContext';

interface HadithCardProps {
    hadith: Hadith;
    showChapterInfo?: boolean;
    chapterTitle?: string;
    sectionTitle?: string;
}

export function HadithCard({ hadith, showChapterInfo, chapterTitle, sectionTitle }: HadithCardProps) {
    const [copied, setCopied] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const { settings } = useFontSettings();

    const copyToClipboard = () => {
        const text = `${hadith.arabic}\n\n${hadith.english}\n\n(Mizan al Hikmah, Hadith #${hadith.hadith_num})`;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 hover:shadow-md transition-shadow"
            >
                {showChapterInfo && (
                    <div className="mb-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                        <div className="text-xs font-serif text-slate-500 uppercase tracking-wider mb-1">
                            {chapterTitle}
                        </div>
                        <div className="text-sm font-medium text-primary-600 dark:text-primary-400">
                            {sectionTitle}
                        </div>
                    </div>
                )}

                <div className="space-y-6">
                    <div className="flex justify-between items-start gap-4">
                        <span className="text-xs font-mono text-slate-400 shrink-0 mt-1">
                            #{hadith.hadith_num}
                        </span>
                        <p
                            className="leading-loose text-slate-800 dark:text-slate-200 text-right"
                            dir="rtl"
                            style={{
                                fontFamily: settings.arabicFontFamily === 'arabic' ? 'var(--font-arabic)' : `'${settings.arabicFontFamily}', var(--font-arabic)`,
                                fontSize: `${settings.arabicFontSize}px`
                            }}
                        >
                            {hadith.arabic}
                        </p>
                    </div>

                    <p
                        className="leading-relaxed text-slate-600 dark:text-slate-400"
                        style={{
                            fontSize: `${settings.englishFontSize}px`
                        }}
                    >
                        {hadith.english}
                    </p>

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            onClick={() => setIsShareModalOpen(true)}
                            className="p-2 text-slate-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-full transition-colors"
                            title="Create Image"
                        >
                            <ImageIcon size={18} />
                        </button>
                        <button
                            onClick={copyToClipboard}
                            className={cn(
                                "p-2 rounded-full transition-colors",
                                copied
                                    ? "text-green-500 bg-green-50 dark:bg-green-900/20"
                                    : "text-slate-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20"
                            )}
                            title="Copy to clipboard"
                        >
                            {copied ? <Check size={18} /> : <Copy size={18} />}
                        </button>
                    </div>
                </div>
            </motion.div>

            <HadithShareModal
                isOpen={isShareModalOpen}
                onClose={() => setIsShareModalOpen(false)}
                hadith={hadith}
                chapterTitle={chapterTitle}
            />
        </>
    );
}
