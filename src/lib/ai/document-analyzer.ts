import { generateObject } from 'ai';
import { z } from 'zod';
import { getGeminiModel } from './providers';

export interface AiDocumentAnalysis {
  evrak_turu: string;
  ozet: string;
  kritik_bilgiler: string;
  tarih: string;
  etiketler: string[];
  onerilen_dosya_adi: string;
}

/**
 * Analyzes a PDF document using Gemini (via Vercel AI SDK v7) and extracts structured data.
 *
 * In AI SDK v7 the `messages` array no longer accepts file/binary parts directly.
 * Instead we use the top-level `prompt` (string) combined with the provider's
 * file attachment mechanism via the `experimental_providerMetadata` + `messages`
 * workaround, OR we embed the PDF as a base64 data-URI inside the prompt and
 * rely on Gemini's native multimodal handling through @ai-sdk/google.
 *
 * @param pdfBuffer The PDF file as a Node.js Buffer
 * @param originalName The original filename from the upload
 */
export async function analyzeDocument(
  pdfBuffer: Buffer,
  originalName: string
): Promise<AiDocumentAnalysis> {
  const base64 = pdfBuffer.toString('base64');

  const systemPrompt = `Sen kıdemli bir B2B evrak analiz uzmanısın. Sana verilen PDF'i incele ve KESİNLİKLE istenen JSON alanlarını doldur. Orijinal dosya adı: ${originalName}`;

  try {
    const result = await generateObject({
      model: getGeminiModel('gemini-3.6-flash'),
      temperature: 0,
      system: systemPrompt,
      schema: z.object({
        evrak_turu: z.string().describe('Evrakın türü: Fatura / Sözleşme / Resmi Yazı / Diğer'),
        ozet: z.string().describe('Evrakın içeriğine dair 2 cümlelik Türkçe özet'),
        kritik_bilgiler: z
          .string()
          .describe('Evrakta bulunan Şifre, TC Kimlik, IBAN, Dosya No gibi kritik bilgiler'),
        tarih: z.string().describe("Evrakın tarihi YYYY-MM-DD formatında, bulunamazsa ''"),
        etiketler: z
          .array(z.string())
          .describe('Evrakla ilgili aranabilirlik için etiketler dizisi'),
        onerilen_dosya_adi: z
          .string()
          .describe('Kısa, boşluksuz, Türkçe karaktersiz önerilen dosya adı'),
      }),
      // In AI SDK v7 multimodal content lives inside `messages` but
      // must follow the CoreMessage spec: user role + parts array.
      messages: [
        {
          role: 'user' as const,
          content: [
            {
              type: 'file' as const,
              data: base64,
              mediaType: 'application/pdf',
            },
            {
              type: 'text' as const,
              text: 'Lütfen yukarıdaki PDF evrakını inceleyip benden istenilen alanları Türkçe olarak doldur.',
            },
          ],
        },
      ],
    });

    return result.object;
  } catch (error: any) {
    console.error('[analyzeDocument] Error:', error);
    throw new Error(
      'Doküman analizi başarısız oldu: ' + (error.message || String(error))
    );
  }
}
