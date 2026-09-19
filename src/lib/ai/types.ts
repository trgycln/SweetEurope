export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'model';
  content: string;
}

export interface ProductContext {
  id?: string;
  slug?: string;
  name?: string;
  category?: string;
}

export interface AgentRequest {
  messages: ChatMessage[];
  locale?: string;
  channel?: 'web' | 'whatsapp' | 'instagram' | 'facebook';
  currentProduct?: ProductContext;
}

export interface TieredQuoteResult {
  productId: string;
  productName: string;
  requestedCases: number;
  unitsPerCase: number;
  totalUnits: number;
  singleCasePriceNet: number;
  recommendedTier: {
    tierName: string;
    casePriceNet: number;
    totalNet: number;
    mwstPercent: number;
    totalGross: number;
    savingsEur?: number;
    savingsPercent?: number;
  };
  upsellOpportunity?: {
    nextTierName: string;
    requiredCases: number;
    additionalCasesNeeded: number;
    nextCasePriceNet: number;
    nextTotalNet: number;
    potentialSavingsPercent: number;
    messagePrompt: string;
  };
  palletOption?: {
    casesPerPallet: number;
    palletCasePriceNet: number;
    palletTotalNet: number;
  };
}

export interface SampleKitResult {
  eligible: boolean;
  city: string;
  message: string;
}
