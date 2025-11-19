// src/app/[locale]/admin/operasyon/numune-talepleri/page.tsx
// Yeni sample_requests tablosu ile

import React from 'react';
import CancelSampleRequestButton from '@/components/admin/CancelSampleRequestButton';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import Link from 'next/link';
import { FiPackage, FiCheckCircle, FiTruck, FiXCircle, FiClock } from 'react-icons/fi';
import { unstable_noStore as noStore } from 'next/cache';

export const dynamic = 'force-dynamic';

type SampleRequestRow = {
    id: string;
    waitlist_id: string;
    note: string | null;
    status: string;
    created_at: string;
    updated_at: string;
    waitlist: {
        firma_adi: string;
        yetkili_kisi: string;
        email: string;
    } | null;
    sample_request_items: Array<{
        id: string;
        product_id: string;
        quantity: number;
        urunler: {
            urun_adi: any;
            slug: string | null;
        } | null;
    }>;
};

const STATUS_CONFIG = {
    'beklemede': { label: 'Beklemede', icon: FiClock, color: 'bg-yellow-100 text-yellow-700' },
    'gorusuldu': { label: 'Görüşüldü', icon: FiCheckCircle, color: 'bg-blue-100 text-blue-700' },
    'gonderildi': { label: 'Gönderildi', icon: FiTruck, color: 'bg-green-100 text-green-700' },
    'iptal': { label: 'İptal', icon: FiXCircle, color: 'bg-red-100 text-red-700' },
};

export default async function NumuneTalepleriPage({ params }: { params: { locale: string } }) {
    noStore();
    
    const supabase = createSupabaseServiceClient();

    // Verileri çek
    const { data: requests, error } = await supabase
        .from('sample_requests')
        .select(`
            *,
            waitlist (
                firma_adi,
                yetkili_kisi,
                email
            ),
            sample_request_items (
                id,
                product_id,
                quantity,
                urunler (
                    ad,
                    slug
                )
            )
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error loading sample requests:', error?.message || error);
        return <div className="p-6 text-red-500">Fehler beim Laden der Anfragen</div>;
    }

    const requestList = (requests || []) as unknown as SampleRequestRow[];

    const formatDate = (dateStr: string): string => {
        return new Date(dateStr).toLocaleDateString('de-DE', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getProductName = (nameJson: any): string => {
        if (!nameJson || typeof nameJson !== 'object') return 'Unbekannt';
        return nameJson.de || nameJson.tr || nameJson.en || Object.values(nameJson)[0] || 'Unbekannt';
    };

    return (
        <main className="space-y-8">
            <header>
                <h1 className="font-serif text-4xl font-bold text-primary">Numune Talepleri</h1>
                <p className="text-gray-600 mt-1">{requestList.length} talep bulundu</p>
            </header>

            {requestList.length === 0 ? (
                <div className="mt-12 text-center p-10 border-2 border-dashed border-gray-200 rounded-lg bg-white">
                    <FiPackage className="mx-auto text-5xl text-gray-300 mb-4" />
                    <h2 className="font-serif text-2xl font-semibold text-primary">Henüz talep yok</h2>
                </div>
            ) : (
                <div className="space-y-4">
                    {requestList.map((req) => {
                        const statusConfig = STATUS_CONFIG[req.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.beklemede;
                        const StatusIcon = statusConfig.icon;
                        
                        return (
                            <div key={req.id} className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="font-bold text-lg text-primary">
                                                {req.waitlist?.firma_adi || 'Bilinmeyen Firma'}
                                            </h3>
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full ${statusConfig.color}`}>
                                                <StatusIcon size={14} /> {statusConfig.label}
                                            </span>
                                        </div>
                                        <div className="text-sm text-gray-600 space-y-1">
                                            <p><span className="font-semibold">Yetkili:</span> {req.waitlist?.yetkili_kisi}</p>
                                            <p><span className="font-semibold">E-mail:</span> {req.waitlist?.email}</p>
                                            <p><span className="font-semibold">Tarih:</span> {formatDate(req.created_at)}</p>
                                            {req.note && (
                                                <p className="mt-2 text-gray-700 italic"><span className="font-semibold">Not:</span> {req.note}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Ürün Listesi */}
                                <div className="mt-4 border-t pt-4">
                                    <h4 className="font-semibold text-sm text-gray-700 mb-2">İstenen Ürünler:</h4>
                                    <div className="space-y-2">
                                        {req.sample_request_items.map((item) => (
                                            <div key={item.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                                                <span className="text-accent font-bold text-sm">{item.quantity}x</span>
                                                <span className="text-gray-800 font-medium flex-1">
                                                    {getProductName(item.urunler?.ad)}
                                                </span>
                                                {item.urunler?.slug && (
                                                    <Link
                                                        href={`/de/products/${item.urunler.slug}`}
                                                        className="text-xs text-blue-600 hover:underline"
                                                        target="_blank"
                                                    >
                                                        Ürüne git →
                                                    </Link>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Durum Güncelleme Butonları */}
                                {req.status === 'beklemede' && (
                                    <div className="mt-4 flex gap-2">
                                        <form action={`/api/admin/update-sample-status`} method="POST" className="inline">
                                            <input type="hidden" name="request_id" value={req.id} />
                                            <input type="hidden" name="status" value="gorusuldu" />
                                            <button
                                                type="submit"
                                                className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-semibold text-sm transition-colors"
                                            >
                                                ✓ Görüşüldü
                                            </button>
                                        </form>
                                        <CancelSampleRequestButton requestId={req.id} locale={params.locale} />
                                    </div>
                                )}
                                {req.status === 'gorusuldu' && (
                                    <div className="mt-4">
                                        <form action={`/api/admin/update-sample-status`} method="POST" className="inline">
                                            <input type="hidden" name="request_id" value={req.id} />
                                            <input type="hidden" name="status" value="gonderildi" />
                                            <button 
                                                type="submit"
                                                className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 font-semibold text-sm transition-colors"
                                            >
                                                ✓ Gönderildi Olarak İşaretle
                                            </button>
                                        </form>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </main>
    );
}
