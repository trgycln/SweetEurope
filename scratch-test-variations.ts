function parseTextBlocks(text: string) {
  const getSection = (name: string) => {
    let regex = new RegExp(`(?:\\[|\\])SECTION:\\s*${name}(?:\\[|\\])\\s*([\\s\\S]*?)(?=(?:\\[|\\])SECTION:|$)`, 'i');
    let match = text.match(regex);
    if (match && match[1].trim()) return match[1].trim();

    regex = new RegExp(`\\b${name}:\\s*([\\s\\S]*?)(?=\\b(?:SLUG|TITLE|EXCERPT|CONTENT|META_TITLE|META_DESCRIPTION):|$)`, 'i');
    match = text.match(regex);
    return match ? match[1].trim() : '';
  };
  return {
    title: getSection('TITLE')
  };
}

console.log("Test 1:", parseTextBlocks(`[SECTION: TITLE] My title`));
console.log("Test 2:", parseTextBlocks(`[ SECTION: TITLE ] My title`));
console.log("Test 3:", parseTextBlocks(`[SECTION:TITLE] My title`));
console.log("Test 4:", parseTextBlocks(`[SECTION : TITLE] My title`));
console.log("Test 5:", parseTextBlocks(`[SECTION: TITLE]
My title
[SECTION: EXCERPT]`));

console.log("Test 6 fallback:", parseTextBlocks(`
TITLE: My title
EXCERPT: short
`));
