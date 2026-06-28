import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, Compass, RefreshCw } from 'lucide-react';

const TOTAL_QUESTIONS = 7;
const RECENT_QUESTIONS_STORAGE_KEY = 'mizan:recent-explore-question-keys';
const RECENT_QUESTIONS_LIMIT = 42;

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
        question: 'Where does true wisdom begin?',
        chapterTitle: 'WISDOM',
        sectionTitle: 'THE VIRTUE OF WISDOM',
    },
    {
        topic: 'Good manners',
        question: 'What forms noble character?',
        chapterTitle: 'GOOD MANNERS',
        sectionTitle: 'The Virtue of Good Manners',
    },
    {
        topic: 'Prayer',
        question: 'What gives prayer its weight?',
        chapterTitle: 'THE PRAYER (1)',
        sectionTitle: 'THE VIRTUE OF PRAYER',
    },
    {
        topic: 'Patience',
        question: 'How is patience carried through hardship?',
        chapterTitle: 'PATIENCE',
        sectionTitle: 'The Virtue of Patience',
    },
    {
        topic: 'Repentance',
        question: 'How does a person return to Allah?',
        chapterTitle: 'REPENTANCE',
        sectionTitle: 'Enjoinment of Repenting',
    },
    {
        topic: 'Fairness',
        question: 'What does fairness require of the self?',
        chapterTitle: 'FAIRNESS',
        sectionTitle: 'Enjoinment of Fairness',
    },
    {
        topic: 'Knowledge',
        question: 'Why is seeking knowledge so honored?',
        chapterTitle: 'KNOWLEDGE',
        sectionTitle: 'THE VIRTUE OF KNOWLEDGE',
    },
];

const QUESTION_TEMPLATES = [
    (topic: string) => `What guidance is gathered on ${topic}?`,
    (topic: string) => `How do the narrations frame ${topic}?`,
    (topic: string) => `What can be learned through ${topic}?`,
    (topic: string) => `What does Mizan al-Hikmah preserve on ${topic}?`,
];

const ARTICLE_TOPICS = new Set([
    'body',
    'brother',
    'heart',
    'hereafter',
    'imam',
    'intellect',
    'prisoner',
    'prophet',
    'quran',
    "qur'an",
    'self',
    'soul',
    'tongue',
    'world',
]);

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
    'hadi': 'Hadi',
    'jesus': 'Jesus',
    'moses': 'Moses',
    'khidr': 'Khidr',
    'irmiya': 'Jeremiah',
    'godwariness': 'Godwariness',
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
            .replace(/\(\s*\d+\s*\).*$/g, '')
            .replace(/\s*\[[^\]]*\]\s*/g, ' ')
            .replace(/\s*\([^)]*\)\s*/g, ' ')
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .trim()
    );
}

function topicForQuestion(raw: string): string {
    const topic = topicFromTitle(raw);
    const normalizedTopic = normalizeTitle(topic);

    if (ARTICLE_TOPICS.has(normalizedTopic)) {
        return `the ${topic}`;
    }

    return topic;
}

function cleanSubjectText(subject: string): string {
    return subject
        .replace(/^[.\s:;-]+/, '')
        .replace(/\bcharasteristics\b/gi, 'characteristics')
        .replace(/\bproperous\b/gi, 'prosperous')
        .replace(/\s+/g, ' ')
        .trim();
}

function subjectFromSection(raw: string): string {
    const subject = capitalizeProperNouns(
        toTitleCase(raw)
            .replace(/\s*\([^)]*\)\s*/g, ' ')
            .replace(/^The\s+Virtue\s+Of\s+/i, '')
            .replace(/^Virtue\s+Of\s+/i, '')
            .replace(/^The\s+Merit\s+Of\s+/i, '')
            .replace(/^Merit\s+Of\s+/i, '')
            .replace(/^(The\s+)?Enjoinment\s+Of\s+/i, '')
            .replace(/^(The\s+)?Prohibition\s+Of\s+/i, '')
            .replace(/^(The\s+)?Condemnation\s+Of\s+/i, '')
            .replace(/^(The\s+)?Censure\s+Of\s+/i, '')
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .trim()
    );
    const cleanedSubject = cleanSubjectText(subject);

    if (/^all-powerful$/i.test(cleanedSubject)) {
        return 'the All-Powerful';
    }

    if (/^(importance|necessity|reality|meaning|signs|reward|punishment|benefit|etiquette)\b/i.test(cleanedSubject)) {
        return `the ${cleanedSubject}`;
    }

    return cleanedSubject;
}

function questionFromEntry(entry: QuestionEntry, index: number): string {
    const sectionTitle = toTitleCase(entry.t);
    const sectionSubject = subjectFromSection(sectionTitle);

    if (/^(The\s+)?Virtue\s+Of\s+/i.test(sectionTitle)) {
        return `What gives weight to ${sectionSubject}?`;
    }

    if (/^(The\s+)?Enjoinment\s+Of\s+/i.test(sectionTitle)) {
        return `What calls a person toward ${sectionSubject}?`;
    }

    if (/^(The\s+)?Prohibition\s+Of\s+/i.test(sectionTitle)) {
        return `What cautions are given around ${sectionSubject}?`;
    }

    if (/^(The\s+)?(Condemnation|Censure)\s+Of\s+/i.test(sectionTitle)) {
        return `What warning is given about ${sectionSubject}?`;
    }

    const topic = topicForQuestion(entry.ct);
    return QUESTION_TEMPLATES[index % QUESTION_TEMPLATES.length](topic);
}

function isQuestionFriendlyEntry(entry: QuestionEntry): boolean {
    const subject = subjectFromSection(entry.t);

    if (subject.length === 0 || subject.length > 48) return false;
    if (/["'\u201c\u201d]|\.{2,}/.test(subject)) return false;
    if (subject.includes('[') || subject.includes(']') || subject.includes(',')) return false;
    if (/\band\b/i.test(subject) && subject.length > 20) return false;

    return !/^(that which|the fact|those who|one who|he who|whoever|what to|whether)\b/i.test(subject) &&
        !/^(what|how|when|where|why)\b/i.test(subject) &&
        !/^interpretation\s+of\b/i.test(subject) &&
        !/\b(is|are|was|were|will|shall|should|must|has|have|had)\b/i.test(subject) &&
        !/^(encouraging|discouraging|exhorting)\b/i.test(subject);
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

function entryKey(entry: QuestionEntry): string {
    return `${entry.v}-${entry.c}-${entry.s}`;
}

function questionKey(question: Question): string {
    return `${question.volume}-${question.chapterNum}-${question.sectionNum}`;
}

function findCuratedEntry(entries: QuestionEntry[], prompt: CuratedPrompt): QuestionEntry | undefined {
    const chapterTitle = normalizeTitle(prompt.chapterTitle);
    const sectionTitle = normalizeTitle(prompt.sectionTitle);

    return entries.find(entry =>
        normalizeTitle(entry.ct) === chapterTitle &&
        normalizeTitle(entry.t) === sectionTitle
    );
}

function getCuratedQuestions(entries: QuestionEntry[]): Question[] {
    return CURATED_PROMPTS
        .map((prompt, index) => {
            const entry = findCuratedEntry(entries, prompt);
            return entry ? toQuestion(entry, index, prompt) : null;
        })
        .filter((question): question is Question => question !== null);
}

function getRecentQuestionKeys(): string[] {
    if (typeof window === 'undefined') return [];

    try {
        const stored = window.sessionStorage.getItem(RECENT_QUESTIONS_STORAGE_KEY);
        if (!stored) return [];

        const keys = JSON.parse(stored);
        return Array.isArray(keys) ? keys.filter((key): key is string => typeof key === 'string') : [];
    } catch {
        return [];
    }
}

function rememberQuestionKeys(questions: Question[]): void {
    if (typeof window === 'undefined') return;

    try {
        const recentKeys = getRecentQuestionKeys();
        const nextKeys = [...questions.map(questionKey), ...recentKeys]
            .filter((key, index, keys) => keys.indexOf(key) === index)
            .slice(0, RECENT_QUESTIONS_LIMIT);

        window.sessionStorage.setItem(RECENT_QUESTIONS_STORAGE_KEY, JSON.stringify(nextKeys));
    } catch {
        // Non-essential; randomization still works if session storage is unavailable.
    }
}

function pickRandomQuestions(pool: Question[]): Question[] {
    const candidates = [...pool];
    const picked: Question[] = [];
    const usedTopics = new Set<string>();

    while (picked.length < TOTAL_QUESTIONS && candidates.length > 0) {
        const index = Math.floor(Math.random() * candidates.length);
        const question = candidates.splice(index, 1)[0];
        const topicKey = normalizeTitle(question.topic);
        const canStillFill = candidates.length >= TOTAL_QUESTIONS - picked.length;

        if (usedTopics.has(topicKey) && canStillFill) continue;

        picked.push(question);
        usedTopics.add(topicKey);
    }

    return picked;
}

function buildQuestionPool(entries: QuestionEntry[]): Question[] {
    const curatedQuestions = getCuratedQuestions(entries);
    const usedKeys = new Set(curatedQuestions.map(questionKey));
    const friendlyQuestions = entries
        .filter(isQuestionFriendlyEntry)
        .filter(entry => !usedKeys.has(entryKey(entry)))
        .map((entry, index) => toQuestion(entry, index));

    const pool = [...curatedQuestions, ...friendlyQuestions];

    if (pool.length >= TOTAL_QUESTIONS) return pool;

    const poolKeys = new Set(pool.map(questionKey));
    const fallbackQuestions = entries
        .filter(entry => !poolKeys.has(entryKey(entry)))
        .map((entry, index) => toQuestion(entry, pool.length + index));

    return [...pool, ...fallbackQuestions];
}

function selectRandomQuestions(entries: QuestionEntry[]): Question[] {
    const pool = buildQuestionPool(entries);
    const recentKeys = new Set(getRecentQuestionKeys());
    const freshPool = pool.filter(question => !recentKeys.has(questionKey(question)));
    const picked = pickRandomQuestions(freshPool.length >= TOTAL_QUESTIONS ? freshPool : pool);

    rememberQuestionKeys(picked);
    return picked;
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
                setQuestions(selectRandomQuestions(entries));
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
        setQuestions(selectRandomQuestions(allEntries));
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
