function parseTextBlocks(text: string) {
  const getSection = (name: string) => {
    const regex = new RegExp(`\\[SECTION:\\s*${name}\\]\\s*([\\s\\S]*?)(?=\\[SECTION:|$)`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : '';
  };
  return {
    slug: getSection('SLUG'),
    title: getSection('TITLE'),
    excerpt: getSection('EXCERPT'),
    content: getSection('CONTENT'),
    meta_title: getSection('META_TITLE'),
    meta_description: getSection('META_DESCRIPTION')
  };
}

const fakeAiOutput = `
Here is the requested translation:

[SECTION: SLUG]
translated-slug
[SECTION: TITLE]
Çevrilmiş Başlık
[SECTION: EXCERPT]
Çevrilmiş özet
[SECTION: META_TITLE]
Meta Başlık
[SECTION: META_DESCRIPTION]
Meta Açıklama
[SECTION: CONTENT]
<p>Html content here</p>

Hope this helps!
`;

console.log(parseTextBlocks(fakeAiOutput));
