import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';

const CARDS_PER_PAGE = 3;
const TOTAL_QUESTIONS = 10;

interface QuestionEntry {
    v: number;
    c: number;
    s: number;
    t: string;
    ct: string;
}

interface Question {
    text: string;
    volume: number;
    chapterNum: number;
    sectionNum: number;
    chapterTitle: string;
    sectionTitle: string;
}

// 10 jewel-glass colour themes — one per question slot
const CARD_THEMES = [
    // 0 Sapphire
    {
        card: 'bg-gradient-to-br from-sky-50 to-blue-100/80 dark:from-sky-950/80 dark:to-blue-900/50 border-sky-200 dark:border-sky-700/50 hover:border-sky-300 dark:hover:border-sky-500/80',
        question: 'text-sky-950 dark:text-sky-50',
        badge: 'bg-sky-100 dark:bg-sky-800/60 text-sky-700 dark:text-sky-200',
        vol: 'text-sky-600 dark:text-sky-300',
        sub: 'text-sky-400 dark:text-sky-600',
        arrow: 'bg-sky-100 dark:bg-sky-800/50 text-sky-600 dark:text-sky-300',
        seg: 'bg-sky-400 dark:bg-sky-400',
    },
    // 1 Emerald
    {
        card: 'bg-gradient-to-br from-emerald-50 to-green-100/80 dark:from-emerald-950/80 dark:to-emerald-900/50 border-emerald-200 dark:border-emerald-700/50 hover:border-emerald-300 dark:hover:border-emerald-500/80',
        question: 'text-emerald-950 dark:text-emerald-50',
        badge: 'bg-emerald-100 dark:bg-emerald-800/60 text-emerald-700 dark:text-emerald-200',
        vol: 'text-emerald-600 dark:text-emerald-300',
        sub: 'text-emerald-400 dark:text-emerald-600',
        arrow: 'bg-emerald-100 dark:bg-emerald-800/50 text-emerald-600 dark:text-emerald-300',
        seg: 'bg-emerald-400 dark:bg-emerald-400',
    },
    // 2 Amethyst
    {
        card: 'bg-gradient-to-br from-violet-50 to-purple-100/80 dark:from-violet-950/80 dark:to-violet-900/50 border-violet-200 dark:border-violet-700/50 hover:border-violet-300 dark:hover:border-violet-500/80',
        question: 'text-violet-950 dark:text-violet-50',
        badge: 'bg-violet-100 dark:bg-violet-800/60 text-violet-700 dark:text-violet-200',
        vol: 'text-violet-600 dark:text-violet-300',
        sub: 'text-violet-400 dark:text-violet-600',
        arrow: 'bg-violet-100 dark:bg-violet-800/50 text-violet-600 dark:text-violet-300',
        seg: 'bg-violet-400 dark:bg-violet-400',
    },
    // 3 Ruby
    {
        card: 'bg-gradient-to-br from-rose-50 to-pink-100/80 dark:from-rose-950/80 dark:to-rose-900/50 border-rose-200 dark:border-rose-700/50 hover:border-rose-300 dark:hover:border-rose-500/80',
        question: 'text-rose-950 dark:text-rose-50',
        badge: 'bg-rose-100 dark:bg-rose-800/60 text-rose-700 dark:text-rose-200',
        vol: 'text-rose-600 dark:text-rose-300',
        sub: 'text-rose-400 dark:text-rose-600',
        arrow: 'bg-rose-100 dark:bg-rose-800/50 text-rose-600 dark:text-rose-300',
        seg: 'bg-rose-400 dark:bg-rose-400',
    },
    // 4 Topaz
    {
        card: 'bg-gradient-to-br from-amber-50 to-yellow-100/80 dark:from-amber-950/80 dark:to-amber-900/50 border-amber-200 dark:border-amber-700/50 hover:border-amber-300 dark:hover:border-amber-500/80',
        question: 'text-amber-950 dark:text-amber-50',
        badge: 'bg-amber-100 dark:bg-amber-800/60 text-amber-700 dark:text-amber-200',
        vol: 'text-amber-600 dark:text-amber-300',
        sub: 'text-amber-400 dark:text-amber-600',
        arrow: 'bg-amber-100 dark:bg-amber-800/50 text-amber-600 dark:text-amber-300',
        seg: 'bg-amber-400 dark:bg-amber-400',
    },
    // 5 Aquamarine
    {
        card: 'bg-gradient-to-br from-teal-50 to-cyan-100/80 dark:from-teal-950/80 dark:to-teal-900/50 border-teal-200 dark:border-teal-700/50 hover:border-teal-300 dark:hover:border-teal-500/80',
        question: 'text-teal-950 dark:text-teal-50',
        badge: 'bg-teal-100 dark:bg-teal-800/60 text-teal-700 dark:text-teal-200',
        vol: 'text-teal-600 dark:text-teal-300',
        sub: 'text-teal-400 dark:text-teal-600',
        arrow: 'bg-teal-100 dark:bg-teal-800/50 text-teal-600 dark:text-teal-300',
        seg: 'bg-teal-400 dark:bg-teal-400',
    },
    // 6 Indigo
    {
        card: 'bg-gradient-to-br from-indigo-50 to-indigo-100/80 dark:from-indigo-950/80 dark:to-indigo-900/50 border-indigo-200 dark:border-indigo-700/50 hover:border-indigo-300 dark:hover:border-indigo-500/80',
        question: 'text-indigo-950 dark:text-indigo-50',
        badge: 'bg-indigo-100 dark:bg-indigo-800/60 text-indigo-700 dark:text-indigo-200',
        vol: 'text-indigo-600 dark:text-indigo-300',
        sub: 'text-indigo-400 dark:text-indigo-600',
        arrow: 'bg-indigo-100 dark:bg-indigo-800/50 text-indigo-600 dark:text-indigo-300',
        seg: 'bg-indigo-400 dark:bg-indigo-400',
    },
    // 7 Coral
    {
        card: 'bg-gradient-to-br from-orange-50 to-red-100/80 dark:from-orange-950/80 dark:to-orange-900/50 border-orange-200 dark:border-orange-700/50 hover:border-orange-300 dark:hover:border-orange-500/80',
        question: 'text-orange-950 dark:text-orange-50',
        badge: 'bg-orange-100 dark:bg-orange-800/60 text-orange-700 dark:text-orange-200',
        vol: 'text-orange-600 dark:text-orange-300',
        sub: 'text-orange-400 dark:text-orange-600',
        arrow: 'bg-orange-100 dark:bg-orange-800/50 text-orange-600 dark:text-orange-300',
        seg: 'bg-orange-400 dark:bg-orange-400',
    },
    // 8 Jade
    {
        card: 'bg-gradient-to-br from-lime-50 to-green-100/80 dark:from-lime-950/80 dark:to-lime-900/50 border-lime-200 dark:border-lime-700/50 hover:border-lime-300 dark:hover:border-lime-500/80',
        question: 'text-lime-950 dark:text-lime-50',
        badge: 'bg-lime-100 dark:bg-lime-800/60 text-lime-700 dark:text-lime-200',
        vol: 'text-lime-600 dark:text-lime-300',
        sub: 'text-lime-500 dark:text-lime-600',
        arrow: 'bg-lime-100 dark:bg-lime-800/50 text-lime-600 dark:text-lime-300',
        seg: 'bg-lime-400 dark:bg-lime-400',
    },
    // 9 Fuchsia
    {
        card: 'bg-gradient-to-br from-fuchsia-50 to-purple-100/80 dark:from-fuchsia-950/80 dark:to-fuchsia-900/50 border-fuchsia-200 dark:border-fuchsia-700/50 hover:border-fuchsia-300 dark:hover:border-fuchsia-500/80',
        question: 'text-fuchsia-950 dark:text-fuchsia-50',
        badge: 'bg-fuchsia-100 dark:bg-fuchsia-800/60 text-fuchsia-700 dark:text-fuchsia-200',
        vol: 'text-fuchsia-600 dark:text-fuchsia-300',
        sub: 'text-fuchsia-400 dark:text-fuchsia-600',
        arrow: 'bg-fuchsia-100 dark:bg-fuchsia-800/50 text-fuchsia-600 dark:text-fuchsia-300',
        seg: 'bg-fuchsia-400 dark:bg-fuchsia-400',
    },
] as const;

const TEMPLATES = [
    (topic: string) => `What do the hadiths say about ${topic}?`,
    (topic: string) => `What wisdom is shared regarding ${topic}?`,
    (topic: string) => `How do the narrations guide us on ${topic}?`,
    (topic: string) => `What is taught about ${topic}?`,
];

function toTitleCase(str: string): string {
    if (str === str.toUpperCase()) {
        return str
            .split(' ')
            .map(w => w.charAt(0) + w.slice(1).toLowerCase())
            .join(' ');
    }
    return str;
}

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

function capitalizeProperNouns(str: string): string {
    return str.replace(/\b[\w']+\b/g, word => PROPER_NOUN_MAP[word.toLowerCase()] ?? word);
}

function titleToQuestion(raw: string, templateIndex: number): string {
    const title = toTitleCase(raw);
    const topic = capitalizeProperNouns(title.replace(/^The\s+/i, '').toLowerCase());
    return TEMPLATES[templateIndex % TEMPLATES.length](topic);
}

function pickN(entries: QuestionEntry[], n: number): Question[] {
    const pool = [...entries];
    const picked: QuestionEntry[] = [];
    for (let i = 0; i < n && pool.length > 0; i++) {
        const j = Math.floor(Math.random() * pool.length);
        picked.push(pool.splice(j, 1)[0]);
    }
    return picked.map((e, i) => ({
        text: titleToQuestion(e.t, i),
        volume: e.v,
        chapterNum: e.c,
        sectionNum: e.s,
        chapterTitle: toTitleCase(e.ct),
        sectionTitle: toTitleCase(e.t),
    }));
}

const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
};

export function QuestionCarousel() {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);

    const [page, setPage] = useState(0);
    const [pageDir, setPageDir] = useState(0);

    const [mobileIndex, setMobileIndex] = useState(0);
    const [mobileDir, setMobileDir] = useState(0);

    useEffect(() => {
        fetch('/data/questions_index.json')
            .then(r => r.json())
            .then((entries: QuestionEntry[]) => setQuestions(pickN(entries, TOTAL_QUESTIONS)))
            .catch(() => setQuestions([]))
            .finally(() => setLoading(false));
    }, []);

    const totalPages = Math.ceil(questions.length / CARDS_PER_PAGE);

    const goPage = useCallback((delta: number) => {
        setPageDir(delta);
        setPage(p => (p + delta + totalPages) % totalPages);
    }, [totalPages]);

    const goMobile = useCallback((delta: number) => {
        setMobileDir(delta);
        setMobileIndex(i => (i + delta + questions.length) % questions.length);
    }, [questions.length]);

    const pageQuestions = questions.slice(page * CARDS_PER_PAGE, page * CARDS_PER_PAGE + CARDS_PER_PAGE);
    const activeTheme = CARD_THEMES[mobileIndex % CARD_THEMES.length];

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="h-6 w-48 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[0, 1, 2].map(i => (
                        <div key={i} className="h-40 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    if (questions.length === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="space-y-5"
        >
            {/* Header */}
            <div className="flex items-center gap-2">
                <HelpCircle size={18} className="text-primary-500" />
                <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    Explore the Collection
                </h2>
            </div>

            {/* Desktop: 3-card paged carousel */}
            <div className="hidden sm:block">
                <div className="relative overflow-hidden">
                    <AnimatePresence custom={pageDir} mode="wait">
                        <motion.div
                            key={page}
                            custom={pageDir}
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ duration: 0.22, ease: 'easeInOut' }}
                            className="grid grid-cols-3 gap-4"
                        >
                            {pageQuestions.map((q, i) => (
                                <QuestionCard
                                    key={page * CARDS_PER_PAGE + i}
                                    question={q}
                                    index={page * CARDS_PER_PAGE + i}
                                />
                            ))}
                        </motion.div>
                    </AnimatePresence>
                </div>

                <div className="flex items-center justify-between mt-4">
                    <span className="text-xs text-slate-400 dark:text-slate-600">
                        Questions change on each visit
                    </span>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => goPage(-1)}
                            className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-primary-50 dark:hover:bg-primary-900/20 text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                            aria-label="Previous questions"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span className="text-xs font-mono text-slate-400 dark:text-slate-500 tabular-nums">
                            {page + 1} / {totalPages}
                        </span>
                        <button
                            onClick={() => goPage(1)}
                            className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-primary-50 dark:hover:bg-primary-900/20 text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                            aria-label="Next questions"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile: single-card carousel */}
            <div className="sm:hidden">
                <div className="relative overflow-hidden rounded-2xl">
                    <AnimatePresence custom={mobileDir} mode="wait">
                        <motion.div
                            key={mobileIndex}
                            custom={mobileDir}
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ duration: 0.22, ease: 'easeInOut' }}
                        >
                            <QuestionCard question={questions[mobileIndex]} index={mobileIndex} />
                        </motion.div>
                    </AnimatePresence>
                </div>

                <div className="flex items-center justify-center gap-4 mt-4">
                    <button
                        onClick={() => goMobile(-1)}
                        className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-primary-50 dark:hover:bg-primary-900/20 text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                        aria-label="Previous question"
                    >
                        <ChevronLeft size={18} />
                    </button>

                    {/* Segmented bar — active segment uses the current card's colour */}
                    <div className="flex gap-1">
                        {questions.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => { setMobileDir(i > mobileIndex ? 1 : -1); setMobileIndex(i); }}
                                aria-label={`Go to question ${i + 1}`}
                                className={`h-1 rounded-full transition-all duration-300 ${
                                    i === mobileIndex
                                        ? `${activeTheme.seg} w-6`
                                        : 'bg-slate-200 dark:bg-slate-700 w-4'
                                }`}
                            />
                        ))}
                    </div>

                    <button
                        onClick={() => goMobile(1)}
                        className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-primary-50 dark:hover:bg-primary-900/20 text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                        aria-label="Next question"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>

                <p className="text-xs text-slate-400 dark:text-slate-600 text-center mt-2">
                    Questions change on each visit
                </p>
            </div>
        </motion.div>
    );
}

function QuestionCard({ question, index }: { question: Question; index: number }) {
    const theme = CARD_THEMES[index % CARD_THEMES.length];
    const href = `/volume/${question.volume}/chapter/${question.chapterNum}#section-${question.sectionNum}`;

    return (
        <Link to={href}>
            <motion.div
                whileHover={{ y: -4 }}
                transition={{ duration: 0.18 }}
                className={`group h-full ${theme.card} border rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all cursor-pointer flex flex-col gap-4 ring-1 ring-inset ring-white/60 dark:ring-white/5`}
            >
                <span className={`self-start text-xs font-mono font-semibold px-2 py-0.5 rounded-full ${theme.badge}`}>
                    Q{index + 1}
                </span>

                <p className={`font-serif text-base font-semibold ${theme.question} leading-snug flex-1`}>
                    {question.text}
                </p>

                <div className="flex items-end justify-between gap-2">
                    <div className="space-y-0.5">
                        <span className={`block text-xs font-medium ${theme.vol}`}>
                            Vol. {question.volume}
                        </span>
                        <span className={`block text-xs ${theme.sub} leading-tight line-clamp-1`}>
                            {question.chapterTitle}
                        </span>
                    </div>
                    <div className={`shrink-0 w-7 h-7 rounded-full ${theme.arrow} flex items-center justify-center opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all duration-200`}>
                        <ArrowRight size={13} />
                    </div>
                </div>
            </motion.div>
        </Link>
    );
}
