import type { Hadith } from '../lib/types';
import { HadithCard } from './HadithCard';

interface HadithFeedProps {
    hadiths: Hadith[];
    volume: number;
    chapterNum: number;
    chapterTitleEn: string;
    chapterTitleAr: string;
    sectionNum: number;
    sectionTitleEn: string;
    sectionTitleAr: string;
    showChapterInfo?: boolean;
}

export function HadithFeed({
    hadiths,
    volume,
    chapterNum,
    chapterTitleEn,
    chapterTitleAr,
    sectionNum,
    sectionTitleEn,
    sectionTitleAr,
    showChapterInfo,
}: HadithFeedProps) {
    return (
        <div className="space-y-6 max-w-3xl mx-auto">
            {hadiths.map((hadith) => (
                <HadithCard
                    key={hadith.hadith_num}
                    hadith={hadith}
                    volume={volume}
                    chapterNum={chapterNum}
                    chapterTitleEn={chapterTitleEn}
                    chapterTitleAr={chapterTitleAr}
                    sectionNum={sectionNum}
                    sectionTitleEn={sectionTitleEn}
                    sectionTitleAr={sectionTitleAr}
                    showChapterInfo={showChapterInfo}
                />
            ))}
        </div>
    );
}
