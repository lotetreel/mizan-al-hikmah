import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { FavoriteHadith } from '../lib/types';

interface FavoritesContextType {
    favorites: FavoriteHadith[];
    isFavorite: (volume: number, hadithNum: number) => boolean;
    toggleFavorite: (entry: Omit<FavoriteHadith, 'favoritedAt'>) => boolean;
    removeFavorite: (volume: number, hadithNum: number) => void;
}

const STORAGE_KEY = 'mizan-favorites';

const favoriteKey = (volume: number, hadithNum: number) => `${volume}-${hadithNum}`;

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: ReactNode }) {
    const [favorites, setFavorites] = useState<FavoriteHadith[]>(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) return parsed;
            } catch {
                // fall through
            }
        }
        return [];
    });

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
    }, [favorites]);

    const isFavorite = useCallback(
        (volume: number, hadithNum: number) =>
            favorites.some(f => favoriteKey(f.volume, f.hadith.hadith_num) === favoriteKey(volume, hadithNum)),
        [favorites]
    );

    const toggleFavorite = useCallback(
        (entry: Omit<FavoriteHadith, 'favoritedAt'>): boolean => {
            const key = favoriteKey(entry.volume, entry.hadith.hadith_num);
            let added = false;
            setFavorites(prev => {
                const exists = prev.some(f => favoriteKey(f.volume, f.hadith.hadith_num) === key);
                if (exists) {
                    added = false;
                    return prev.filter(f => favoriteKey(f.volume, f.hadith.hadith_num) !== key);
                }
                added = true;
                return [{ ...entry, favoritedAt: Date.now() }, ...prev];
            });
            return added;
        },
        []
    );

    const removeFavorite = useCallback((volume: number, hadithNum: number) => {
        const key = favoriteKey(volume, hadithNum);
        setFavorites(prev => prev.filter(f => favoriteKey(f.volume, f.hadith.hadith_num) !== key));
    }, []);

    return (
        <FavoritesContext.Provider value={{ favorites, isFavorite, toggleFavorite, removeFavorite }}>
            {children}
        </FavoritesContext.Provider>
    );
}

export function useFavorites() {
    const context = useContext(FavoritesContext);
    if (!context) {
        throw new Error('useFavorites must be used within a FavoritesProvider');
    }
    return context;
}
