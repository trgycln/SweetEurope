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
          className="prose prose-lg md:prose-xl dark:prose-invert max-w-prose mx-auto prose-headings:font-serif prose-headings:font-bold prose-headings:text-primary dark:prose-headings:text-white prose-p:text-text-main dark:prose-p:text-gray-300 prose-p:leading-relaxed prose-a:text-accent hover:prose-a:text-yellow-600 prose-img:rounded-3xl prose-img:shadow-xl prose-li:text-text-main dark:prose-li:text-gray-300"
          dangerouslySetInnerHTML={{ __html: content }}
        />
        <div className="my-16 max-w-3xl mx-auto">
          <CalculatorCTA locale={locale} />
        </div>
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
        className="prose prose-lg md:prose-xl dark:prose-invert max-w-prose mx-auto prose-headings:font-serif prose-headings:font-bold prose-headings:text-primary dark:prose-headings:text-white prose-p:text-text-main dark:prose-p:text-gray-300 prose-p:leading-relaxed prose-a:text-accent hover:prose-a:text-yellow-600 prose-img:rounded-3xl prose-img:shadow-xl prose-li:text-text-main dark:prose-li:text-gray-300"
        dangerouslySetInnerHTML={{ __html: firstHalf }}
      />

      <div className="my-16 max-w-3xl mx-auto">
        <CalculatorCTA locale={locale} />
      </div>

      <div
        className="prose prose-lg md:prose-xl dark:prose-invert max-w-prose mx-auto prose-headings:font-serif prose-headings:font-bold prose-headings:text-primary dark:prose-headings:text-white prose-p:text-text-main dark:prose-p:text-gray-300 prose-p:leading-relaxed prose-a:text-accent hover:prose-a:text-yellow-600 prose-img:rounded-3xl prose-img:shadow-xl prose-li:text-text-main dark:prose-li:text-gray-300"
        dangerouslySetInnerHTML={{ __html: secondHalf }}
      />
    </>
  );
}
