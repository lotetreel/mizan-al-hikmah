export const MIN_SEARCH_LENGTH = 2;

export interface ParsedSearchQuery {
    raw: string;
    normalized: string;
    terms: string[];
    normalizedTerms: string[];
}

const ARABIC_DIACRITICS = /[\u064B-\u065F\u0670\u06D6-\u06ED]/g;
const LATIN_DIACRITICS = /[\u0300-\u036f]/g;
const TATWEEL = /\u0640/g;
const QUOTED_PHRASE = /"([^"]+)"/g;

export function normalizeSearchText(value: string): string {
    return value
        .normalize('NFKD')
        .replace(LATIN_DIACRITICS, '')
        .replace(ARABIC_DIACRITICS, '')
        .replace(TATWEEL, '')
        .replace(/[أإآٱ]/g, 'ا')
        .replace(/ؤ/g, 'و')
        .replace(/ئ/g, 'ي')
        .replace(/ى/g, 'ي')
        .replace(/ة/g, 'ه')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
}

export function parseSearchQuery(query: string): ParsedSearchQuery {
    const raw = query.trim();
    const phrases = [...raw.matchAll(QUOTED_PHRASE)]
        .map(match => match[1].trim())
        .filter(Boolean);
    const withoutPhrases = raw.replace(QUOTED_PHRASE, ' ');
    const words = withoutPhrases
        .split(/\s+/)
        .map(term => term.trim())
        .filter(term => term.length >= MIN_SEARCH_LENGTH);
    const terms = [...phrases, ...words];
    const normalized = normalizeSearchText(raw.replace(/"/g, ''));
    const normalizedTerms = Array.from(
        new Set(
            terms
                .map(normalizeSearchText)
                .filter(term => term.length >= MIN_SEARCH_LENGTH)
        )
    );

    return {
        raw,
        normalized,
        terms,
        normalizedTerms: normalizedTerms.length > 0 ? normalizedTerms : normalized ? [normalized] : [],
    };
}

export function getHighlightTerms(query: string): string[] {
    const parsed = parseSearchQuery(query);
    const seen = new Set<string>();

    return parsed.terms
        .filter(term => term.length >= MIN_SEARCH_LENGTH)
        .sort((a, b) => b.length - a.length)
        .filter(term => {
            const key = normalizeSearchText(term);
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
        })
        .slice(0, 12);
}
