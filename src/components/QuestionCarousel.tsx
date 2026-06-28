import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, Compass, RefreshCw } from 'lucide-react';

const TOTAL_QUESTIONS = 7;

interface QuestionEntry {
    v: number;
    c: number;
    s: number;
    t: string;
    ct: string;
}

interface Question {
    text: string;
    topic: string;
    volume: number;
    chapterNum: number;
    sectionNum: number;
    chapterTitle: string;
    sectionTitle: string;
}

interface CuratedPrompt {
    topic: string;
    question: string;
    chapterTitle: string;
    sectionTitle: string;
}

const CURATED_PROMPTS: CuratedPrompt[] = [
    {
        topic: 'Wisdom',
        question: 'What do the hadiths say about wisdom?',
        chapterTitle: 'WISDOM',
        sectionTitle: 'THE VIRTUE OF WISDOM',
    },
    {
        topic: 'Good manners',
        question: 'How is character refined in the narrations?',
        chapterTitle: 'GOOD MANNERS',
        sectionTitle: 'The Virtue of Good Manners',
    },
    {
        topic: 'Prayer',
        question: 'What place does prayer hold in spiritual life?',
        chapterTitle: 'THE PRAYER (1)',
        sectionTitle: 'THE VIRTUE OF PRAYER',
    },
    {
        topic: 'Patience',
        question: 'What is taught about patience in hardship?',
        chapterTitle: 'PATIENCE',
        sectionTitle: 'The Virtue of Patience',
    },
    {
        topic: 'Repentance',
        question: 'What opens the door to repentance?',
        chapterTitle: 'REPENTANCE',
        sectionTitle: 'Enjoinment of Repenting',
    },
    {
        topic: 'Fairness',
        question: 'How do the hadiths speak about fairness?',
        chapterTitle: 'FAIRNESS',
        sectionTitle: 'Enjoinment of Fairness',
    },
    {
        topic: 'Knowledge',
        question: 'What is the virtue of seeking knowledge?',
        chapterTitle: 'KNOWLEDGE',
        sectionTitle: 'THE VIRTUE OF KNOWLEDGE',
    },
];

const QUESTION_TEMPLATES = [
    (topic: string) => `What do the hadiths say about ${topic}?`,
    (topic: string) => `What wisdom is shared regarding ${topic}?`,
    (topic: string) => `How do the narrations guide us on ${topic}?`,
    (topic: string) => `What is taught about ${topic}?`,
];

const PROPER_NOUN_MAP: Record<string, string> = {
    'allah': 'Allah',
    'quran': 'Quran',
    "qur'an": "Qur'an",
    'prophet': 'Prophet',
    'god': 'God',
    'islam': 'Islam',
    'islamic': 'Islamic',
    'muslim': 'Muslim',
    'muslims': 'Muslims',
    'imam': 'Imam',
    'imamate': 'Imamate',
    'muhammad': 'Muhammad',
    'ali': 'Ali',
    'fatima': 'Fatima',
    'husayn': 'Husayn',
    'hasan': 'Hasan',
    'mahdi': 'Mahdi',
    'jesus': 'Jesus',
    'moses': 'Moses',
    'abraham': 'Abraham',
};

function toTitleCase(str: string): string {
    if (str === str.toUpperCase()) {
        return str
            .split(' ')
            .map(word => word.charAt(0) + word.slice(1).toLowerCase())
            .join(' ');
    }
    return str;
}

function normalizeTitle(str: string): string {
    return str.replace(/\s+/g, ' ').trim().toLowerCase();
}

function capitalizeProperNouns(str: string): string {
    return str.replace(/\b[\w']+\b/g, word => PROPER_NOUN_MAP[word.toLowerCase()] ?? word);
}

function topicFromTitle(raw: string): string {
    return capitalizeProperNouns(
        toTitleCase(raw)
            .replace(/^The\s+/i, '')
            .replace(/\s*\([^)]*\)\s*/g, ' ')
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .trim()
    );
}

function questionFromEntry(entry: QuestionEntry, index: number): string {
    const topic = topicFromTitle(entry.t);
    return QUESTION_TEMPLATES[index % QUESTION_TEMPLATES.length](topic);
}

function toQuestion(entry: QuestionEntry, index: number, prompt?: CuratedPrompt): Question {
    return {
        text: prompt?.question ?? questionFromEntry(entry, index),
        topic: prompt?.topic ?? topicFromTitle(entry.ct),
        volume: entry.v,
        chapterNum: entry.c,
        sectionNum: entry.s,
        chapterTitle: toTitleCase(entry.ct),
        sectionTitle: toTitleCase(entry.t),
    };
}

function findCuratedEntry(entries: QuestionEntry[], prompt: CuratedPrompt): QuestionEntry | undefined {
    const chapterTitle = normalizeTitle(prompt.chapterTitle);
    const sectionTitle = normalizeTitle(prompt.sectionTitle);

    return entries.find(entry =>
        normalizeTitle(entry.ct) === chapterTitle &&
        normalizeTitle(entry.t) === sectionTitle
    );
}

function selectCuratedQuestions(entries: QuestionEntry[]): Question[] {
    const selected = CURATED_PROMPTS
        .map((prompt, index) => {
            const entry = findCuratedEntry(entries, prompt);
            return entry ? toQuestion(entry, index, prompt) : null;
        })
        .filter((question): question is Question => question !== null);

    if (selected.length >= TOTAL_QUESTIONS) return selected.slice(0, TOTAL_QUESTIONS);

    const used = new Set(selected.map(question => `${question.volume}-${question.chapterNum}-${question.sectionNum}`));
    const fill = entries
        .filter(entry => !used.has(`${entry.v}-${entry.c}-${entry.s}`))
        .filter((_, index) => index % 173 === 0)
        .slice(0, TOTAL_QUESTIONS - selected.length)
        .map((entry, index) => toQuestion(entry, selected.length + index));

    return [...selected, ...fill];
}

function shuffleQuestions(entries: QuestionEntry[]): Question[] {
    const pool = [...entries];
    const picked: QuestionEntry[] = [];

    while (picked.length < TOTAL_QUESTIONS && pool.length > 0) {
        const index = Math.floor(Math.random() * pool.length);
        picked.push(pool.splice(index, 1)[0]);
    }

    return picked.map((entry, index) => toQuestion(entry, index));
}

function questionHref(question: Question): string {
    return `/volume/${question.volume}/chapter/${question.chapterNum}#section-${question.sectionNum}`;
}

export function QuestionCarousel() {
    const [allEntries, setAllEntries] = useState<QuestionEntry[]>([]);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/data/questions_index.json')
            .then(response => response.json())
            .then((entries: QuestionEntry[]) => {
                setAllEntries(entries);
                setQuestions(selectCuratedQuestions(entries));
            })
            .catch(() => {
                setAllEntries([]);
                setQuestions([]);
            })
            .finally(() => setLoading(false));
    }, []);

    const featured = questions[0];
    const supportingQuestions = useMemo(() => questions.slice(1), [questions]);

    const handleShuffle = () => {
        if (allEntries.length === 0) return;
        setQuestions(shuffleQuestions(allEntries));
    };

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="h-6 w-44 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
                <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
                    <div className="h-64 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse" />
                    <div className="grid grid-cols-2 gap-3">
                        {[0, 1, 2, 3].map(index => (
                            <div key={index} className="h-32 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (!featured) return null;

    return (
        <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="space-y-5"
            aria-labelledby="explore-questions-heading"
        >
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <Compass size={18} className="text-gold-600 dark:text-gold-300" />
                    <h2
                        id="explore-questions-heading"
                        className="text-sm font-semibold uppercase text-slate-500 dark:text-slate-400"
                    >
                        Explore questions
                    </h2>
                </div>
                <button
                    onClick={handleShuffle}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-primary-800 dark:hover:bg-primary-900/20 dark:hover:text-primary-300"
                >
                    <RefreshCw size={14} />
                    <span>Shuffle</span>
                </button>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
                <FeaturedQuestion question={featured} />

                <div className="hidden sm:grid grid-cols-2 gap-3">
                    {supportingQuestions.map(question => (
                        <CompactQuestionCard
                            key={`${question.volume}-${question.sectionNum}-${question.text}`}
                            question={question}
                        />
                    ))}
                </div>

                <div className="sm:hidden -mx-4 overflow-x-auto px-4 no-scrollbar">
                    <div className="flex gap-3 pb-1">
                        {supportingQuestions.map(question => (
                            <CompactQuestionCard
                                key={`${question.volume}-${question.sectionNum}-${question.text}`}
                                question={question}
                                mobile
                            />
                        ))}
                    </div>
                </div>
            </div>
        </motion.section>
    );
}

function FeaturedQuestion({ question }: { question: Question }) {
    return (
        <Link
            to={questionHref(question)}
            className="group block h-full rounded-lg border border-slate-200 bg-slate-950 p-6 text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900 sm:p-7"
        >
            <div className="flex h-full min-h-[260px] flex-col justify-between gap-8">
                <div className="space-y-5">
                    <div className="flex items-center justify-between gap-3">
                        <span className="inline-flex items-center rounded-full bg-gold-400/15 px-3 py-1 text-xs font-semibold uppercase text-gold-200">
                            Featured
                        </span>
                        <BookOpen size={20} className="text-gold-300" />
                    </div>

                    <div className="space-y-3">
                        <p className="text-sm font-medium text-gold-200">{question.topic}</p>
                        <h3 className="font-serif text-3xl font-bold leading-tight text-white md:text-4xl">
                            {question.text}
                        </h3>
                    </div>
                </div>

                <div className="flex items-end justify-between gap-4">
                    <div className="min-w-0 space-y-1">
                        <p className="font-mono text-xs text-slate-400">Vol. {question.volume}</p>
                        <p className="truncate text-sm font-medium text-slate-200">{question.chapterTitle}</p>
                        <p className="truncate text-sm text-slate-400">{question.sectionTitle}</p>
                    </div>
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-slate-950 transition-transform group-hover:translate-x-1">
                        <ArrowRight size={18} />
                    </span>
                </div>
            </div>
        </Link>
    );
}

function CompactQuestionCard({ question, mobile = false }: { question: Question; mobile?: boolean }) {
    return (
        <Link
            to={questionHref(question)}
            className={`group flex min-h-[150px] flex-col justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-primary-800 ${
                mobile ? 'w-[78vw] shrink-0' : ''
            }`}
        >
            <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">
                        {question.topic}
                    </span>
                    <ArrowRight
                        size={15}
                        className="text-slate-300 transition-colors group-hover:text-primary-500 dark:text-slate-600"
                    />
                </div>
                <h3 className="font-serif text-base font-semibold leading-snug text-slate-900 dark:text-white">
                    {question.text}
                </h3>
            </div>

            <div className="mt-4 min-w-0 space-y-0.5">
                <p className="font-mono text-[11px] text-slate-400">Vol. {question.volume}</p>
                <p className="truncate text-xs font-medium text-slate-600 dark:text-slate-300">
                    {question.sectionTitle}
                </p>
            </div>
        </Link>
    );
}
