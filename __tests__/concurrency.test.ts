import { describe, it, expect, beforeEach } from 'vitest';

describe('Concurrency - Race Condition on Stock', () => {
    let stock = 5;
    let isLocked = false;
    
    // Mock the deduct_single_product_stock behavior with a lock (simulating FOR UPDATE)
    const mockDeductStock = async (miktar: number) => {
        // Simüle edilmiş network/db gecikmesi
        await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
        
        if (isLocked) {
            // Yarış durumu simulasyonu: Eğer kilitliyse transaction bekler. 
            // Sonra tekrar stok kontrolü yapar (veya deadlock / serialize hatası alır)
            // Biz burada basitçe reddediyoruz.
            return { data: { success: false, error: 'Kilit veya yetersiz stok' } };
        }
        
        isLocked = true;
        
        // Tekrardan okuma ve karar (FOR UPDATE sonrası)
        if (stock < miktar) {
            isLocked = false;
            return { data: { success: false, error: 'Yetersiz stok' } };
        }
        
        stock -= miktar;
        isLocked = false;
        
        return { data: { success: true, new_stock: stock } };
    };

    beforeEach(() => {
        stock = 5;
        isLocked = false;
    });

    it('should prevent race conditions using deduct_single_product_stock mock', async () => {
        // Aynı anda 2 istek at (4'er adet istiyoruz, stok 5). İlk olan stok 1'e düşmeli, ikincisi reddedilmeli
        const request1 = mockDeductStock(4);
        const request2 = mockDeductStock(4);

        const [res1, res2] = await Promise.all([request1, request2]);

        const responses = [res1.data, res2.data];
        const successCount = responses.filter(r => r?.success).length;
        const failCount = responses.filter(r => !r?.success).length;

        // Biri başarılı olmalı, biri başarısız olmalı
        expect(successCount).toBe(1);
        expect(failCount).toBe(1);

        // Kalan stok miktarını kontrol et
        expect(stock).toBe(1); // 5 - 4 = 1, eksiye düşmemeli
    });
});
