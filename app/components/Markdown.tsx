'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * The agent writes markdown. Rendering it as a raw string is how a demo ends
 * up showing ### and ** to a room full of bankers.
 *
 * `compact` is the same light styling at the smaller size used in the
 * inspection panes.
 */
export default function Markdown({ children, tone = 'default' }: { children: string; tone?: 'default' | 'compact' }) {
  return (
    <div
      className={
        tone === 'compact'
          ? 'prose prose-sm max-w-none text-[11px] prose-headings:mt-3 prose-headings:mb-1 prose-headings:text-[11px] prose-headings:uppercase prose-headings:tracking-widest prose-headings:text-neutral-500 prose-p:my-1 prose-p:text-[11px] prose-p:leading-relaxed prose-li:my-0 prose-li:text-[11px] prose-code:text-[10px] prose-pre:text-[10px] prose-pre:bg-neutral-100 prose-pre:text-neutral-800'
          : 'prose prose-sm max-w-none prose-headings:mt-5 prose-headings:mb-2 prose-h3:text-base prose-h3:font-semibold prose-p:leading-relaxed prose-li:my-0.5 prose-code:rounded prose-code:bg-neutral-200/70 prose-code:px-1 prose-code:py-0.5 prose-code:font-mono prose-code:text-[13px] prose-code:before:content-none prose-code:after:content-none prose-strong:font-semibold prose-pre:bg-neutral-100 prose-pre:text-neutral-800'
      }
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
