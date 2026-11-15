import { loadVolume } from '../lib/data';

export interface AmbientHadith {
    key: string;
    volume: number;
    hadithNum: number;
    chapterNum: number;
    chapterTitle: string;
    sectionTitle: string;
    arabicSpeaker: string;
    arabicText: string;
    speaker: string;
    englishText: string;
}

const VOLUMES = [1, 2, 3, 4];

// Long narrations cannot stay comfortably readable from across a room.
const MAX_ENGLISH = 420;
const MIN_ENGLISH = 20;
const MAX_ARABIC = 400;
const MIN_ARABIC = 12;
const MAX_ARABIC_SPEAKER = 60;

const LOWERCASE_TITLE_WORDS = new Set([
    'a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'from', 'in', 'nor', 'of', 'on', 'or', 'the', 'to',
]);

function titleCase(title: string): string {
    const words = title.trim().toLocaleLowerCase().split(/\s+/);
    return words
        .map((word, index) => {
            if (index > 0 && index < words.length - 1 && LOWERCASE_TITLE_WORDS.has(word)) return word;
            return word.replace(/(^|[-'’([])(\p{L})/gu, (_, lead: string, letter: string) =>
                lead === "'" || lead === '’' ? lead + letter : lead + letter.toLocaleUpperCase());
        })
        .join(' ')
        // honorifics such as (AS) and (SAWA) stay in capitals
        .replace(/\((as|sa|sawa|swt|aj|ra)\)/gi, match => match.toLocaleUpperCase());
}

function clean(text: string): string {
    return text
        .replace(/[\u200b-\u200f\u202a-\u202e]/g, '')
        .replace(/^\s*\d+\.\s*/, '')
        .replace(/\s+/g, ' ')
        .trim();
}

// Only plain "X (AS) said, '...'" narrations are shown, so the name on screen is
// never a narrator, a nested chain, or a fragment of a longer introduction.
const ENGLISH_SPEAKER = /^(?:The |Prophet |Imam |Lady |Fatima |Luqman )[A-Za-z' -]*\((?:AS|SAWA)\)$/;
const ARABIC_HONORIFIC = /علي(?:ه|ها|هما|هم)\s+السلام|صلى/;
const ARABIC_MARKS = /[\u064b-\u0652\u0670\u0640]/g;

// The English and Arabic names must agree; a few source entries do not, and a
// wrongly attributed hadith is worse than a skipped one.
const SPEAKER_NAMES: Array<[RegExp, string[]]> = [
    [/\bProphet \(/, ['رسول']],
    [/\bAli\b/, ['علي']],
    [/\bSadiq\b/, ['الصادق']],
    [/\bBaqir\b/, ['الباقر']],
    [/\bKazim\b/, ['الكاظم']],
    [/\bRida\b/, ['الرضا']],
    [/\bZayn|\bSajjad\b/, ['زين']],
    [/\bAskari\b/, ['العسكري']],
    [/\bHadi\b/, ['الهادي']],
    [/\bHasan\b/, ['الحسن']],
    [/\bHusayn\b|\bHusain\b|\bHossein\b/, ['الحسين']],
    [/\bJawad\b/, ['الجواد']],
    [/\bMahdi\b/, ['المهدي']],
    [/\bJesus\b/, ['عيسى', 'المسيح']],
    [/\bMoses\b/, ['موسى']],
    [/\bLuqman\b/, ['لقمان']],
    [/\bFatima\b/, ['فاطمة']],
];

function speakersAgree(english: string, arabic: string): boolean {
    const words = new Set(arabic.replace(ARABIC_MARKS, '').split(/\s+/));
    let matched = false;
    for (const [pattern, names] of SPEAKER_NAMES) {
        if (!pattern.test(english)) continue;
        if (!names.some(name => words.has(name))) return false;
        matched = true;
    }
    return matched;
}

function parseEnglish(raw: string): { speaker: string; text: string } | null {
    const match = clean(raw).match(/^(.{2,60}?)\s+said,?\s*['‘“"](.+?)['’”"]?\.?\s*$/);
    if (!match) return null;
    const speaker = match[1].trim();
    const text = match[2].trim();
    if (!text || !ENGLISH_SPEAKER.test(speaker)) return null;
    return { speaker, text };
}

function parseArabic(raw: string): { speaker: string; text: string } | null {
    // The source data sometimes splits the first letter from its word ("ا لإمام").
    const arabic = clean(raw).replace(/^(\S)\s+(?=\S)/, '$1');
    const colon = arabic.indexOf(':');
    if (colon <= 0 || colon > MAX_ARABIC_SPEAKER) return null;
    const speaker = arabic.slice(0, colon).trim();
    const text = arabic.slice(colon + 1).trim();
    if (!speaker || !text) return null;
    if (speaker.includes('-') || / عن /.test(speaker) || !ARABIC_HONORIFIC.test(speaker)) return null;
    return { speaker, text };
}

async function collectVolume(volume: number): Promise<AmbientHadith[]> {
    const data = await loadVolume(volume);
    const items: AmbientHadith[] = [];

    for (const chapter of data) {
        for (const section of chapter.sections) {
            for (const hadith of section.hadiths) {
                const english = parseEnglish(hadith.english);
                if (!english || english.text.length < MIN_ENGLISH || english.text.length > MAX_ENGLISH) continue;
                const arabic = parseArabic(hadith.arabic);
                if (!arabic || arabic.text.length < MIN_ARABIC || arabic.text.length > MAX_ARABIC) continue;
                if (!speakersAgree(english.speaker, arabic.speaker)) continue;

                items.push({
                    key: `${volume}-${hadith.hadith_num}`,
                    volume,
                    hadithNum: hadith.hadith_num,
                    chapterNum: chapter.chapter_num,
                    chapterTitle: titleCase(chapter.chapter_title_en),
                    sectionTitle: titleCase(section.section_title_en),
                    arabicSpeaker: arabic.speaker,
                    arabicText: arabic.text,
                    speaker: english.speaker,
                    englishText: english.text,
                });
            }
        }
    }

    return items;
}

/**
 * Loads the volumes one at a time in random order, handing over each batch as it
 * arrives so the first hadith can appear without waiting for the whole collection.
 * Resolves with the total number of hadith found.
 */
export async function loadAmbientPool(onBatch: (items: AmbientHadith[]) => void): Promise<number> {
    const order = [...VOLUMES].sort(() => Math.random() - 0.5);
    let total = 0;
    for (const volume of order) {
        const items = await collectVolume(volume);
        if (items.length === 0) continue;
        total += items.length;
        onBatch(items);
    }
    return total;
}

/** How long a hadith stays on screen, in seconds, at the normal pace. */
export function dwellSeconds(hadith: AmbientHadith): number {
    const seconds = 16 + hadith.englishText.length / 6.5 + hadith.arabicText.length / 14;
    return Math.min(85, Math.max(24, seconds));
}
