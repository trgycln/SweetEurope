'use client';

import Image from 'next/image';
import Link from 'next/link';
import { getLocalizedName } from '@/lib/utils';
import { Tables } from '@/lib-supabase/database.types';
import { useLeadGate } from '@/contexts/LeadGateContext';
import { FiShoppingBag } from 'react-icons/fi';
import { toast } from 'sonner';

type ProductCardProps = {
    urun: Tables<'urunler'> & { kategoriler: { ad: any } | null };
    lang: 'de' | 'tr' | 'en' | 'ar';
    linkHref: string;
};

export default function ProductCard({ urun, lang, linkHref }: ProductCardProps) {
    const urunAdi = getLocalizedName(urun.urun_adi, lang);
    const kategoriAdi = urun.kategoriler ? getLocalizedName(urun.kategoriler.ad, lang) : '';
    const imageUrl = urun.ana_resim_url ? urun.ana_resim_url : '/placeholder.jpg';

    const { mounted, unlocked, openLeadModal, addToCart, cart } = useLeadGate();

    // Check if already in cart (only after mounted to avoid hydration mismatch)
    const isInCart = mounted && cart.some(item => item.product_id === urun.id);

    const handleAddToSample = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (!unlocked) {
            const messages = {
                de: 'Bitte geben Sie Ihre Kontaktdaten ein, um Muster anzufordern.',
                tr: 'Numune talebinde bulunmak için lütfen iletişim bilgilerinizi girin.',
                en: 'Please provide your contact details to request samples.',
                ar: 'يرجى تقديم معلومات الاتصال الخاصة بك لطلب عينات.'
            };
            toast.info(messages[lang] || messages.de);
            openLeadModal();
            return;
        }

        if (isInCart) {
            const messages = {
                de: 'Bereits in der Musterliste!',
                tr: 'Zaten numune listesinde!',
                en: 'Already in sample list!',
                ar: 'موجود بالفعل في قائمة العينات!'
            };
            toast.info(messages[lang] || messages.de);
            return;
        }

        // Add to cart (always 1 piece)
        addToCart({
            product_id: urun.id,
            name: urunAdi,
            slug: urun.slug || '',
            image_url: imageUrl,
        });
        
        const successMessages = {
            de: `${urunAdi} zur Musterliste hinzugefügt!`,
            tr: `${urunAdi} numune listesine eklendi!`,
            en: `${urunAdi} added to sample list!`,
            ar: `تمت إضافة ${urunAdi} إلى قائمة العينات!`
        };
        toast.success(successMessages[lang] || successMessages.de);
    };

    return (
        <div className="group relative block bg-white rounded-lg shadow-md overflow-hidden transform transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
            <Link href={linkHref} className="block">
                <div className="relative w-full aspect-[4/3] overflow-hidden">
                    <Image
                        src={imageUrl}
                        alt={urunAdi}
                        layout="fill"
                        objectFit="cover"
                        className="transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                    <div className="absolute bottom-4 left-4">
                        <p className="text-xs font-semibold text-white uppercase tracking-wider bg-black/30 px-2 py-1 rounded">
                            {kategoriAdi}
                        </p>
                    </div>
                </div>
                <div className="p-4">
                    <h3 className="font-serif text-lg font-semibold text-primary truncate" title={urunAdi}>
                        {urunAdi}
                    </h3>
                </div>
            </Link>
            
            {/* Action Buttons */}
            <div className="px-4 pb-4 flex gap-2">
                {/* Details Button */}
                <Link 
                    href={linkHref}
                    className="flex-1 text-center text-sm font-bold text-white bg-accent px-4 py-2 rounded-full transition-all duration-300 hover:bg-primary"
                >
                    Details ansehen
                </Link>
                
                {/* Sample Button */}
                <button
                    onClick={handleAddToSample}
                    disabled={!unlocked || isInCart}
                    className={`flex items-center justify-center gap-1 px-4 py-2 rounded-full text-sm font-bold transition-all duration-300 ${
                        isInCart
                            ? 'bg-green-100 text-green-700 cursor-default'
                            : unlocked 
                            ? 'bg-primary text-white hover:bg-primary/90 hover:scale-105' 
                            : 'bg-gray-200 text-gray-500 cursor-pointer hover:bg-gray-300'
                    }`}
                    title={isInCart ? (lang === 'de' ? 'In Musterliste' : lang === 'tr' ? 'Listede' : 'In List') : unlocked ? (lang === 'de' ? 'Zum Musterpaket hinzufügen' : lang === 'tr' ? 'Numune listesine ekle' : 'Add to samples') : (lang === 'de' ? 'Kontaktdaten eingeben' : lang === 'tr' ? 'İletişim bilgileri girin' : 'Enter contact details')}
                >
                    {isInCart ? '✓' : unlocked ? <FiShoppingBag className="text-lg" /> : '🔒'}
                    {lang === 'de' ? (isInCart ? 'Hinzugefügt' : unlocked ? 'Muster anfordern' : '🔒') : 
                     lang === 'tr' ? (isInCart ? 'Eklendi' : unlocked ? 'Numune İste' : '🔒') :
                     lang === 'en' ? (isInCart ? 'Added' : unlocked ? 'Request Sample' : '🔒') :
                     (isInCart ? 'تمت الإضافة' : unlocked ? 'اطلب عينة' : '🔒')}
                </button>
            </div>
        </div>
    );
}