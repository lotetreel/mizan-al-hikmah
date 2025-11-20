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

export interface SearchResult {
    volume: number;
    chapter: Chapter;
    section: Section;
    hadith: Hadith;
}
