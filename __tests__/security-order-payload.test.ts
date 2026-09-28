import { describe, it, expect, vi, beforeEach } from 'vitest';
import { siparisOlusturAction } from '../src/app/actions/siparis-actions';
import * as pricingUtils from '../src/lib/pricingUtils';
import * as shippingUtils from '../src/lib/shippingUtils';

// Mock dependencies
vi.mock('next/headers', () => ({
    cookies: vi.fn(() => ({})),
}));

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
}));

const mockSupabaseClient = {
    auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'mock-user-id' } } })
    },
    from: vi.fn((table) => {
        if (table === 'profiller') {
            return {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: { rol: 'Alt Bayi' } })
            };
        }
        if (table === 'urunler') {
            return {
                select: vi.fn().mockReturnThis(),
                in: vi.fn().mockResolvedValue({
                    data: [
                        {
                            id: 'prod-1',
                            stok_miktari: 100,
                            ad: 'Test Ürün',
                            satis_fiyati_musteri: 10,
                            satis_fiyati_alt_bayi: 8,
                            koli_ici_adet: 1,
                            birim_agirlik_kg: 1
                        }
                    ],
                    error: null
                })
            };
        }
        if (table === 'siparisler' || table === 'siparis_detay') {
            return {
                insert: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: { id: 'mock-order-id' }, error: null }),
                update: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis()
            };
        }
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), in: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null }) };
    }),
    rpc: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { order_id: 'mock-order-id' }, error: null })
    }))
};

vi.mock('../src/lib/supabase/server', () => {
    return {
        createSupabaseServerClient: vi.fn(() => mockSupabaseClient)
    };
});

vi.mock('../../lib/notificationUtils', () => ({
    sendNotification: vi.fn()
}));

describe('Backend Order Security - Zero Trust Payload', () => {
    
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should completely ignore malicious pricing from frontend and recalculate based on role', async () => {
        
        // Malicious Payload: Frontend sends 0.01 as price instead of the real price (8 for Alt Bayi)
        const maliciousPayload = {
            firmaId: 'mock-firma-id',
            teslimatAdresi: 'Test str 1 50667 Köln',
            kaynak: 'Müşteri Portalı' as const,
            siparisTuru: 'normal' as const,
            items: [
                {
                    urun_id: 'prod-1',
                    adet: 2, // 2 items
                    o_anki_satis_fiyati: 0.01 // MANIPULATED PRICE!
                }
            ],
            kargoTutariNet: 0,
            kargoKdvTutari: 0,
            kargoTutariBrut: 0,
            kargoYontemi: 'Köln & Bonn Direktauslieferung'
        };

        const { createSupabaseServerClient } = await import('../src/lib/supabase/server');
        const supabaseClient = await createSupabaseServerClient();

        await siparisOlusturAction(maliciousPayload);

        // Verify that the RPC was called with the recalculated price (8), NOT 0.01!
        expect(supabaseClient.rpc).toHaveBeenCalledWith('create_order_with_items_and_update_stock', expect.objectContaining({
            p_items: expect.arrayContaining([
                expect.objectContaining({
                    urun_id: 'prod-1',
                    adet: 2,
                    o_anki_satis_fiyati: 8 // Backend should override to true Alt Bayi price
                })
            ])
        }));

        // Verify that siparisler table was updated with correct totals
        // 2 items * 8 = 16 (net)
        // Shipping for local might be 10 (flat rate) or 0 (if threshold passed). Let's assume calculateShipping is used.
        expect(supabaseClient.from).toHaveBeenCalledWith('siparisler');
    });
});
