import { generateText } from 'ai';
import { getGeminiModel, groq } from './src/lib/ai/providers';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve('.env.local') });

async function check() {
  const deData = {
    slug: 'test-slug',
    title: 'Wie man die Getränkekosten berechnet',
    excerpt: 'Ein langer Auszug über Kosten...',
    meta_title: 'Getränkekosten',
    meta_description: 'Warum es wichtig ist',
    content: '<p>Dies ist ein Testinhalt in Deutsch.</p>'
  };

  const translatePrompt = (lang: string, code: string, aiName: string, foName: string) => `
You are a professional translator and copywriter. Translate the following text from German to ${lang}. 
Translate the entire title, excerpt, and HTML content accurately and fluently into ${lang}. Do not leave German words in the title or content.

STRICT INSTRUCTIONS:
- You MUST return the output using the exact === NAME === separators below. 
- DO NOT translate or modify the separators themselves. 
- Change internal links to match the language code: "/de/barista-ai" -> "/${code}/barista-ai" (anchor: "${aiName}") and "/de/products/fo" -> "/${code}/products/fo" (anchor: "${foName}").

=== SLUG ===
translated-slug-here
=== TITLE ===
Translated Title Here
=== EXCERPT ===
Translated Excerpt Here
=== META_TITLE ===
Translated Meta Title Here
=== META_DESCRIPTION ===
Translated Meta Description Here
=== CONTENT ===
<p>Translated HTML Content Here</p>

--- TEXT TO TRANSLATE BELOW ---
=== SLUG ===
${deData.slug}
=== TITLE ===
${deData.title}
=== EXCERPT ===
${deData.excerpt}
=== META_TITLE ===
${deData.meta_title}
=== META_DESCRIPTION ===
${deData.meta_description}
=== CONTENT ===
${deData.content}
  `;

  try {
    const { text: arText } = await generateText({
      prompt: translatePrompt('Arabic', 'ar', 'مساعد وصفات باريستا الذكي', 'شراب كوكتيل FO'),
      maxTokens: 2000,
      model: groq('llama-3.1-70b-versatile') // testing with groq to bypass gemini limits
    });
    console.log("RAW ARABIC OUTPUT:\n", arText);
    
    // Test parsing
    const getSection = (name: string) => {
      let regex = new RegExp(`===\\s*${name}\\s*===\\s*([\\s\\S]*?)(?====|$)`, 'i');
      let match = arText.match(regex);
      if (match && match[1].trim()) return match[1].trim();
      return '';
    };
    
    console.log("Parsed TITLE:", getSection('TITLE'));
    
  } catch(e) {
    console.error(e);
  }
}

check();
