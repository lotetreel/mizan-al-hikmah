import { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { X, Download, Loader2, ChevronDown, Share2, Palette, RefreshCw } from 'lucide-react';
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

interface Theme {
    id: string;
    name: string;
    translation: string;
    background: string;
    textColor: string;
    subTextColor: string;
    borderColor: string;
    accentColor: string;
    patternOpacity: number;
    borderStyle: 'solid' | 'double' | 'dashed' | 'dotted' | 'none';
    borderWidth: string;
    borderRadius: string;
    boxShadow?: string;
    innerPadding: string;
}

const THEMES: Theme[] = [
    {
        id: 'munajat',
        name: 'Munajat',
        translation: 'Intimate Converse',
        background: 'radial-gradient(circle at top right, #1e293b, #0f172a)',
        textColor: '#ffffff',
        subTextColor: '#94a3b8',
        borderColor: 'rgba(234, 179, 8, 0.3)', // gold-500/30
        accentColor: '#fbbf24', // gold-400
        patternOpacity: 0.1,
        borderStyle: 'solid',
        borderWidth: '1px',
        borderRadius: '2px',
        innerPadding: '2.5rem'
    },
    {
        id: 'basirah',
        name: 'Basirah',
        translation: 'Insight',
        background: 'radial-gradient(circle at top right, #fdfbf7, #f5f5f4)',
        textColor: '#451a03', // amber-950
        subTextColor: '#78350f', // amber-900
        borderColor: 'rgba(180, 83, 9, 0.4)', // amber-700/40
        accentColor: '#b45309', // amber-700
        patternOpacity: 0.05,
        borderStyle: 'double',
        borderWidth: '4px',
        borderRadius: '4px',
        innerPadding: '3rem',
        boxShadow: 'inset 0 0 40px rgba(180, 83, 9, 0.05)'
    },
    {
        id: 'yaqeen',
        name: 'Yaqeen',
        translation: 'Certainty',
        background: 'radial-gradient(circle at top right, #14532d, #052e16)', // green-900 to green-950
        textColor: '#f0fdf4', // green-50
        subTextColor: '#86efac', // green-300
        borderColor: 'rgba(134, 239, 172, 0.4)', // green-300/40
        accentColor: '#4ade80', // green-400
        patternOpacity: 0.1,
        borderStyle: 'dashed',
        borderWidth: '2px',
        borderRadius: '12px',
        innerPadding: '2.5rem'
    },
    {
        id: 'haybah',
        name: 'Haybah',
        translation: 'Majesty',
        background: 'radial-gradient(circle at top right, #262626, #000000)', // neutral-800 to black
        textColor: '#e5e5e5', // neutral-200
        subTextColor: '#a3a3a3', // neutral-400
        borderColor: 'rgba(255, 255, 255, 0.1)',
        accentColor: '#ffffff',
        patternOpacity: 0.08,
        borderStyle: 'solid',
        borderWidth: '1px',
        borderRadius: '0px',
        innerPadding: '3rem',
        boxShadow: '0 0 30px rgba(0,0,0,0.8)'
    },
    {
        id: 'mawaddah',
        name: 'Mawaddah',
        translation: 'Love',
        background: 'linear-gradient(to bottom right, #4c0519, #881337, #be123c)', // rose-950 to rose-700
        textColor: '#fff1f2', // rose-50
        subTextColor: '#fecdd3', // rose-200
        borderColor: 'rgba(251, 113, 133, 0.5)', // rose-400/50
        accentColor: '#fb7185', // rose-400
        patternOpacity: 0.15,
        borderStyle: 'solid',
        borderWidth: '3px',
        borderRadius: '16px',
        innerPadding: '2.5rem'
    }
];

export function HadithShareModal({ isOpen, onClose, hadith, chapterTitle }: HadithShareModalProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const [arabicFontSize, setArabicFontSize] = useState(24);
    const [englishFontSize, setEnglishFontSize] = useState(18);
    const [arabicFontFamily, setArabicFontFamily] = useState('arabic');
    const [selectedThemeId, setSelectedThemeId] = useState('munajat');
    const [showSettings, setShowSettings] = useState(false);

    const selectedTheme = THEMES.find(t => t.id === selectedThemeId) || THEMES[0];

    const cycleTheme = () => {
        const currentIndex = THEMES.findIndex(t => t.id === selectedThemeId);
        const nextIndex = (currentIndex + 1) % THEMES.length;
        setSelectedThemeId(THEMES[nextIndex].id);
    };

    const generateImageBlob = async () => {
        if (ref.current === null) return null;

        const element = ref.current;
        return await toPng(element, {
            cacheBust: true,
            pixelRatio: 2,
            backgroundColor: selectedTheme.background.includes('gradient') ? undefined : selectedTheme.background,
            width: 800,
            height: element.scrollHeight,
            style: {
                height: 'auto',
                maxHeight: 'none',
                overflow: 'visible',
                width: '800px'
            }
        });
    };

    const handleDownload = async () => {
        setIsGenerating(true);
        try {
            const dataUrl = await generateImageBlob();
            if (!dataUrl) return;

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

    const handleShare = async () => {
        setIsSharing(true);
        try {
            const dataUrl = await generateImageBlob();
            if (!dataUrl) return;

            const blob = await (await fetch(dataUrl)).blob();
            const file = new File([blob], `mizan-hadith-${hadith.hadith_num}.png`, { type: 'image/png' });

            if (navigator.share) {
                await navigator.share({
                    title: 'Mizan al Hikmah Hadith',
                    text: 'Check out this hadith from Mizan al Hikmah',
                    files: [file]
                });
            } else {
                // Fallback for desktop or unsupported browsers - just download
                handleDownload();
            }
        } catch (err) {
            console.error('Failed to share', err);
        } finally {
            setIsSharing(false);
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
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setShowSettings(!showSettings)}
                                    className={`
                                        flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all
                                        ${showSettings
                                            ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 ring-1 ring-primary-500/20'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}
                                    `}
                                >
                                    <Palette size={16} />
                                    <span>Customize Appearance</span>
                                    <ChevronDown
                                        size={14}
                                        className={`transition-transform duration-200 ${showSettings ? 'rotate-180' : ''}`}
                                    />
                                </button>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Scrollable Content Area */}
                        <div className="flex-1 overflow-y-auto min-h-0 w-full bg-slate-100 dark:bg-slate-950 relative">
                            {/* Customization Controls - Collapsible */}
                            <AnimatePresence>
                                {showSettings && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-20 shadow-md w-full"
                                    >
                                        <div className="p-4">
                                            <div className="grid grid-cols-2 gap-3">
                                                {/* Theme Selector - Minimalist Cycle Button */}
                                                <div className="space-y-2">
                                                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                                                        Theme
                                                    </label>
                                                    <div className="flex">
                                                        <button
                                                            onClick={cycleTheme}
                                                            className="flex items-center gap-3 pl-1.5 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group shadow-sm w-full md:w-auto"
                                                        >
                                                            <div
                                                                className="w-6 h-6 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm transition-transform group-hover:scale-110"
                                                                style={{ background: selectedTheme.background }}
                                                            />
                                                            <div className="flex flex-col items-start flex-1">
                                                                <span className="text-sm font-bold text-slate-900 dark:text-white leading-none">
                                                                    {selectedTheme.name}
                                                                </span>
                                                                <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-none mt-0.5">
                                                                    {selectedTheme.translation}
                                                                </span>
                                                            </div>
                                                            <RefreshCw size={14} className="text-slate-400 group-hover:text-primary-500 group-hover:rotate-180 transition-all duration-500 ml-1" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Arabic Font Family */}
                                                <div className="space-y-2">
                                                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                                                        Arabic Font
                                                    </label>
                                                    <div className="relative">
                                                        <select
                                                            value={arabicFontFamily}
                                                            onChange={(e) => setArabicFontFamily(e.target.value)}
                                                            className="w-full appearance-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                                        >
                                                            {ARABIC_FONTS.map(font => (
                                                                <option key={font.value} value={font.value}>{font.label}</option>
                                                            ))}
                                                        </select>
                                                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                                    </div>
                                                </div>

                                                {/* Arabic Font Size */}
                                                <div className="space-y-2">
                                                    <div className="flex justify-between">
                                                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                                                            Arabic Size: {arabicFontSize}px
                                                        </label>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min="18"
                                                        max="48"
                                                        value={arabicFontSize}
                                                        onChange={(e) => setArabicFontSize(Number(e.target.value))}
                                                        className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
                                                    />
                                                </div>

                                                {/* English Font Size */}
                                                <div className="space-y-2">
                                                    <div className="flex justify-between">
                                                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                                                            English Size: {englishFontSize}px
                                                        </label>
                                                    </div>
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
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Preview Area */}
                            <div className="p-8">
                                <div className="flex justify-center min-h-full">
                                    {/* The Frame to Capture */}
                                    <div
                                        ref={ref}
                                        className="w-full max-w-[800px] p-4 relative overflow-hidden rounded-lg shadow-lg transition-colors duration-300"
                                        style={{
                                            background: selectedTheme.background,
                                            color: selectedTheme.textColor,
                                            boxShadow: selectedTheme.boxShadow
                                        }}
                                    >
                                        <div
                                            className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/arabesque.png')] pointer-events-none transition-opacity duration-300"
                                            style={{ opacity: selectedTheme.patternOpacity }}
                                        />

                                        {/* Content with Border */}
                                        <div
                                            className="relative z-10 flex flex-col items-center text-center transition-all duration-300"
                                            style={{
                                                borderColor: selectedTheme.borderColor,
                                                borderStyle: selectedTheme.borderStyle,
                                                borderWidth: selectedTheme.borderWidth,
                                                borderRadius: selectedTheme.borderRadius,
                                                padding: selectedTheme.innerPadding
                                            }}
                                        >
                                            {/* Header Icon/Text */}
                                            <div
                                                className="font-serif tracking-widest text-sm uppercase mb-8 transition-colors duration-300"
                                                style={{ color: selectedTheme.accentColor }}
                                            >
                                                Mizan al Hikmah
                                            </div>

                                            {/* Content */}
                                            <div className="space-y-6 w-full">
                                                {chapterTitle && (
                                                    <div
                                                        className="text-sm font-serif uppercase tracking-wide transition-colors duration-300"
                                                        style={{ color: selectedTheme.subTextColor }}
                                                    >
                                                        {chapterTitle}
                                                    </div>
                                                )}

                                                <p
                                                    className="leading-loose transition-colors duration-300"
                                                    dir="rtl"
                                                    style={{
                                                        fontFamily: arabicFontFamily === 'arabic' ? 'var(--font-arabic)' : `'${arabicFontFamily}', var(--font-arabic)`,
                                                        fontSize: `${arabicFontSize}px`,
                                                        color: selectedTheme.textColor
                                                    }}
                                                >
                                                    {hadith.arabic}
                                                </p>

                                                <div
                                                    className="w-16 h-px mx-auto transition-colors duration-300"
                                                    style={{ backgroundColor: selectedTheme.borderColor }}
                                                />

                                                <p
                                                    className="font-serif leading-relaxed transition-colors duration-300"
                                                    style={{
                                                        fontSize: `${englishFontSize}px`,
                                                        color: selectedTheme.subTextColor
                                                    }}
                                                >
                                                    {hadith.english}
                                                </p>
                                            </div>

                                            {/* Footer */}
                                            <div
                                                className="pt-12 w-full flex justify-between items-end text-xs font-mono mt-auto transition-colors duration-300"
                                                style={{ color: selectedTheme.subTextColor }}
                                            >
                                                <span>Hadith #{hadith.hadith_num}</span>
                                                <span>mizan-al-hikmah.web.app</span>
                                            </div>
                                        </div>
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
                                onClick={handleShare}
                                disabled={isSharing}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
                            >
                                {isSharing ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    <Share2 size={16} />
                                )}
                                Share
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
