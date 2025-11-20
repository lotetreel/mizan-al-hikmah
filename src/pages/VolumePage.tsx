import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { loadVolume } from '../lib/data';
import type { VolumeData } from '../lib/types';
import { ChapterList } from '../components/ChapterList';
import { ArrowLeft, Loader2 } from 'lucide-react';

export function VolumePage() {
    const { volumeNum } = useParams();
    const [data, setData] = useState<VolumeData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (volumeNum) {
            setLoading(true);
            loadVolume(parseInt(volumeNum))
                .then(setData)
                .finally(() => setLoading(false));
        }
    }, [volumeNum]);

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[50vh]">
                <Loader2 className="animate-spin text-primary-500" size={40} />
            </div>
        );
    }

    if (!data) {
        return <div className="text-center py-12">Failed to load volume.</div>;
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-4">
                <Link to="/" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                    <ArrowLeft size={24} />
                </Link>
                <div>
                    <h1 className="text-3xl font-serif font-bold text-slate-900 dark:text-white">
                        Volume {volumeNum}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400">
                        {data.length} Chapters
                    </p>
                </div>
            </div>

            <ChapterList chapters={data} volumeNum={parseInt(volumeNum!)} />
            {/* <pre>{JSON.stringify(data.slice(0, 1), null, 2)}</pre> */}
        </div>
    );
}
