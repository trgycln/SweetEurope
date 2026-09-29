import React, { useEffect, useMemo } from 'react';
import { usePortal } from '@/contexts/PortalContext';
import { FiX, FiShoppingCart, FiTrash2, FiMinus, FiPlus } from 'react-icons/fi';
import { useParams, useRouter } from 'next/navigation';
import { hesaplaSepetSatiri } from '@/lib/pricingUtils';
import { calculateShipping } from '@/lib/shippingUtils';

export function CartDrawer() {
    const { isCartOpen, setIsCartOpen, warenkorb, updateWarenkorbMenge, removeFromWarenkorb, clearWarenkorb, firma, profile } = usePortal();
    const params = useParams();
    const router = useRouter();
    const locale = params.locale as string || 'de';

    // Lock body scroll when drawer is open
    useEffect(() => {
        if (isCartOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isCartOpen]);

    const handleClose = () => setIsCartOpen(false);

    const plzMatch = firma?.adres ? firma.adres.match(/\b\d{5}\b/) : null;
    const partnerPlz = plzMatch ? plzMatch[0] : '';

    // Calculate totals using B2B logic
    const totalItems = warenkorb.reduce((acc, item) => acc + item.menge, 0);

    const toplamTutar = useMemo(() =>
        warenkorb.reduce((acc, item) => {
            const { toplamFiyat } = hesaplaSepetSatiri(item.produkt as any, item.birim, item.menge, profile?.rol);
            return acc + toplamFiyat;
        }, 0)
    , [warenkorb, profile?.rol]);

    const toplamKdv = useMemo(() =>
        warenkorb.reduce((acc, item) => {
            const kdvOrani = (item.produkt as any).kdv_orani ?? 7;
            const { toplamFiyat } = hesaplaSepetSatiri(item.produkt as any, item.birim, item.menge, profile?.rol);
            return acc + (toplamFiyat * kdvOrani / 100);
        }, 0)
    , [warenkorb, profile?.rol]);

    const toplamAgirlikKg = useMemo(() =>
        warenkorb.reduce((acc, item) => {
            const sepet = hesaplaSepetSatiri(item.produkt as any, item.birim, item.menge, profile?.rol);
            const agirlik = Number((item.produkt as any).agirlik_kg) || 0.7;
            return acc + (sepet.toplamAdet * agirlik);
        }, 0)
    , [warenkorb, profile?.rol]);

    const shippingInfo = useMemo(() => {
        return calculateShipping(toplamTutar, partnerPlz, toplamAgirlikKg);
    }, [toplamTutar, partnerPlz, toplamAgirlikKg]);

    const kargoTutarKdvDahil = shippingInfo.shippingCostGross;
    const genelToplam = toplamTutar + toplamKdv + kargoTutarKdvDahil;

    const handleCheckout = () => {
        setIsCartOpen(false);
        router.push(`/${locale}/portal/siparisler/yeni`);
    };

    const formatCurrency = (val: number) => val.toLocaleString(locale === 'de' ? 'de-DE' : 'tr-TR', { style: 'currency', currency: 'EUR' });

    return (
        <>
            {/* Backdrop */}
            {isCartOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-[90] transition-opacity"
                    onClick={handleClose}
                />
            )}

            {/* Drawer */}
            <div 
                className={`fixed inset-y-0 right-0 z-[100] w-full md:w-[450px] bg-white shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}`}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
                    <div className="flex items-center gap-2">
                        <FiShoppingCart className="text-accent" size={20} />
                        <h2 className="font-bold text-lg text-gray-800">
                            {locale === 'de' ? 'Warenkorb' : 'Sepetim'}
                        </h2>
                        <span className="bg-accent text-white text-xs font-bold px-2 py-0.5 rounded-full">
                            {totalItems}
                        </span>
                    </div>
                    <button 
                        onClick={handleClose}
                        className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors"
                    >
                        <FiX size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 bg-white">
                    {warenkorb.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
                            <FiShoppingCart size={48} className="opacity-20" />
                            <p className="text-center font-medium">
                                {locale === 'de' ? 'Ihr Warenkorb ist leer.' : 'Sepetiniz boş.'}
                            </p>
                            <button 
                                onClick={handleClose}
                                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
                            >
                                {locale === 'de' ? 'Weiter einkaufen' : 'Alışverişe devam et'}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex justify-end">
                                <button 
                                    onClick={clearWarenkorb}
                                    className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                                >
                                    <FiTrash2 size={12} />
                                    {locale === 'de' ? 'Alle löschen' : 'Hepsini sil'}
                                </button>
                            </div>
                            {warenkorb.map((item, idx) => {
                                const name = item.produkt.ad;
                                const localizedName = typeof name === 'string' ? name : (name as any)?.[locale] || (name as any)?.['de'] || 'Ürün';
                                const { adetFiyat, toplamFiyat, toplamAdet } = hesaplaSepetSatiri(item.produkt as any, item.birim, item.menge, profile?.rol);
                                
                                return (
                                    <div key={`${item.produkt.id}-${idx}`} className="flex gap-3 py-4 border-b border-gray-100 items-start">
                                        {/* Image placeholder */}
                                        <div className="w-16 h-16 bg-gray-100 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden">
                                            {item.produkt.ana_resim_url ? (
                                                <img src={item.produkt.ana_resim_url} alt={localizedName} className="w-full h-full object-cover" />
                                            ) : (
                                                <FiShoppingCart className="text-gray-300" size={24} />
                                            )}
                                        </div>
                                        
                                        {/* Details */}
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-bold text-gray-800 line-clamp-2">{localizedName}</h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="bg-gray-100 text-gray-600 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded">
                                                    {item.birim}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    {formatCurrency(adetFiyat)} / {item.birim}
                                                </span>
                                            </div>
                                            
                                            {/* Quantity controls */}
                                            <div className="flex items-center justify-between mt-3">
                                                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-white">
                                                    <button 
                                                        onClick={() => updateWarenkorbMenge(item.produkt.id, item.menge - 1)}
                                                        className="px-2 py-1 bg-gray-50 hover:bg-gray-100 text-gray-600 active:bg-gray-200 transition-colors"
                                                    >
                                                        <FiMinus size={12} />
                                                    </button>
                                                    <span className="px-3 py-1 text-xs font-bold min-w-[2rem] text-center border-x border-gray-200">
                                                        {item.menge}
                                                    </span>
                                                    <button 
                                                        onClick={() => updateWarenkorbMenge(item.produkt.id, item.menge + 1)}
                                                        className="px-2 py-1 bg-gray-50 hover:bg-gray-100 text-gray-600 active:bg-gray-200 transition-colors"
                                                    >
                                                        <FiPlus size={12} />
                                                    </button>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-sm font-bold text-gray-900">
                                                        {formatCurrency(toplamFiyat)}
                                                    </div>
                                                    <div className="text-[10px] text-gray-400">
                                                        {toplamAdet} {locale === 'de' ? 'Stk. gesamt' : 'adet toplam'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer / Checkout */}
                {warenkorb.length > 0 && (
                    <div className="p-4 bg-gray-50 border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] text-sm">
                        <div className="space-y-2 mb-4 text-gray-600">
                            <div className="flex justify-between">
                                <span>{locale === 'de' ? 'Zwischensumme (Netto)' : 'Ara Toplam (Net)'}</span>
                                <span className="font-medium text-gray-800">{formatCurrency(toplamTutar)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>{locale === 'de' ? 'MwSt.' : 'KDV'} (7%)</span>
                                <span>{formatCurrency(toplamKdv)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>{locale === 'de' ? 'Versandkosten' : 'Kargo'}</span>
                                <span className={shippingInfo.isFree ? 'text-green-600 font-medium' : ''}>
                                    {shippingInfo.isFree ? (locale === 'de' ? 'Kostenlos' : 'Ücretsiz') : formatCurrency(kargoTutarKdvDahil)}
                                </span>
                            </div>
                        </div>
                        <div className="flex justify-between items-center mb-4 pt-3 border-t border-gray-200">
                            <span className="text-gray-900 font-bold">{locale === 'de' ? 'Gesamtsumme (Brutto)' : 'Genel Toplam (Brüt)'}</span>
                            <span className="text-xl font-black text-gray-900">
                                {formatCurrency(genelToplam)}
                            </span>
                        </div>
                        <button 
                            onClick={handleCheckout}
                            className="w-full py-3.5 bg-accent hover:bg-accent/90 text-white rounded-xl font-bold text-lg shadow-lg shadow-accent/25 transition-all transform active:scale-[0.98]"
                        >
                            {locale === 'de' ? 'Zur Kasse' : 'Siparişi Tamamla'}
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}
