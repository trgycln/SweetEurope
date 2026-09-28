import { describe, it, expect } from 'vitest';
import { hesaplaSepetSatiri } from '../src/lib/pricingUtils';
import { calculateShipping } from '../src/lib/shippingUtils';

describe('Financial Rounding (Kaufmännisches Runden)', () => {
    it('should correctly round fractional prices in pricingUtils', () => {
        // Mock ürün
        const urun = {
            satis_fiyati_musteri: 9.995, // 9.995 -> beklenen: 10.00
            koli_ici_adet: 1
        };
        
        // Birim fiyat çekilirken ve sepet hesaplanırken yuvarlama yapıldığını kontrol ediyoruz
        const sepet = hesaplaSepetSatiri(urun, 'adet', 1);
        
        // Fiyat 9.995 * 1 = 9.995
        // Güvenli yuvarlama yapıldığında (Math.round((9.995 + Number.EPSILON)*100)/100) = 10.00
        expect(sepet.adetFiyat).toBe(10);
        expect(sepet.toplamFiyat).toBe(10);
    });

    it('should safely calculate VAT and gross total in shippingUtils avoiding JS float errors', () => {
        // shippingCostNet = 15.455 => 15.46
        // KDV = 15.46 * 0.07 = 1.0822 => 1.08
        // Brüt = 15.46 + 1.08 = 16.54
        const result = calculateShipping(0, '12345', 10, {
            dilim2MaxKg: 20,
            dilim2Net: 15.455 // Kasten küsuratlı fiyat veriyoruz
        });

        // 15.455 yuvarlandığında 15.46
        // 15.46 * 0.07 = 1.0822 -> yuvarlandığında 1.08
        // Brüt = 15.46 + 1.08 = 16.54
        
        expect(result.shippingCostNet).toBe(15.46);
        expect(result.shippingVatAmount).toBe(1.08);
        expect(result.shippingCostGross).toBe(16.54); 
    });
});
