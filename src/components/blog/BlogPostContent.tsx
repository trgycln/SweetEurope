'use client';

import CalculatorCTA from '@/components/blog/CalculatorCTA';

interface BlogPostContentProps {
  content: string;
  locale: string;
}

/**
 * Blog yazisinın HTML icerigini paragraf ortasinda boler ve
 * arasina CalculatorCTA bileseni yerlestirir.
 *
 * Strateji:
 * 1. Kapanis etiketlerini (<\/p>, <\/h2>, <\/ul> vb.) sayar.
 * 2. Bu sayinin yaklasik yarisini bulur ve o noktadan boler.
 * 3. Minimum 6 kapanis etiketi gecmedikce CTA eklenmez (cok kisa yazilar icin).
 */
export default function BlogPostContent({ content, locale }: BlogPostContentProps) {
  const closingTagRegex = /<\/(p|h[1-6]|ul|ol|blockquote|figure)>/gi;
  const matches: number[] = [];
  let match: RegExpExecArray | null;

  const regex = new RegExp(closingTagRegex.source, 'gi');
  while ((match = regex.exec(content)) !== null) {
    matches.push(match.index + match[0].length);
  }

  const MIN_BLOCKS = 6;
  if (matches.length < MIN_BLOCKS) {
    return (
      <>
        <div
          className="prose prose-lg md:prose-xl dark:prose-invert max-w-none prose-headings:font-bold prose-a:text-blue-600 hover:prose-a:text-blue-500"
          dangerouslySetInnerHTML={{ __html: content }}
        />
        <CalculatorCTA locale={locale} />
      </>
    );
  }

  const splitIndex = Math.floor(matches.length * 0.4);
  const splitPosition = matches[splitIndex];

  const firstHalf = content.slice(0, splitPosition);
  const secondHalf = content.slice(splitPosition);

  return (
    <>
      <div
        className="prose prose-lg md:prose-xl dark:prose-invert max-w-none prose-headings:font-bold prose-a:text-blue-600 hover:prose-a:text-blue-500"
        dangerouslySetInnerHTML={{ __html: firstHalf }}
      />

      <CalculatorCTA locale={locale} />

      <div
        className="prose prose-lg md:prose-xl dark:prose-invert max-w-none prose-headings:font-bold prose-a:text-blue-600 hover:prose-a:text-blue-500"
        dangerouslySetInnerHTML={{ __html: secondHalf }}
      />
    </>
  );
}
