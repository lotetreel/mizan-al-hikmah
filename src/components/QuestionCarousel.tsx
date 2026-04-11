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

function titleToQuestion(raw: string, templateIndex: number): string {
    const title = toTitleCase(raw);
    const topic = title.replace(/^The\s+/i, '').toLowerCase();
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

    // Desktop: page index (each page shows CARDS_PER_PAGE cards)
    const [page, setPage] = useState(0);
    const [pageDir, setPageDir] = useState(0);

    // Mobile: single card index
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

                {/* Desktop pagination controls */}
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

                    {/* Segmented bar */}
                    <div className="flex gap-1">
                        {questions.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => { setMobileDir(i > mobileIndex ? 1 : -1); setMobileIndex(i); }}
                                aria-label={`Go to question ${i + 1}`}
                                className={`h-1 rounded-full transition-all duration-300 ${
                                    i === mobileIndex
                                        ? 'bg-primary-500 w-6'
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
    const href = `/volume/${question.volume}/chapter/${question.chapterNum}#section-${question.sectionNum}`;

    return (
        <Link to={href}>
            <motion.div
                whileHover={{ y: -4 }}
                transition={{ duration: 0.18 }}
                className="group h-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-lg hover:border-primary-200 dark:hover:border-primary-800 transition-all cursor-pointer flex flex-col gap-4"
            >
                <span className="self-start text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400">
                    Q{index + 1}
                </span>

                <p className="font-serif text-base font-semibold text-slate-800 dark:text-slate-200 leading-snug flex-1">
                    {question.text}
                </p>

                <div className="flex items-end justify-between gap-2">
                    <div className="space-y-0.5">
                        <span className="block text-xs font-medium text-primary-600 dark:text-primary-400">
                            Vol. {question.volume}
                        </span>
                        <span className="block text-xs text-slate-400 dark:text-slate-500 leading-tight line-clamp-1">
                            {question.chapterTitle}
                        </span>
                    </div>
                    <div className="shrink-0 w-7 h-7 rounded-full bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all duration-200">
                        <ArrowRight size={13} className="text-primary-600 dark:text-primary-400" />
                    </div>
                </div>
            </motion.div>
        </Link>
    );
}
