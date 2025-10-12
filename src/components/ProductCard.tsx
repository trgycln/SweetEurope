'use client';

import Image from 'next/image';
import Link from 'next/link';
import { getLocalizedName } from '@/lib/utils';
import { Tables } from '@/lib-supabase/database.types';

type ProductCardProps = {
    urun: Tables<'urunler'> & { kategoriler: { ad: any } | null };
    lang: 'de' | 'tr' | 'en' | 'ar';
    linkHref: string;
};

export default function ProductCard({ urun, lang, linkHref }: ProductCardProps) {
    const urunAdi = getLocalizedName(urun.urun_adi, lang);
    const kategoriAdi = urun.kategoriler ? getLocalizedName(urun.kategoriler.ad, lang) : '';
    const imageUrl = (urun.fotograf_url_listesi && urun.fotograf_url_listesi.length > 0) 
        ? urun.fotograf_url_listesi[0] 
        : '/placeholder.jpg'; // Varsayılan bir görsel yolu

    return (
        <Link href={linkHref} passHref>
            <div className="group block bg-white rounded-lg shadow-md overflow-hidden transform transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
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
                    <div className="mt-4 flex justify-center items-center">
                        <span className="text-sm font-bold text-white bg-accent px-6 py-2 rounded-full transition-all duration-300 group-hover:bg-primary">
                            Details ansehen
                        </span>
                    </div>
                </div>
            </div>
        </Link>
    );
}