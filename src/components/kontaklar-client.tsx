// src/components/kontaklar-client.tsx
'use client';

import React, { useState } from 'react';
import { Tables } from '@/lib/supabase/database.types';
import { FiPlus, FiBox, FiPhone, FiMail, FiGlobe } from 'react-icons/fi';

type Tedarikci = Tables<'tedarikciler'>;
type Kontak = Tables<'dis_kontaklar'>;

type Props = {
    initialTedarikciler: Tedarikci[];
    initialKontaklar: Kontak[];
};

export function KontaklarClient({ initialTedarikciler, initialKontaklar }: Props) {
    const [activeTab, setActiveTab] = useState<'tedarikciler' | 'kontaklar'>('tedarikciler');

    return (
        <div className="space-y-8">
            <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="font-serif text-4xl font-bold text-primary">Tedarikçi ve Kontak Yönetimi</h1>
                    <p className="text-text-main/80 mt-1">Tüm harici iş ortaklarınızı buradan yönetin.</p>
                </div>
                <button className="flex items-center justify-center gap-2 px-5 py-3 bg-accent text-white rounded-lg shadow-md hover:bg-opacity-90 font-bold text-sm w-full sm:w-auto">
                    <FiPlus size={18} />
                    {activeTab === 'tedarikciler' ? 'Yeni Tedarikçi Ekle' : 'Yeni Kontak Ekle'}
                </button>
            </header>

            {/* Sekme (Tab) Navigasyonu */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('tedarikciler')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'tedarikciler' ? 'border-accent text-accent' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        Tedarikçiler ({initialTedarikciler.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('kontaklar')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'kontaklar' ? 'border-accent text-accent' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        Harici Servisler ({initialKontaklar.length})
                    </button>
                </nav>
            </div>

            {/* Liste İçeriği */}
            <div className="bg-white p-6 rounded-2xl shadow-lg">
                {activeTab === 'tedarikciler' && (
                    <div>
                        <h2 className="font-serif text-2xl font-bold text-primary mb-4">Tedarikçi Listesi</h2>
                        {initialTedarikciler.length > 0 ? (
                            <ul className="divide-y divide-gray-200">
                                {initialTedarikciler.map(t => (
                                    <li key={t.id} className="py-4 flex justify-between items-center">
                                        <div>
                                            <p className="font-bold text-primary">{t.ad}</p>
                                            <p className="text-sm text-gray-500">{t.iletisim_kisi}</p>
                                        </div>
                                        <div className="text-sm text-gray-600 hidden sm:block">{t.telefon}</div>
                                        {/* TODO: Düzenle/Sil butonları eklenecek */}
                                    </li>
                                ))}
                            </ul>
                        ) : <p className="text-center py-8 text-gray-500">Henüz tedarikçi eklenmemiş.</p>}
                    </div>
                )}
                {activeTab === 'kontaklar' && (
                     <div>
                        <h2 className="font-serif text-2xl font-bold text-primary mb-4">Harici Servisler Listesi</h2>
                        {initialKontaklar.length > 0 ? (
                            <ul className="divide-y divide-gray-200">
                                {initialKontaklar.map(k => (
                                    <li key={k.id} className="py-4 flex justify-between items-center">
                                        <div>
                                            <p className="font-bold text-primary">{k.kurum_adi}</p>
                                            <p className="text-sm text-gray-500">{k.aciklama}</p>
                                        </div>
                                        <div className="text-sm text-gray-600 hidden sm:block">{k.telefon}</div>
                                        {/* TODO: Düzenle/Sil butonları eklenecek */}
                                    </li>
                                ))}
                            </ul>
                        ) : <p className="text-center py-8 text-gray-500">Henüz harici servis eklenmemiş.</p>}
                    </div>
                )}
            </div>
        </div>
    );
}