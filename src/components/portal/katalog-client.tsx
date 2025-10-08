// src/components/portal/katalog-client.tsx
'use client';

import { useState, useTransition } from "react";
import { Tables } from "@/lib/supabase/database.types";
import Image from "next/image";
import { FiHeart, FiSearch } from "react-icons/fi";
import { toggleFavoriteAction } from "@/app/actions/favoriten-actions";

type UrunMitPreis = Tables<'urunler'> & { personalisierter_preis: number };

// Produktkarte mit Favoriten-Button
const ProduktKarte = ({ urun, isFavorit }: { urun: UrunMitPreis, isFavorit: boolean }) => {
    const [isPending, startTransition] = useTransition();
    const [favoritStatus, setFavoritStatus] = useState(isFavorit);

    const handleToggleFavorite = () => {
        startTransition(async () => {
            await toggleFavoriteAction(urun.id, favoritStatus);
            setFavoritStatus(!favoritStatus);
        });
    };
    
    const formatFiyat = (fiyat: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(fiyat);

    return (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden group">
            <div className="relative w-full h-56">
                <Image src={urun.fotograf_url_listesi?.[0] || '/placeholder.png'} alt={urun.urun_adi} fill className="object-cover"/>
                <button 
                    onClick={handleToggleFavorite}
                    disabled={isPending}
                    className="absolute top-3 right-3 p-2 bg-white/70 rounded-full text-gray-700 hover:text-red-500 backdrop-blur-sm transition-colors"
                >
                    <FiHeart size={20} className={favoritStatus ? "text-red-500 fill-current" : ""} />
                </button>
            </div>
            <div className="p-4">
                <h3 className="font-serif font-bold text-primary truncate">{urun.urun_adi}</h3>
                <p className="text-sm text-gray-500">{urun.kategori}</p>
                <p className="font-sans font-bold text-xl text-accent mt-2">{formatFiyat(urun.personalisierter_preis)}</p>
            </div>
        </div>
    );
};

// Haupt-Client-Komponente
export function KatalogClient({ urunler, favoritenIds: initialFavoritenIds }: { urunler: UrunMitPreis[], favoritenIds: Set<string> }) {
    const [showFavorites, setShowFavorites] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [favoriten, setFavoriten] = useState(initialFavoritenIds);

    const gefilterteUrunler = urunler.filter(urun => {
        const passtZuSuche = urun.urun_adi.toLowerCase().includes(searchTerm.toLowerCase());
        const passtZuFavoriten = !showFavorites || favoriten.has(urun.id);
        return passtZuSuche && passtZuFavoriten;
    });

    return (
        <div className="space-y-8">
            <header>
                <h1 className="font-serif text-4xl font-bold text-primary">Produktkatalog</h1>
                <p className="text-text-main/80 mt-1">Entdecke unser Sortiment und verwalte deine Favoriten.</p>
            </header>
            
            <div className="flex flex-col sm:flex-row gap-4">
                {/* Suchleiste */}
                <div className="relative flex-grow">
                    <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder="Ürün ara..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 p-3 bg-white border border-bg-subtle rounded-lg shadow-sm" />
                </div>
                {/* Favoriten-Toggle */}
                <button onClick={() => setShowFavorites(!showFavorites)} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-colors ${showFavorites ? 'bg-accent text-white' : 'bg-white shadow-sm'}`}>
                    <FiHeart /> Nur Favoriten
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {gefilterteUrunler.map(urun => (
                    <ProduktKarte key={urun.id} urun={urun} isFavorit={favoriten.has(urun.id)} />
                ))}
            </div>
            {gefilterteUrunler.length === 0 && <p className="text-center py-12 text-gray-500">Keine Produkte gefunden.</p>}
        </div>
    );
}