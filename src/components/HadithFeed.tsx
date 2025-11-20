import type { Hadith } from '../lib/types';
import { HadithCard } from './HadithCard';

interface HadithFeedProps {
    hadiths: Hadith[];
    chapterTitle?: string;
    sectionTitle?: string;
}

export function HadithFeed({ hadiths, chapterTitle, sectionTitle }: HadithFeedProps) {
    return (
        <div className="space-y-6 max-w-3xl mx-auto">
            {hadiths.map((hadith) => (
                <HadithCard
                    key={hadith.hadith_num}
                    hadith={hadith}
                    showChapterInfo={!!chapterTitle}
                    chapterTitle={chapterTitle}
                    sectionTitle={sectionTitle}
                />
            ))}
        </div>
    );
}
