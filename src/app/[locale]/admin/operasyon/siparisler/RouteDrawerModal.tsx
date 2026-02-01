'use client';

import React, { useEffect, useState } from 'react';
import { FiX, FiMapPin, FiExternalLink, FiLoader } from 'react-icons/fi';

interface Firma {
    id: string;
    unvan: string | null;
    adres?: string | null;
    sehir?: string | null;
    ilce?: string | null;
    posta_kodu?: string | null;
    google_maps_url?: string | null;
}

interface RouteDrawerModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedOrderIds: string[];
    locale: string;
}

export default function RouteDrawerModal({
    isOpen,
    onClose,
    selectedOrderIds,
    locale
}: RouteDrawerModalProps) {
    const [firmas, setFirmas] = useState<Firma[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && selectedOrderIds.length > 0) {
            fetchFirmasForSelectedOrders();
        }
    }, [isOpen, selectedOrderIds]);

    const fetchFirmasForSelectedOrders = async () => {
        setLoading(true);
        setError(null);
        try {
            console.log('Fetching firmas for order IDs:', selectedOrderIds);
            
            const response = await fetch(
                `/api/admin/operasyon/siparisler/get-firmalar`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ selectedOrderIds })
                }
            );

            const responseText = await response.text();
            console.log('API Response:', responseText);

            if (!response.ok) {
                throw new Error(`API Error: ${response.status} - ${responseText}`);
            }

            const data = JSON.parse(responseText);
            console.log('Parsed data:', data);
            console.log('First firma:', data.firmas?.[0]);
            
            // Deduplicate by firma_id
            const uniqueFirmas = Array.from(
                new Map((data.firmas as Firma[]).map((f: Firma) => [f.id, f])).values()
            );
            console.log('Unique firmas:', uniqueFirmas);
            console.log('Firma google_maps_urls:', uniqueFirmas.map((f: Firma) => ({ unvan: f.unvan, url: f.google_maps_url })));
            
            setFirmas(uniqueFirmas as Firma[]);
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Bilinmeyen hata';
            console.error('Error fetching firmas:', err);
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-200">
                    <div>
                        <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
                            <FiMapPin /> Gözergah Oluştur
                        </h2>
                        {firmas.length > 0 && (
                            <p className="text-sm text-gray-600 mt-1">
                                {firmas.length} firma - "Gözergah Oluştur" butonuna tıkla
                            </p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <FiX size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-40">
                            <FiLoader className="animate-spin text-primary mb-2" size={32} />
                            <p className="text-gray-600">Haritalar yükleniyor...</p>
                        </div>
                    ) : error ? (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <p className="text-red-800 font-semibold">Hata</p>
                            <p className="text-red-700 text-sm mt-2 font-mono text-xs">{error}</p>
                        </div>
                    ) : firmas.length === 0 ? (
                        <div className="text-center text-gray-500 py-12">
                            <FiMapPin size={48} className="mx-auto opacity-30 mb-2" />
                            <p>Firma bilgisi bulunamadı</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {firmas.map((firma) => {
                                const address = [
                                    firma.adres,
                                    firma.ilce,
                                    firma.sehir,
                                    firma.posta_kodu
                                ]
                                    .filter(Boolean)
                                    .join(', ');

                                return (
                                    <div
                                        key={firma.id}
                                        className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="flex justify-between items-start gap-3">
                                            <div className="flex-1">
                                                <h3 className="font-semibold text-gray-900 mb-1">
                                                    {firma.unvan || 'Bilinmiyor'}
                                                </h3>
                                                {address && (
                                                    <p className="text-sm text-gray-600 mb-2">
                                                        📍 {address}
                                                    </p>
                                                )}
                                            </div>
                                            {firma.google_maps_url && (
                                                <a
                                                    href={firma.google_maps_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium whitespace-nowrap"
                                                >
                                                    <FiExternalLink size={16} />
                                                    Aç
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 p-6 flex gap-3 justify-end">
                    {firmas.length > 0 && (
                        <button
                            onClick={() => {
                                if (firmas.length === 0) return;

                                // Prepare addresses for Google Maps directions
                                const addresses = firmas
                                    .map(f => {
                                        const addr = [f.adres, f.ilce, f.sehir, f.posta_kodu]
                                            .filter(Boolean)
                                            .join(', ');
                                        return addr || f.unvan || '';
                                    })
                                    .filter(Boolean);

                                if (addresses.length === 0) {
                                    alert('Adres bilgisi bulunamadı');
                                    return;
                                }

                                // Build Google Maps directions URL
                                // Format: https://www.google.com/maps/dir/?api=1&origin=START&destination=END&waypoints=WAY1|WAY2|...
                                let mapsUrl = 'https://www.google.com/maps/dir/?api=1';

                                // Set origin (first address)
                                mapsUrl += `&origin=${encodeURIComponent(addresses[0])}`;

                                // Set destination (last address)
                                mapsUrl += `&destination=${encodeURIComponent(addresses[addresses.length - 1])}`;

                                // Add waypoints (middle addresses)
                                if (addresses.length > 2) {
                                    const waypoints = addresses.slice(1, -1).join('|');
                                    mapsUrl += `&waypoints=${encodeURIComponent(waypoints)}`;
                                }

                                console.log('Opening route URL:', mapsUrl);
                                window.open(mapsUrl, '_blank');
                            }}
                            className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors font-medium"
                        >
                            🗺️ Gözergah Oluştur ({firmas.length})
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                    >
                        Kapat
                    </button>
                </div>
            </div>
        </div>
    );
}
