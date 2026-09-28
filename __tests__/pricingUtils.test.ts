import { describe, it, expect } from 'vitest';
import { hesaplaBirimFiyat, hesaplaSepetSatiri } from '../src/lib/pricingUtils';

describe('pricingUtils', () => {
    const mockUrun = {
        koli_ici_adet: 10,
        palet_ici_koli_adet: 50,
        satis_fiyati_musteri: 10,
        satis_fiyati_toptanci: 8,
        satis_fiyati_palet: 7,
        satis_fiyati_alt_bayi: 6,
    };

    describe('hesaplaBirimFiyat', () => {
        it('should return musteri fiyati for 1-4 koli', () => {
            expect(hesaplaBirimFiyat(mockUrun, 'koli', 1)).toBe(10);
            expect(hesaplaBirimFiyat(mockUrun, 'koli', 4)).toBe(10);
        });

        it('should return toptanci fiyati for 5+ koli', () => {
            expect(hesaplaBirimFiyat(mockUrun, 'koli', 5)).toBe(8);
            expect(hesaplaBirimFiyat(mockUrun, 'koli', 10)).toBe(8);
        });

        it('should return palet fiyati for palet birim', () => {
            expect(hesaplaBirimFiyat(mockUrun, 'palet', 50)).toBe(7);
        });

        it('should return alt bayi fiyati regardless of quantity if user is Alt Bayi', () => {
            expect(hesaplaBirimFiyat(mockUrun, 'koli', 1, 'Alt Bayi')).toBe(6);
            expect(hesaplaBirimFiyat(mockUrun, 'koli', 5, 'Alt Bayi')).toBe(6);
            expect(hesaplaBirimFiyat(mockUrun, 'palet', 50, 'Alt Bayi')).toBe(6);
        });
    });

    describe('hesaplaSepetSatiri', () => {
        it('should calculate correct totals for Müşteri (1-4 koli)', () => {
            const sonuc = hesaplaSepetSatiri(mockUrun, 'koli', 2);
            expect(sonuc.toplamAdet).toBe(20);
            expect(sonuc.koliMiktar).toBe(2);
            expect(sonuc.adetFiyat).toBe(10);
            expect(sonuc.toplamFiyat).toBe(200);
            expect(sonuc.kademe).toBe('musteri');
        });

        it('should calculate correct totals for Toptancı (5+ koli)', () => {
            const sonuc = hesaplaSepetSatiri(mockUrun, 'koli', 5);
            expect(sonuc.toplamAdet).toBe(50);
            expect(sonuc.koliMiktar).toBe(5);
            expect(sonuc.adetFiyat).toBe(8);
            expect(sonuc.toplamFiyat).toBe(400);
            expect(sonuc.kademe).toBe('toptanci');
        });

        it('should calculate correct totals for Alt Bayi', () => {
            const sonuc = hesaplaSepetSatiri(mockUrun, 'koli', 1, 'Alt Bayi');
            expect(sonuc.toplamAdet).toBe(10);
            expect(sonuc.koliMiktar).toBe(1);
            expect(sonuc.adetFiyat).toBe(6);
            expect(sonuc.toplamFiyat).toBe(60);
        });
    });
});
