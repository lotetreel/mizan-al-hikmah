import type {
    HeadingMatchField,
    HeadingResult,
    SearchMatchField,
    SearchResult,
    SearchResultsBundle,
    VolumeData,
} from './types';
import { MIN_SEARCH_LENGTH, normalizeSearchText, parseSearchQuery } from './search';

const VOLUMES = [1, 2, 3, 4];
const MAX_HEADING_RESULTS = 30;
const MAX_HADITH_RESULTS = 120;

const volumeCache = new Map<number, Promise<VolumeData>>();

export async function loadVolume(volumeNum: number): Promise<VolumeData> {
    if (volumeCache.has(volumeNum)) {
        return volumeCache.get(volumeNum)!;
    }

    const volumePromise = (async () => {
        const response = await fetch(`/data/mizan_al_hikmah_vol${volumeNum}.json`);
        if (!response.ok) {
            throw new Error(`Failed to load volume ${volumeNum}: ${response.statusText}`);
        }
        const data = await response.json();
        return data as VolumeData;
    })().catch(error => {
        console.error("Error loading volume:", error);
        return [];
    });

    volumeCache.set(volumeNum, volumePromise);
    return volumePromise;
}

interface SearchableField<FieldName extends string> {
    name: FieldName;
    text: string;
    weight: number;
}

function fieldScore(text: string, query: ReturnType<typeof parseSearchQuery>, weight: number): number {
    const normalizedText = normalizeSearchText(text);
    if (!normalizedText) return 0;

    let score = normalizedText.includes(query.normalized) ? weight * 6 : 0;

    for (const term of query.normalizedTerms) {
        if (normalizedText.includes(term)) {
            const occurrences = normalizedText.split(term).length - 1;
            score += weight * Math.min(occurrences, 5);
        }
    }

    return score;
}

function scoreFields<FieldName extends string>(
    fields: SearchableField<FieldName>[],
    query: ReturnType<typeof parseSearchQuery>
): { score: number; matchedFields: FieldName[] } {
    const matchedFields: FieldName[] = [];
    let score = 0;

    for (const field of fields) {
        const scoreForField = fieldScore(field.text, query, field.weight);
        if (scoreForField > 0) {
            matchedFields.push(field.name);
            score += scoreForField;
        }
    }

    return { score, matchedFields };
}

function matchesQuery(fields: SearchableField<string>[], query: ReturnType<typeof parseSearchQuery>): boolean {
    const combined = normalizeSearchText(fields.map(field => field.text).join(' '));
    if (combined.includes(query.normalized)) return true;
    return query.normalizedTerms.every(term => combined.includes(term));
}

async function loadAllVolumes() {
    return Promise.all(
        VOLUMES.map(async volume => ({
            volume,
            data: await loadVolume(volume),
        }))
    );
}

function emptySearchResults(): SearchResultsBundle {
    return {
        headingResults: [],
        hadithResults: [],
        totalHeadingMatches: 0,
        totalHadithMatches: 0,
    };
}

export async function searchCollection(queryText: string): Promise<SearchResultsBundle> {
    const query = parseSearchQuery(queryText);
    if (query.normalized.length < MIN_SEARCH_LENGTH) return emptySearchResults();

    const headingResults: HeadingResult[] = [];
    const hadithResults: SearchResult[] = [];
    const volumes = await loadAllVolumes();

    for (const { volume, data } of volumes) {
        for (const chapter of data) {
            const chapterFields: SearchableField<HeadingMatchField>[] = [
                { name: 'englishTitle', text: chapter.chapter_title_en, weight: 6 },
                { name: 'arabicTitle', text: chapter.chapter_title_ar, weight: 6 },
            ];

            if (matchesQuery(chapterFields, query)) {
                const { score, matchedFields } = scoreFields(chapterFields, query);
                headingResults.push({
                    title: chapter.chapter_title_en,
                    arabicTitle: chapter.chapter_title_ar,
                    type: 'chapter',
                    volume,
                    chapterId: chapter.chapter_num,
                    score,
                    matchedFields,
                });
            }

            for (const section of chapter.sections) {
                const sectionFields: SearchableField<HeadingMatchField>[] = [
                    { name: 'englishTitle', text: section.section_title_en, weight: 5 },
                    { name: 'arabicTitle', text: section.section_title_ar, weight: 5 },
                ];

                if (matchesQuery(sectionFields, query)) {
                    const { score, matchedFields } = scoreFields(sectionFields, query);
                    headingResults.push({
                        title: section.section_title_en,
                        arabicTitle: section.section_title_ar,
                        type: 'section',
                        volume,
                        chapterId: chapter.chapter_num,
                        sectionId: section.section_num,
                        score,
                        matchedFields,
                    });
                }

                for (const hadith of section.hadiths) {
                    const hadithFields: SearchableField<SearchMatchField>[] = [
                        { name: 'english', text: hadith.english, weight: 10 },
                        { name: 'arabic', text: hadith.arabic, weight: 10 },
                        { name: 'section', text: `${section.section_title_en} ${section.section_title_ar}`, weight: 3 },
                        { name: 'chapter', text: `${chapter.chapter_title_en} ${chapter.chapter_title_ar}`, weight: 2 },
                    ];

                    if (!matchesQuery(hadithFields, query)) continue;

                    const { score, matchedFields } = scoreFields(hadithFields, query);
                    hadithResults.push({
                        volume,
                        chapter,
                        section,
                        hadith,
                        score,
                        matchedFields,
                    });
                }
            }
        }
    }

    headingResults.sort((a, b) =>
        b.score - a.score ||
        a.volume - b.volume ||
        a.chapterId - b.chapterId ||
        (a.sectionId ?? 0) - (b.sectionId ?? 0)
    );
    hadithResults.sort((a, b) =>
        b.score - a.score ||
        a.volume - b.volume ||
        a.chapter.chapter_num - b.chapter.chapter_num ||
        a.hadith.hadith_num - b.hadith.hadith_num
    );

    return {
        headingResults: headingResults.slice(0, MAX_HEADING_RESULTS),
        hadithResults: hadithResults.slice(0, MAX_HADITH_RESULTS),
        totalHeadingMatches: headingResults.length,
        totalHadithMatches: hadithResults.length,
    };
}

export async function searchHadiths(query: string): Promise<SearchResult[]> {
    return (await searchCollection(query)).hadithResults;
}

export async function searchHeadings(query: string): Promise<HeadingResult[]> {
    return (await searchCollection(query)).headingResults;
}
