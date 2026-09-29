import React, { useEffect } from 'react';
import { usePortal } from '@/contexts/PortalContext';
import { FiX, FiShoppingCart, FiTrash2, FiMinus, FiPlus } from 'react-icons/fi';
import { useParams, useRouter } from 'next/navigation';

export function CartDrawer() {
    const { isCartOpen, setIsCartOpen, warenkorb, updateWarenkorbMenge, removeFromWarenkorb, clearWarenkorb } = usePortal();
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

    // Calculate totals
    const totalItems = warenkorb.reduce((acc, item) => acc + item.menge, 0);
    const totalPrice = warenkorb.reduce((acc, item) => {
        const itemPrice = item.produkt.partnerPreis ?? 0;
        return acc + (itemPrice * item.menge);
    }, 0);

    const handleCheckout = () => {
        setIsCartOpen(false);
        router.push(`/${locale}/portal/siparisler/yeni`);
    };

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
                className={`fixed inset-y-0 right-0 z-[100] w-full md:w-[400px] bg-white shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}`}
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
                <div className="flex-1 overflow-y-auto p-4">
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
                                const price = item.produkt.partnerPreis ?? 0;
                                
                                return (
                                    <div key={`${item.produkt.id}-${idx}`} className="flex gap-3 py-3 border-b border-gray-100 items-center">
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
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                {price.toLocaleString(locale === 'de' ? 'de-DE' : 'tr-TR', { style: 'currency', currency: 'EUR' })} / {item.birim}
                                            </p>
                                            
                                            {/* Quantity controls */}
                                            <div className="flex items-center gap-3 mt-2">
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
                                                <button 
                                                    onClick={() => removeFromWarenkorb(item.produkt.id)}
                                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                                >
                                                    <FiTrash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                        
                                        {/* Row Total */}
                                        <div className="text-sm font-bold text-gray-900 whitespace-nowrap self-start">
                                            {(price * item.menge).toLocaleString(locale === 'de' ? 'de-DE' : 'tr-TR', { style: 'currency', currency: 'EUR' })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer / Checkout */}
                <div className="p-4 bg-gray-50 border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-gray-600 font-medium">{locale === 'de' ? 'Zwischensumme' : 'Ara Toplam'}</span>
                        <span className="text-xl font-black text-gray-900">
                            {totalPrice.toLocaleString(locale === 'de' ? 'de-DE' : 'tr-TR', { style: 'currency', currency: 'EUR' })}
                        </span>
                    </div>
                    <button 
                        onClick={handleCheckout}
                        disabled={warenkorb.length === 0}
                        className="w-full py-3.5 bg-accent hover:bg-accent/90 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-bold text-lg shadow-lg shadow-accent/25 transition-all transform active:scale-[0.98]"
                    >
                        {locale === 'de' ? 'Zur Kasse' : 'Siparişi Tamamla'}
                    </button>
                </div>
            </div>
        </>
    );
}
