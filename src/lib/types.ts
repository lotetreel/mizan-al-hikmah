export interface Hadith {
    hadith_num: number;
    arabic: string;
    english: string;
    footnotes: string[];
}

export interface Section {
    section_num: number;
    section_title_ar: string;
    section_title_en: string;
    hadiths: Hadith[];
}

export interface Chapter {
    chapter_num: number;
    chapter_title_ar: string;
    chapter_title_en: string;
    sections: Section[];
}

export type VolumeData = Chapter[];

export type SearchMatchField = 'arabic' | 'english' | 'chapter' | 'section';
export type HeadingMatchField = 'englishTitle' | 'arabicTitle';

export interface SearchResult {
    volume: number;
    chapter: Chapter;
    section: Section;
    hadith: Hadith;
    score: number;
    matchedFields: SearchMatchField[];
}

export interface HeadingResult {
    title: string;
    arabicTitle: string;
    type: 'chapter' | 'section';
    volume: number;
    chapterId: number;
    sectionId?: number;
    score: number;
    matchedFields: HeadingMatchField[];
}

export interface SearchResultsBundle {
    headingResults: HeadingResult[];
    hadithResults: SearchResult[];
    totalHeadingMatches: number;
    totalHadithMatches: number;
}

export interface FavoriteHadith {
    volume: number;
    chapterNum: number;
    chapterTitleEn: string;
    chapterTitleAr: string;
    sectionNum: number;
    sectionTitleEn: string;
    sectionTitleAr: string;
    hadith: Hadith;
    favoritedAt: number;
}
