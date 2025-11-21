import { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { X, Download, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Hadith } from '../lib/types';

interface HadithShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    hadith: Hadith;
    chapterTitle?: string;
}

const ARABIC_FONTS = [
    { value: 'arabic', label: 'Default' },
    { value: 'Scheherazade New', label: 'Scheherazade' },
    { value: 'Cairo', label: 'Cairo' },
    { value: 'Noto Naskh Arabic', label: 'Noto Naskh' },
];

export function HadithShareModal({ isOpen, onClose, hadith, chapterTitle }: HadithShareModalProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [arabicFontSize, setArabicFontSize] = useState(24);
    const [englishFontSize, setEnglishFontSize] = useState(18);
    const [arabicFontFamily, setArabicFontFamily] = useState('arabic');

    const handleDownload = async () => {
        if (ref.current === null) {
            return;
        }

        setIsGenerating(true);
        try {
            const element = ref.current;
            const dataUrl = await toPng(element, {
                cacheBust: true,
                pixelRatio: 2, // Higher quality
                backgroundColor: '#0f172a', // Ensure dark background for the image
                height: element.scrollHeight,
                style: {
                    height: 'auto',
                    maxHeight: 'none',
                    overflow: 'visible'
                }
            });

            const link = document.createElement('a');
            link.download = `mizan-hadith-${hadith.hadith_num}.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error('Failed to generate image', err);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="relative bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden max-h-[90vh] flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-800">
                            <h3 className="font-serif font-bold text-lg text-slate-900 dark:text-white">
                                Share Hadith
                            </h3>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Customization Controls */}
                        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Arabic Font Family */}
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                                        Arabic Font
                                    </label>
                                    <select
                                        value={arabicFontFamily}
                                        onChange={(e) => setArabicFontFamily(e.target.value)}
                                        className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                                    >
                                        {ARABIC_FONTS.map(font => (
                                            <option key={font.value} value={font.value}>
                                                {font.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Arabic Font Size */}
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                                        Arabic Size: {arabicFontSize}px
                                    </label>
                                    <input
                                        type="range"
                                        min="16"
                                        max="48"
                                        value={arabicFontSize}
                                        onChange={(e) => setArabicFontSize(Number(e.target.value))}
                                        className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
                                    />
                                </div>

                                {/* English Font Size */}
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                                        English Size: {englishFontSize}px
                                    </label>
                                    <input
                                        type="range"
                                        min="12"
                                        max="32"
                                        value={englishFontSize}
                                        onChange={(e) => setEnglishFontSize(Number(e.target.value))}
                                        className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Preview Area */}
                        <div className="p-8 bg-slate-100 dark:bg-slate-950 overflow-auto flex-1 flex justify-center">
                            {/* The Frame to Capture */}
                            <div
                                ref={ref}
                                className="w-full max-w-[600px] bg-slate-900 text-white px-8 pt-12 pb-32 md:px-12 md:pt-12 md:pb-32 relative overflow-hidden rounded-lg shadow-lg"
                                style={{
                                    backgroundImage: 'radial-gradient(circle at top right, #1e293b, #0f172a)',
                                }}
                            >
                                {/* Decorative Border */}
                                <div className="absolute inset-4 border border-gold-500/30 rounded-sm pointer-events-none" />
                                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/arabesque.png')] pointer-events-none" />

                                <div className="relative z-10 flex flex-col items-center text-center space-y-8 mb-8">
                                    {/* Header Icon/Text */}
                                    <div className="text-gold-400 font-serif tracking-widest text-sm uppercase">
                                        Mizan al Hikmah
                                    </div>

                                    {/* Content */}
                                    <div className="space-y-6 w-full">
                                        {chapterTitle && (
                                            <div className="text-slate-400 text-sm font-serif uppercase tracking-wide">
                                                {chapterTitle}
                                            </div>
                                        )}

                                        <p
                                            className="leading-loose text-white"
                                            dir="rtl"
                                            style={{
                                                fontFamily: arabicFontFamily === 'arabic' ? 'var(--font-arabic)' : `'${arabicFontFamily}', var(--font-arabic)`,
                                                fontSize: `${arabicFontSize}px`
                                            }}
                                        >
                                            {hadith.arabic}
                                        </p>

                                        <div className="w-16 h-px bg-gold-500/50 mx-auto" />

                                        <p
                                            className="font-serif leading-relaxed text-slate-200"
                                            style={{
                                                fontSize: `${englishFontSize}px`
                                            }}
                                        >
                                            {hadith.english}
                                        </p>
                                    </div>

                                    {/* Footer */}
                                    <div className="pt-8 w-full flex justify-between items-end text-xs text-slate-500 font-mono">
                                        <span>Hadith #{hadith.hadith_num}</span>
                                        <span>mizan-al-hikmah.web.app</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 bg-white dark:bg-slate-900">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDownload}
                                disabled={isGenerating}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50"
                            >
                                {isGenerating ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    <Download size={16} />
                                )}
                                Download Image
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
