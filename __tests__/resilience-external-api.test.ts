import { describe, it, expect, vi, beforeEach } from 'vitest';
import { siparisOlusturAction } from '../src/app/actions/siparis-actions';
import * as notificationUtils from '../src/lib/notificationUtils';

// Mock dependencies
vi.mock('next/headers', () => ({
    cookies: vi.fn(() => ({})),
}));

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
}));

// Mock Notification Utils to intentionally throw an error (simulate 3rd party failure)
vi.mock('../src/lib/notificationUtils', () => ({
    sendNotification: vi.fn().mockImplementation(() => {
        throw new Error('500 Internal Server Error - Resend API Down');
    })
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
        if (table === 'firmalar') {
            return {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: { unvan: 'Test Firma' }, error: null })
            }
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

describe('Resilience & Error Handling - External API Failures', () => {
    
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should successfully create an order and not rollback even if Notification/Email API throws 500 error', async () => {
        
        const payload = {
            firmaId: 'mock-firma-id',
            teslimatAdresi: 'Test str 1 50667 Köln',
            kaynak: 'Müşteri Portalı' as const,
            siparisTuru: 'normal' as const,
            items: [
                {
                    urun_id: 'prod-1',
                    adet: 2,
                    o_anki_satis_fiyati: 8
                }
            ],
            kargoYontemi: 'Köln & Bonn Direktauslieferung'
        };

        // Call the action. If it throws, the test will fail. 
        // We expect it to swallow the error from sendNotification and succeed.
        const result = await siparisOlusturAction(payload);

        // 1. Order should be successfully created
        expect(result.success).toBe(true);
        expect(result.orderId).toBe('mock-order-id');

        // 2. The RPC (database transaction) MUST have been called despite the notification failure
        expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('create_order_with_items_and_update_stock', expect.any(Object));

        // 3. sendNotification MUST have been called (and we know it threw an error)
        expect(notificationUtils.sendNotification).toHaveBeenCalled();
    });
});
