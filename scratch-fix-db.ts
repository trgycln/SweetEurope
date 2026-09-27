import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { generateObjectWithFallback } from './src/lib/ai/providers';
import { z } from 'zod';

dotenv.config({ path: resolve('.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const blogSchema = z.object({
  slug: z.string().describe('SEO friendly URL in English without special characters'),
  title: z.string().describe('Makale Başlığı / Article Title'),
  excerpt: z.string().describe('Kısa Özet / Excerpt'),
  meta_title: z.string().describe('SEO Meta Başlığı / Meta Title'),
  meta_description: z.string().describe('SEO Meta Açıklaması / Meta Description'),
  content: z.string().describe('Makalenin HTML hali / HTML content (e.g. <h2>, <p>)'),
});

const translatePrompt = (lang: string, code: string, aiName: string, foName: string, deData: any) => `
      You are a professional translator and copywriter. Translate the following text from German to ${lang}. 
      Translate the entire title, excerpt, and HTML content accurately and fluently into ${lang}. Do not leave German words in the title or content.
      IMPORTANT: Change the internal links inside the 'content' to match the language code:
      - Change "/de/barista-ai" to "/${code}/barista-ai" and translate the anchor text to "${aiName}".
      - Change "/de/products/fo" to "/${code}/products/fo" and translate the anchor text to "${foName}".
      
      --- TEXT TO TRANSLATE BELOW ---
      Slug: ${deData.slug}
      Title: ${deData.title.de}
      Excerpt: ${deData.excerpt.de}
      Meta Title: ${deData.meta_title.de}
      Meta Description: ${deData.meta_description.de}
      Content: ${deData.content.de}
    `;

async function fixPost() {
  const { data, error } = await supabase
    .from('blog_yazilari')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) {
    console.error("DB Error:", error);
    return;
  }

  const post = data[0];
  console.log("Fixing post:", post.slug);
  
  if (!post.title.tr || post.title.tr.trim() === '') {
    console.log("Generating TR...");
    const { object: trData } = await generateObjectWithFallback({ 
      prompt: translatePrompt('Turkish', 'tr', 'Barista AI Reçete Sihirbazı', 'FO Kokteyl Şurupları', post),
      schema: blogSchema,
      maxTokens: 8192
    });
    
    post.title.tr = trData.title;
    post.excerpt.tr = trData.excerpt;
    post.meta_title.tr = trData.meta_title;
    post.meta_description.tr = trData.meta_description;
    post.content.tr = trData.content;
  }

  if (!post.title.ar || post.title.ar.trim() === '') {
    console.log("Generating AR...");
    const { object: arData } = await generateObjectWithFallback({ 
      prompt: translatePrompt('Arabic', 'ar', 'مساعد وصفات باريستا الذكي', 'شراب كوكتيل FO', post),
      schema: blogSchema,
      maxTokens: 8192
    });
    
    post.title.ar = arData.title;
    post.excerpt.ar = arData.excerpt;
    post.meta_title.ar = arData.meta_title;
    post.meta_description.ar = arData.meta_description;
    post.content.ar = arData.content;
  }

  const { error: updateError } = await supabase
    .from('blog_yazilari')
    .update({
      title: post.title,
      excerpt: post.excerpt,
      meta_title: post.meta_title,
      meta_description: post.meta_description,
      content: post.content
    })
    .eq('id', post.id);

  if (updateError) {
    console.error("Update Error:", updateError);
  } else {
    console.log("Successfully fixed missing translations in DB.");
  }
}

fixPost();
