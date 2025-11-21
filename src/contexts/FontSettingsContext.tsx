import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

interface FontSettings {
    arabicFontFamily: string;
    arabicFontSize: number;
    englishFontSize: number;
}

interface FontSettingsContextType {
    settings: FontSettings;
    updateSettings: (newSettings: Partial<FontSettings>) => void;
    resetSettings: () => void;
}

const defaultSettings: FontSettings = {
    arabicFontFamily: 'arabic',
    arabicFontSize: 20,
    englishFontSize: 16,
};

const FontSettingsContext = createContext<FontSettingsContextType | undefined>(undefined);

export function FontSettingsProvider({ children }: { children: ReactNode }) {
    const [settings, setSettings] = useState<FontSettings>(() => {
        // Load from localStorage on mount
        const saved = localStorage.getItem('mizan-font-settings');
        if (saved) {
            try {
                return { ...defaultSettings, ...JSON.parse(saved) };
            } catch {
                return defaultSettings;
            }
        }
        return defaultSettings;
    });

    useEffect(() => {
        // Save to localStorage whenever settings change
        localStorage.setItem('mizan-font-settings', JSON.stringify(settings));
    }, [settings]);

    const updateSettings = (newSettings: Partial<FontSettings>) => {
        setSettings(prev => ({ ...prev, ...newSettings }));
    };

    const resetSettings = () => {
        setSettings(defaultSettings);
    };

    return (
        <FontSettingsContext.Provider value={{ settings, updateSettings, resetSettings }}>
            {children}
        </FontSettingsContext.Provider>
    );
}

export function useFontSettings() {
    const context = useContext(FontSettingsContext);
    if (!context) {
        throw new Error('useFontSettings must be used within a FontSettingsProvider');
    }
    return context;
}
