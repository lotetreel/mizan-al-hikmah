import { getHighlightTerms } from '../lib/search';

interface HighlightedTextProps {
    text: string;
    query: string;
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function HighlightedText({ text, query }: HighlightedTextProps) {
    const terms = getHighlightTerms(query);
    if (terms.length === 0) return <>{text}</>;

    const pattern = terms.map(escapeRegExp).join('|');
    const matcher = new RegExp(`(${pattern})`, 'gi');
    const parts = text.split(matcher);

    return (
        <>
            {parts.map((part, index) => {
                const isMatch = terms.some(term => part.toLowerCase() === term.toLowerCase());
                if (!isMatch) return <span key={`${part}-${index}`}>{part}</span>;

                return (
                    <mark
                        key={`${part}-${index}`}
                        className="rounded bg-yellow-200/80 px-0.5 text-inherit dark:bg-yellow-500/30"
                    >
                        {part}
                    </mark>
                );
            })}
        </>
    );
}
