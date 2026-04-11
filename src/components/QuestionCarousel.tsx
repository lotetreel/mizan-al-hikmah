import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';

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

function pickThree(entries: QuestionEntry[]): Question[] {
    const pool = [...entries];
    const picked: QuestionEntry[] = [];
    for (let i = 0; i < 3 && pool.length > 0; i++) {
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
    const [activeIndex, setActiveIndex] = useState(0);
    const [direction, setDirection] = useState(0);

    useEffect(() => {
        fetch('/data/questions_index.json')
            .then(r => r.json())
            .then((entries: QuestionEntry[]) => {
                setQuestions(pickThree(entries));
            })
            .catch(() => setQuestions([]))
            .finally(() => setLoading(false));
    }, []);

    const go = useCallback((delta: number) => {
        setDirection(delta);
        setActiveIndex(i => (i + delta + questions.length) % questions.length);
    }, [questions.length]);

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

            {/* Desktop: 3-column grid */}
            <div className="hidden sm:grid grid-cols-3 gap-4">
                {questions.map((q, i) => (
                    <QuestionCard key={i} question={q} index={i} />
                ))}
            </div>

            {/* Mobile: single-card carousel */}
            <div className="sm:hidden">
                <div className="relative overflow-hidden rounded-2xl">
                    <AnimatePresence custom={direction} mode="wait">
                        <motion.div
                            key={activeIndex}
                            custom={direction}
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ duration: 0.22, ease: 'easeInOut' }}
                        >
                            <QuestionCard question={questions[activeIndex]} index={activeIndex} />
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-4 mt-4">
                    <button
                        onClick={() => go(-1)}
                        className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-primary-50 dark:hover:bg-primary-900/20 text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                        aria-label="Previous question"
                    >
                        <ChevronLeft size={18} />
                    </button>

                    {/* Dots */}
                    <div className="flex gap-2">
                        {questions.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => { setDirection(i > activeIndex ? 1 : -1); setActiveIndex(i); }}
                                className={`w-2 h-2 rounded-full transition-all duration-200 ${
                                    i === activeIndex
                                        ? 'bg-primary-500 w-5'
                                        : 'bg-slate-300 dark:bg-slate-600'
                                }`}
                                aria-label={`Go to question ${i + 1}`}
                            />
                        ))}
                    </div>

                    <button
                        onClick={() => go(1)}
                        className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-primary-50 dark:hover:bg-primary-900/20 text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                        aria-label="Next question"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>

            <p className="text-xs text-slate-400 dark:text-slate-600 text-center sm:text-left">
                Questions change on each visit
            </p>
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
                {/* Question number badge */}
                <span className="self-start text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400">
                    Q{index + 1}
                </span>

                {/* Question text */}
                <p className="font-serif text-base font-semibold text-slate-800 dark:text-slate-200 leading-snug flex-1">
                    {question.text}
                </p>

                {/* Footer: source + arrow */}
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
