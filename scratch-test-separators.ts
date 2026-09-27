import { generateText } from 'ai';
import { getGroqModel } from './src/lib/ai/providers';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve('.env.local') });

async function check() {
  const deData = {
    slug: 'test-slug',
    title: 'Brix-Wert im Cocktail: Warum er für Baristas unverzichtbar ist',
    excerpt: 'Ein langer Auszug über Brix...',
    meta_title: 'Brix-Wert im Cocktail',
    meta_description: 'Warum er für Baristas unverzichtbar ist',
    content: '<p>Dies ist ein Testinhalt in Deutsch. ' + 'Sehr lang '.repeat(10) + '</p>'
  };

  const translatePrompt = (lang: string, code: string, aiName: string, foName: string) => `
You are a professional translator and copywriter. Translate the following text from German to ${lang}. 
Translate the entire title, excerpt, and HTML content accurately and fluently into ${lang}. Do not leave German words in the title or content.

STRICT INSTRUCTIONS:
- You MUST return the output using the exact separators below. 
- DO NOT translate or modify the separators themselves. 

<<<SLUG>>>
translated-slug-here
<<<TITLE>>>
Translated Title Here
<<<EXCERPT>>>
Translated Excerpt Here
<<<META_TITLE>>>
Translated Meta Title Here
<<<META_DESCRIPTION>>>
Translated Meta Description Here
<<<CONTENT>>>
<p>Translated HTML Content Here</p>

--- TEXT TO TRANSLATE BELOW ---
<<<SLUG>>>
${deData.slug}
<<<TITLE>>>
${deData.title}
<<<EXCERPT>>>
${deData.excerpt}
<<<META_TITLE>>>
${deData.meta_title}
<<<META_DESCRIPTION>>>
${deData.meta_description}
<<<CONTENT>>>
${deData.content}
  `;

  try {
    const { text: trText } = await generateText({
      prompt: translatePrompt('Turkish', 'tr', 'Barista AI Reçete Sihirbazı', 'FO Kokteyl Şurupları'),
      maxTokens: 2000,
      model: getGroqModel('llama-3.1-70b-versatile')
    });
    console.log("RAW OUTPUT:\n", trText);
    
    // Test parsing
    const getSection = (name: string) => {
      const regex = new RegExp(`<<<${name}>>>\\s*([\\s\\S]*?)(?:<<<|$)`, 'i');
      const match = trText.match(regex);
      return match ? match[1].trim() : '';
    };
    
    console.log("Parsed TITLE:", getSection('TITLE'));
    console.log("Parsed CONTENT snippet:", getSection('CONTENT').substring(0, 50));
    
  } catch(e) {
    console.error(e);
  }
}

check();
