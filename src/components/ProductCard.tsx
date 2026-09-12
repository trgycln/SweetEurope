'use client';

import Image from 'next/image';
import Link from 'next/link';
import { getLocalizedName } from '@/lib/utils';
import { Tables } from '@/lib/supabase/database.types';
import { FiShoppingBag } from 'react-icons/fi';
import { toast } from 'sonner';
import { ProductDietaryBadges } from '@/components/DietaryStickers';
import { motion, useMotionTemplate, useMotionValue, useSpring } from 'framer-motion';
import { scaleUpHover, EASE_PREMIUM, glowHover } from '@/components/ui/motion-variants';

// Mock useLeadGate since context is missing in this file (but expected by existing code)
const useLeadGate = () => ({ mounted: true, unlocked: true, openLeadModal: () => {}, addToCart: (item: any) => {}, cart: [] as any[] });

type ProductCardProps = {
    urun: Tables<'urunler'> & { kategoriler: { ad: any } | null };
    lang: 'de' | 'tr' | 'en' | 'ar';
    linkHref: string;
};

// Aroma renk eşleştirici (Glow efekti için)
const getAromaGlowColor = (geschmack: any) => {
    const str = String(geschmack || '').toLowerCase();
    if (str.includes('mango') || str.includes('pfirsich') || str.includes('peach')) return 'rgba(255, 165, 0, 0.4)';
    if (str.includes('erdbeere') || str.includes('strawberry') || str.includes('kirsche') || str.includes('grenadine') || str.includes('wassermelone')) return 'rgba(255, 60, 80, 0.4)';
    if (str.includes('schoko') || str.includes('caramel') || str.includes('karamell') || str.includes('haselnuss')) return 'rgba(139, 69, 19, 0.4)';
    if (str.includes('minze') || str.includes('mint') || str.includes('apfel') || str.includes('kiwi') || str.includes('pistazie')) return 'rgba(50, 205, 50, 0.4)';
    if (str.includes('blue')) return 'rgba(0, 191, 255, 0.4)';
    if (str.includes('vanille') || str.includes('weiße') || str.includes('kokos')) return 'rgba(255, 255, 200, 0.4)';
    return 'rgba(255, 255, 255, 0.2)'; // Varsayılan nötr parlama
};

export default function ProductCard({ urun, lang, linkHref }: ProductCardProps) {
    const urunAdi = getLocalizedName(urun.ad as any, lang);
    const kategoriAdi = urun.kategoriler ? getLocalizedName(urun.kategoriler.ad, lang) : '';
    const imageUrl = urun.ana_resim_url ? urun.ana_resim_url : '/placeholder.jpg';
    
    // Aroma bilgisini al (teknik özelliklerden)
    const aroma = (urun.teknik_ozellikler as any)?.geschmack || '';
    const glowColor = getAromaGlowColor(aroma);

    const { mounted, unlocked, openLeadModal, addToCart, cart } = useLeadGate();
    const isInCart = mounted && cart.some(item => item.product_id === urun.id);

    // --- 3D Tilt Animasyon Mantığı ---
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    
    const mouseXSpring = useSpring(x, { stiffness: 300, damping: 30, mass: 0.5 });
    const mouseYSpring = useSpring(y, { stiffness: 300, damping: 30, mass: 0.5 });
    
    const rotateX = useMotionTemplate`${mouseYSpring}deg`;
    const rotateY = useMotionTemplate`${mouseXSpring}deg`;

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const xPct = mouseX / width - 0.5;
        const yPct = mouseY / height - 0.5;
        x.set(xPct * 12); // Max 12 degree tilt
        y.set(yPct * -12);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };

    const handleAddToSample = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (!unlocked) {
            toast.info(lang === 'tr' ? 'Lütfen önce iletişim bilgilerinizi girin.' : 'Bitte geben Sie Ihre Kontaktdaten ein.');
            openLeadModal();
            return;
        }

        if (isInCart) {
            toast.info(lang === 'tr' ? 'Zaten listede!' : 'Bereits in der Liste!');
            return;
        }

        addToCart({
            product_id: urun.id,
            name: urunAdi,
            slug: urun.slug || '',
            image_url: imageUrl,
        });
        
        toast.success(lang === 'tr' ? `${urunAdi} eklendi!` : `${urunAdi} hinzugefügt!`);
    };

    return (
        <motion.div
            style={{
                transformStyle: "preserve-3d",
                rotateX,
                rotateY,
            }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            whileHover={glowHover(glowColor)}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6, ease: EASE_PREMIUM }}
            className="group relative flex flex-col bg-white/40 backdrop-blur-2xl border border-white/60 rounded-2xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-full"
        >
            {/* Işık Hüzmesi (Arka Plan) */}
            <div 
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                style={{
                    background: `radial-gradient(circle at 50% 0%, ${glowColor}, transparent 70%)`
                }}
            />

            <Link href={linkHref} className="flex-1 flex flex-col z-10 block" style={{ transform: "translateZ(30px)" }}>
                {/* Resim Alanı */}
                <div className="relative w-full aspect-[4/3] overflow-hidden rounded-t-2xl bg-white/20">
                    <motion.div 
                        className="w-full h-full"
                        variants={{ hover: { scale: 1.08 } }}
                        transition={{ duration: 0.6, ease: EASE_PREMIUM }}
                    >
                        <Image
                            src={imageUrl}
                            alt={urunAdi}
                            layout="fill"
                            objectFit="cover"
                            className="drop-shadow-lg"
                            unoptimized
                        />
                    </motion.div>
                    <div className="absolute top-4 left-4">
                        <p className="text-[10px] font-bold text-white uppercase tracking-wider bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 shadow-sm">
                            {kategoriAdi}
                        </p>
                    </div>
                </div>
                
                {/* İçerik Alanı */}
                <div className="p-5 space-y-3 flex-1 flex flex-col">
                    <h3 className="font-sans text-base font-bold text-slate-800 line-clamp-2 leading-tight" title={urunAdi}>
                        {urunAdi}
                    </h3>

                    {/* Dietary / Feature Badges */}
                    <div className="mt-auto pt-2">
                        <ProductDietaryBadges
                            teknikOzellikler={urun.teknik_ozellikler as any}
                            zertifikate={urun.zertifikate}
                            size="sm"
                        />
                    </div>
                </div>
            </Link>
            
            {/* Butonlar Alanı */}
            <div className="px-5 pb-5 flex gap-2 z-10" style={{ transform: "translateZ(40px)" }}>
                <Link 
                    href={linkHref}
                    className="flex-1 flex items-center justify-center text-xs font-bold text-slate-700 bg-white/50 backdrop-blur-sm border border-slate-200 px-4 py-2.5 rounded-xl transition-all duration-300 hover:bg-white hover:shadow-md hover:text-indigo-600"
                >
                    {lang === 'tr' ? 'İncele' : 'Details'}
                </Link>
                
                <button
                    onClick={handleAddToSample}
                    disabled={!unlocked || isInCart}
                    className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 shadow-sm ${
                        isInCart
                            ? 'bg-emerald-100/80 text-emerald-700 border border-emerald-200 cursor-default'
                            : unlocked 
                            ? 'bg-indigo-600 text-white hover:bg-indigo-500 hover:shadow-indigo-500/30 hover:shadow-lg' 
                            : 'bg-slate-100 text-slate-400 cursor-pointer border border-slate-200 hover:bg-slate-200'
                    }`}
                >
                    {isInCart ? '✓' : unlocked ? <FiShoppingBag className="text-sm" /> : '🔒'}
                </button>
            </div>
        </motion.div>
    );
}