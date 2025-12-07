import type { VolumeData, SearchResult, HeadingResult } from './types';

const VOLUMES = [1, 2, 3, 4];

export async function loadVolume(volumeNum: number): Promise<VolumeData> {
    try {
        const response = await fetch(`/data/mizan_al_hikmah_vol${volumeNum}.json`);
        if (!response.ok) {
            throw new Error(`Failed to load volume ${volumeNum}: ${response.statusText}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error loading volume:", error);
        return [];
    }
}

export async function searchHadiths(query: string): Promise<SearchResult[]> {
    if (!query || query.length < 3) return [];

    const results: SearchResult[] = [];
    const lowerQuery = query.toLowerCase();

    for (const volNum of VOLUMES) {
        const data = await loadVolume(volNum);

        data.forEach(chapter => {
            chapter.sections.forEach(section => {
                section.hadiths.forEach(hadith => {
                    if (
                        hadith.english.toLowerCase().includes(lowerQuery) ||
                        hadith.arabic.includes(query) ||
                        section.section_title_en.toLowerCase().includes(lowerQuery) ||
                        section.section_title_ar.includes(query) ||
                        chapter.chapter_title_en.toLowerCase().includes(lowerQuery) ||
                        chapter.chapter_title_ar.includes(query)
                    ) {
                        results.push({
                            volume: volNum,
                            chapter,
                            section,
                            hadith
                        });
                    }
                });
            });
        });
    }

    return results;
}

export async function searchHeadings(query: string): Promise<HeadingResult[]> {
    if (!query || query.length < 2) return [];

    const results: HeadingResult[] = [];
    const lowerQuery = query.toLowerCase();

    for (const volNum of VOLUMES) {
        const data = await loadVolume(volNum);

        data.forEach(chapter => {
            // Check chapter title
            if (
                chapter.chapter_title_en.toLowerCase().includes(lowerQuery) ||
                chapter.chapter_title_ar.includes(query)
            ) {
                results.push({
                    title: chapter.chapter_title_en,
                    arabicTitle: chapter.chapter_title_ar,
                    type: 'chapter',
                    volume: volNum,
                    chapterId: chapter.chapter_num
                });
            }

            // Check section titles
            chapter.sections.forEach(section => {
                if (
                    section.section_title_en.toLowerCase().includes(lowerQuery) ||
                    section.section_title_ar.includes(query)
                ) {
                    results.push({
                        title: section.section_title_en,
                        arabicTitle: section.section_title_ar,
                        type: 'section',
                        volume: volNum,
                        chapterId: chapter.chapter_num,
                        sectionId: section.section_num
                    });
                }
            });
        });
    }

    // Limit results to 10
    return results.slice(0, 10);
}
