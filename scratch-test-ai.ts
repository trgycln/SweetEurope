import { getGeminiModel } from './src/lib/ai/providers';
import { generateText } from 'ai';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve('.env.local') });

async function check() {
  const deData = {
    slug: 'test-slug',
    title: 'Test Titel',
    excerpt: 'Test Auszug',
    meta_title: 'Test Meta Titel',
    meta_description: 'Test Meta Beschreibung',
    content: '<p>Dies ist ein Testinhalt in Deutsch.</p>'
  };

  const translatePrompt = (lang: string, code: string, aiName: string, foName: string) => `
      You are a professional translator and copywriter. Translate the following text from German to ${lang}. 
      DO NOT TRANSLATE OR MODIFY THE XML TAGS. You MUST keep the exact same XML tag names.
      Translate the entire title, excerpt, and HTML content accurately and fluently into ${lang}. Do not leave German words in the title or content.
      IMPORTANT: Change the internal links inside the 'blog_content' to match the language code:
      - Change "/de/barista-ai" to "/${code}/barista-ai" and translate the anchor text to "${aiName}".
      - Change "/de/products/fo" to "/${code}/products/fo" and translate the anchor text to "${foName}".
      
      OUTPUT ONLY THE XML. DO NOT WRITE ANY EXTRA TEXT.
      
      <blog_slug>translated-slug</blog_slug>
      <blog_title>Translated Title Here</blog_title>
      <blog_excerpt>Translated Excerpt Here</blog_excerpt>
      <blog_meta_title>Translated Meta Title Here</blog_meta_title>
      <blog_meta_description>Translated Meta Description</blog_meta_description>
      <blog_content><p>Translated HTML content here...</p></blog_content>

      --- TEXT TO TRANSLATE BELOW ---
      <blog_slug>
      ${deData.slug}
      </blog_slug>
      <blog_title>
      ${deData.title}
      </blog_title>
      <blog_excerpt>
      ${deData.excerpt}
      </blog_excerpt>
      <blog_meta_title>
      ${deData.meta_title}
      </blog_meta_title>
      <blog_meta_description>
      ${deData.meta_description}
      </blog_meta_description>
      <blog_content>
      ${deData.content}
      </blog_content>
    `;

  try {
    const { text: trText } = await generateText({
      prompt: translatePrompt('Turkish', 'tr', 'Barista AI Reçete Sihirbazı', 'FO Kokteyl Şurupları'),
      maxTokens: 1000,
      model: getGeminiModel()
    });
    console.log("TR RAW OUTPUT:\n", trText);
  } catch(e) {
    console.error(e);
  }
}

check();
