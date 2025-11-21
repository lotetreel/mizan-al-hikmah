import { useState } from 'react';
import { Settings, X, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFontSettings } from '../contexts/FontSettingsContext';

const ARABIC_FONTS = [
    { value: 'arabic', label: 'Default' },
    { value: 'Scheherazade New', label: 'Scheherazade' },
    { value: 'Cairo', label: 'Cairo' },
    { value: 'Noto Naskh Arabic', label: 'Noto Naskh' },
];

export function FontSettingsPanel() {
    const [isOpen, setIsOpen] = useState(false);
    const { settings, updateSettings, resetSettings } = useFontSettings();

    return (
        <>
            {/* Settings Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="p-2 text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                title="Reading Settings"
            >
                <Settings size={20} />
            </button>

            {/* Settings Panel */}
            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-50 flex items-start justify-end p-4 bg-black/20 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, x: 300 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 300 }}
                            className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-sm border border-slate-200 dark:border-slate-800 mt-16"
                        >
                            {/* Header */}
                            <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-800">
                                <h3 className="font-serif font-bold text-lg text-slate-900 dark:text-white">
                                    Reading Settings
                                </h3>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={resetSettings}
                                        className="p-2 text-slate-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-full transition-colors"
                                        title="Reset to defaults"
                                    >
                                        <RotateCcw size={18} />
                                    </button>
                                    <button
                                        onClick={() => setIsOpen(false)}
                                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Settings Controls */}
                            <div className="p-6 space-y-6">
                                {/* Arabic Font Family */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                        Arabic Font
                                    </label>
                                    <select
                                        value={settings.arabicFontFamily}
                                        onChange={(e) => updateSettings({ arabicFontFamily: e.target.value })}
                                        className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
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
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                        Arabic Size: {settings.arabicFontSize}px
                                    </label>
                                    <input
                                        type="range"
                                        min="14"
                                        max="32"
                                        value={settings.arabicFontSize}
                                        onChange={(e) => updateSettings({ arabicFontSize: Number(e.target.value) })}
                                        className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
                                    />
                                    <div className="flex justify-between text-xs text-slate-400">
                                        <span>14px</span>
                                        <span>32px</span>
                                    </div>
                                </div>

                                {/* English Font Size */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                        English Size: {settings.englishFontSize}px
                                    </label>
                                    <input
                                        type="range"
                                        min="12"
                                        max="24"
                                        value={settings.englishFontSize}
                                        onChange={(e) => updateSettings({ englishFontSize: Number(e.target.value) })}
                                        className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
                                    />
                                    <div className="flex justify-between text-xs text-slate-400">
                                        <span>12px</span>
                                        <span>24px</span>
                                    </div>
                                </div>

                                {/* Preview */}
                                <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wide">Preview</p>
                                    <div className="space-y-3">
                                        <p
                                            className="text-right text-slate-800 dark:text-slate-200 leading-loose"
                                            dir="rtl"
                                            style={{
                                                fontFamily: settings.arabicFontFamily === 'arabic' ? 'var(--font-arabic)' : `'${settings.arabicFontFamily}', var(--font-arabic)`,
                                                fontSize: `${settings.arabicFontSize}px`
                                            }}
                                        >
                                            بِسْمِ اللهِ الرَّحْمنِ الرَّحِيمِ
                                        </p>
                                        <p
                                            className="font-serif text-slate-600 dark:text-slate-400 leading-relaxed"
                                            style={{
                                                fontSize: `${settings.englishFontSize}px`
                                            }}
                                        >
                                            In the name of Allah, the Most Gracious, the Most Merciful
                                        </p>
                                    </div>
                                </div>

                                <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                                    Settings apply to all hadiths and are saved automatically
                                </p>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}
