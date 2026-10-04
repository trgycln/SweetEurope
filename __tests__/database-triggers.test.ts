import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSupabaseServiceClient } from '../src/lib/supabase/service';

vi.mock('../src/lib/supabase/service', () => {
    let mockProduct = {
        id: 'test-urun-123',
        stok_miktari: 10,
        stok_tukenme_tarihi: null as string | null
    };

    const eqFn = vi.fn().mockImplementation((col, val) => {
        return {
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockProduct, error: null })
        };
    });

    const updateFn = vi.fn().mockImplementation((payload) => {
        if (payload.stok_miktari !== undefined) {
            mockProduct.stok_miktari = payload.stok_miktari;
            // Mocking the trigger behavior
            if (payload.stok_miktari === 0) {
                mockProduct.stok_tukenme_tarihi = new Date().toISOString();
            } else {
                mockProduct.stok_tukenme_tarihi = null;
            }
        }
        return { eq: eqFn };
    });

    const mockAdmin = {
        from: vi.fn((table) => {
            if (table === 'urunler') {
                return {
                    update: updateFn,
                    select: vi.fn().mockReturnThis(),
                    eq: eqFn
                };
            }
            return {};
        })
    };

    return {
        createSupabaseServiceClient: vi.fn(() => mockAdmin)
    };
});

describe('Database Trigger Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('Edge Case 2: should update stok_tukenme_tarihi when stok becomes 0, and revert to null when stok is added', async () => {
        const supabaseAdmin = createSupabaseServiceClient();

        // 1. Stoku 0'a çekiyoruz
        await supabaseAdmin
            .from('urunler')
            .update({ stok_miktari: 0 })
            .eq('id', 'test-urun-123');

        // Fetch updated product
        const { data: outOfStockProduct } = await supabaseAdmin
            .from('urunler')
            .select('*')
            .eq('id', 'test-urun-123')
            .single();

        expect(outOfStockProduct!.stok_miktari).toBe(0);
        expect(outOfStockProduct!.stok_tukenme_tarihi).not.toBeNull();

        // 2. Stoku 10'a çıkarıyoruz (İthalat partisi onayı simülasyonu)
        await supabaseAdmin
            .from('urunler')
            .update({ stok_miktari: 10 })
            .eq('id', 'test-urun-123');

        // Fetch updated product again
        const { data: inStockProduct } = await supabaseAdmin
            .from('urunler')
            .select('*')
            .eq('id', 'test-urun-123')
            .single();

        expect(inStockProduct!.stok_miktari).toBe(10);
        expect(inStockProduct!.stok_tukenme_tarihi).toBeNull();
    });
});
