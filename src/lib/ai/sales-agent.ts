import { buildSystemPrompt } from './prompts/system-prompt';
import { AgentRequest, ChatMessage } from './types';
import {
  searchProducts,
  getProductDetails,
  calculateB2BPricing,
  checkSampleKitEligibility,
  getCategories,
  createDraftOrder,
} from './tools/catalog-tools';

function getApiKey(): string {
  return (process.env.GEMINI_API_KEY || '').replace(/^["']|["']$/g, '').trim();
}

const CANDIDATE_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-3.6-flash',
  'gemini-3-flash-preview',
  'gemini-3.8-flash',
  'gemini-3.5-flash',
];

const FALLBACK_UNAVAILABLE: Record<string, string> = {
  de: 'Vielen Dank für Ihre Anfrage an Elyson Sweets. Unser technischer Assistent wird gerade aktualisiert. Bitte wenden Sie sich für direkte Bestellungen oder Fragen an unser WhatsApp-Team: +49 2203 9899714.',
  tr: 'Elyson Sweets danışmanımıza ilettiğiniz soru için teşekkür ederiz. Teknik asistanımız şu anda güncellenmektedir. Doğrudan sipariş ve sorularınız için WhatsApp ekibimizle hemen iletişime geçebilirsiniz: +49 2203 9899714.',
  en: 'Thank you for your inquiry to Elyson Sweets. Our technical assistant is currently being updated. Please contact our WhatsApp team directly for orders or questions: +49 2203 9899714.',
  ar: 'شكراً لتواصلكم مع Elyson Sweets. يجري حالياً تحديث المساعد التقني. يرجى التواصل مع فريق مبيعات واتساب مباشرة: +49 2203 9899714.',
};

const FALLBACK_RATE_LIMIT: Record<string, string> = {
  de: 'Für individuelle Staffelpreise und spezielle Gastro-Konditionen steht Ihnen unser Vertriebsteam auch direkt per WhatsApp (+49 2203 9899714) gerne zur Verfügung.',
  tr: 'Özel kademeli fiyatlar ve toptan B2B koşulları için satış ekibimiz WhatsApp (+49 2203 9899714) üzerinden size yardımcı olmaktan memnuniyet duyar.',
  en: 'For custom tiered pricing and B2B conditions, our sales team is also available directly via WhatsApp (+49 2203 9899714).',
  ar: 'للحصول على أسعار الكميات وعروض الجملة الخاصة، يسعد فريق مبيعاتنا خدمتكم مباشرة عبر واتساب (+49 2203 9899714).',
};

const FALLBACK_DEFAULT_REPLY: Record<string, string> = {
  de: 'Wie kann ich Ihnen bei Ihrer B2B-Bestellung weiterhelfen?',
  tr: 'B2B siparişiniz veya ürünlerimiz konusunda size nasıl yardımcı olabilirim?',
  en: 'How can I assist you with your B2B order today?',
  ar: 'كيف يمكنني مساعدتك في طلب الجملة اليوم؟',
};

// Gemini Function Declarations
const TOOLS_SPEC = [
  {
    functionDeclarations: [
      {
        name: 'searchProducts',
        description: 'Suche nach Produkten im Elyson Sweets Sortiment anhand von Namen, Kategorie oder Geschmack (z.B. "Blue Curacao", "Haselnuss", "Pistazie", "Fruchtpüree").',
        parameters: {
          type: 'OBJECT',
          properties: {
            query: { type: 'STRING', description: 'Suchbegriff für das Produkt oder Aroma' },
            limit: { type: 'NUMBER', description: 'Maximale Anzahl der Ergebnisse (Standard: 5)' },
          },
          required: ['query'],
        },
      },
      {
        name: 'getProductDetails',
        description: 'Ruft vollständige Spezifikationen eines Produkts ab (Inhaltsstoffe, EAN, Koli-Inhalt, Paletten-Inhalt, Haltbarkeit, Lagerung).',
        parameters: {
          type: 'OBJECT',
          properties: {
            slugOrId: { type: 'STRING', description: 'Slug (z.B. "fo-blue-curacao-sirup") oder UUID des Produkts' },
          },
          required: ['slugOrId'],
        },
      },
      {
        name: 'calculateB2BPricing',
        description: 'Berechnet exakte B2B-Kartonpreise, Staffelpreise ab 5 Kartons, 7% MwSt und eventuelle Palettenvorteile für eine bestimmte Bestellmenge.',
        parameters: {
          type: 'OBJECT',
          properties: {
            slugOrId: { type: 'STRING', description: 'Slug oder ID des Produkts' },
            cases: { type: 'NUMBER', description: 'Anzahl der gewünschten Kartons (Koli)' },
          },
          required: ['slugOrId', 'cases'],
        },
      },
      {
        name: 'checkSampleKitEligibility',
        description: 'Prüft, ob ein Betrieb berechtigt für ein kostenloses B2B-Musterpaket ist (Strikte Regel: Nur Betriebe in Köln und Bonn per persönlicher Übergabe).',
        parameters: {
          type: 'OBJECT',
          properties: {
            city: { type: 'STRING', description: 'Stadt des anfragenden Betriebs (z.B. "Köln", "Bonn", "Düsseldorf")' },
            postalCode: { type: 'STRING', description: 'Postleitzahl (optional)' },
          },
          required: ['city'],
        },
      },
      {
        name: 'getCategories',
        description: 'Ruft alle Produktkategorien ab, um dem Kunden einen Überblick über das Sortiment zu geben (Sirupe, Saucen, Toppings etc.).',
        parameters: {
          type: 'OBJECT',
          properties: {},
        },
      },
      {
        name: 'createDraftOrder',
        description: 'Erstellt eine offizielle B2B-Bestellung (Vorkasse) als Entwurf im System. Nutze dieses Tool nur, wenn der Kunde explizit kaufen möchte und alle Firmendaten bereitgestellt hat.',
        parameters: {
          type: 'OBJECT',
          properties: {
            companyName: { type: 'STRING', description: 'Offizieller Firmenname des Kunden' },
            email: { type: 'STRING', description: 'E-Mail-Adresse für den Rechnungsversand' },
            phone: { type: 'STRING', description: 'Telefonnummer (optional)' },
            address: { type: 'STRING', description: 'Lieferadresse' },
            taxId: { type: 'STRING', description: 'USt-IdNr / Steuernummer (optional)' },
            items: {
              type: 'ARRAY',
              description: 'Liste der bestellten Produkte',
              items: {
                type: 'OBJECT',
                properties: {
                  slugOrId: { type: 'STRING' },
                  cases: { type: 'NUMBER', description: 'Menge in Kartons (Koli)' },
                },
                required: ['slugOrId', 'cases'],
              },
            },
          },
          required: ['companyName', 'email', 'items'],
        },
      },
    ],
  },
];

/**
 * Execute tool call requested by Gemini
 */
async function executeTool(name: string, args: Record<string, any>) {
  switch (name) {
    case 'searchProducts':
      return await searchProducts(args.query, args.limit);
    case 'getProductDetails':
      return await getProductDetails(args.slugOrId);
    case 'calculateB2BPricing':
      return await calculateB2BPricing(args.slugOrId, args.cases);
    case 'checkSampleKitEligibility':
      return checkSampleKitEligibility(args.city, args.postalCode);
    case 'getCategories':
      return await getCategories();
    case 'createDraftOrder':
      return await createDraftOrder(args as any);
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

/**
 * Run the B2B AI Sales Agent
 */
export async function runSalesAgent(req: AgentRequest): Promise<{ reply: string; toolsUsed: string[] }> {
  const apiKey = getApiKey();
  const locale = req.locale || 'de';

  if (!apiKey) {
    return {
      reply: FALLBACK_UNAVAILABLE[locale] || FALLBACK_UNAVAILABLE.de,
      toolsUsed: [],
    };
  }

  const systemInstruction = buildSystemPrompt(
    locale,
    req.channel || 'web',
    req.currentProduct?.slug
  );

  // Convert chat messages to Gemini format
  const contents = req.messages.map((m) => ({
    role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const toolsUsed: string[] = [];

  for (const model of CANDIDATE_MODELS) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    try {
      let currentPayload: any = {
        systemInstruction: {
          parts: [{ text: systemInstruction }],
        },
        contents: [...contents],
        tools: TOOLS_SPEC,
        generationConfig: {
          temperature: 0,
        },
      };

      // Tool calling execution loop (Max 6 hops to allow multi-tool reasoning)
      let hopSuccess = false;
      for (let hop = 0; hop < 6; hop++) {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(currentPayload),
        });

        if (!response.ok) {
          const errText = await response.text();
          console.warn(`[SalesAgent] ${model} error (${response.status}):`, errText);
          break; // Try next model in CANDIDATE_MODELS
        }

        const resData = await response.json();
        const candidate = resData.candidates?.[0];
        const parts = candidate?.content?.parts || [];

        // Check if model wants to call a function
        const functionCalls = parts.filter((p: any) => p.functionCall);

        if (functionCalls.length === 0) {
          // Model returned final text
          const textParts = parts.filter((p: any) => p.text).map((p: any) => p.text).join('\n');
          return {
            reply: textParts || FALLBACK_DEFAULT_REPLY[locale] || FALLBACK_DEFAULT_REPLY.de,
            toolsUsed,
          };
        }

        // Execute each function call and collect responses
        const functionResponseParts: any[] = [];
        for (const fc of functionCalls) {
          const { name, args, id } = fc.functionCall;
          if (!toolsUsed.includes(name)) toolsUsed.push(name);
          const result = await executeTool(name, args || {});
          functionResponseParts.push({
            functionResponse: {
              name,
              response: { output: result },
              ...(id ? { id } : {}),
            },
          });
        }

        // Add model's tool request and tool results to history for next hop
        currentPayload.contents.push({
          role: 'model',
          parts,
        });
        currentPayload.contents.push({
          role: 'user',
          parts: functionResponseParts,
        });
        hopSuccess = true;
      }
    } catch (err: unknown) {
      console.warn(`[SalesAgent] ${model} failed, trying next candidate...`, err);
    }
  }

  // Fallback if all models failed or hit rate limits
  return {
    reply: FALLBACK_RATE_LIMIT[locale] || FALLBACK_RATE_LIMIT.de,
    toolsUsed,
  };
}
