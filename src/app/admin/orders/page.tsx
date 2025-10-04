"use client";

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import { dictionary } from '@/dictionaries/de';
import { getAllOrders, updateOrderStatus, Order, OrderStatus, OrderActionState } from './actions'; 
import { FaTruck, FaSpinner, FaCheckCircle, FaTimesCircle, FaClock, FaBoxOpen } from 'react-icons/fa';

// Deutsche Status-Texte
const STATUS_TEXTS: Record<OrderStatus, string> = {
    pending: 'Ausstehend',
    processing: 'In Bearbeitung',
    shipped: 'Versandt',
    delivered: 'Zugestellt',
    cancelled: 'Storniert',
};

// CSS-Klassen für Status-Farben
const STATUS_COLORS: Record<OrderStatus, string> = {
    pending: 'bg-yellow-100 border-yellow-500 text-yellow-700',
    processing: 'bg-blue-100 border-blue-500 text-blue-700',
    shipped: 'bg-purple-100 border-purple-500 text-purple-700',
    delivered: 'bg-green-100 border-green-500 text-green-700',
    cancelled: 'bg-red-100 border-red-500 text-red-700',
};

// ---------------------------------------------
// HAUPTKOMPONENTE
// ---------------------------------------------
export default function OrderManagementPage() {
    const dict = dictionary;
    const content = dict.adminDashboard;
    
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [isPending, startTransition] = useTransition();
    const [feedback, setFeedback] = useState<OrderActionState | null>(null);

    // Alle Bestellungen abrufen
    const fetchOrders = useCallback(async () => {
        setLoading(true);
        const data = await getAllOrders();
        setOrders(data);
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    // Statusaktualisierung
    const handleStatusChange = (orderId: number, newStatus: OrderStatus) => {
        // Optimistische UI-Aktualisierung
        setOrders(prev => 
            prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o)
        );

        startTransition(async () => {
            setFeedback(null);
            const result = await updateOrderStatus(orderId, newStatus);
            if (!result.success) {
                setFeedback({ type: false, message: `Status-Update Fehler: ${result.message}` });
                fetchOrders(); // Bei Fehler erneut laden
            } else {
                setFeedback({ success: true, message: result.message });
            }
        });
    };
    
    // Feedback-Nachricht automatisch ausblenden
    useEffect(() => {
        if (feedback) {
            const timer = setTimeout(() => setFeedback(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [feedback]);


    if (loading) {
        return (
            <div className="flex justify-center items-center h-full min-h-[500px] text-primary">
                <FaSpinner className="animate-spin mr-2" /> Bestellungen werden geladen...
            </div>
        );
    }

    return (
        <div className="bg-secondary p-8 rounded-lg shadow-lg h-full flex flex-col">
            <header className="flex justify-between items-center mb-6 flex-shrink-0">
                <h1 className="font-serif text-4xl text-primary flex items-center gap-3">
                    <FaTruck className="text-accent"/> {content.sidebar.orders}
                </h1>
            </header>
            
            {/* Feedback Nachricht */}
            {feedback && (
                <div className={`p-4 rounded-md mb-4 flex items-center ${feedback.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {feedback.success ? <FaCheckCircle className="mr-2" /> : <FaTimesCircle className="mr-2" />}
                    {feedback.message}
                </div>
            )}

            {/* Bestell-Liste */}
            <div className="flex-1 min-h-0 overflow-y-auto">
                {orders.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        Keine Bestellungen gefunden.
                    </div>
                ) : (
                    <>
                        {/* MASAÜSTÜ/TABLET GÖRÜNÜMÜ */}
                        <div className="hidden md:block w-full text-left font-sans bg-white rounded-lg shadow-md">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b-2 sticky top-0 bg-white">
                                        <th className="py-3 px-4 uppercase text-sm w-[10%]"># ID</th>
                                        <th className="py-3 px-4 uppercase text-sm w-[30%]">Partner / Firma</th>
                                        <th className="py-3 px-4 uppercase text-sm w-[15%] text-right">Gesamtsumme</th>
                                        <th className="py-3 px-4 uppercase text-sm w-[20%]">Bestellt am</th>
                                        <th className="py-3 px-4 uppercase text-sm w-[25%]">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orders.map((order) => (
                                        <tr key={order.id} className="border-b hover:bg-gray-50">
                                            <td className="py-4 px-4 font-bold text-primary">#{order.id}</td>
                                            <td className="py-4 px-4">{order.partner_company_name}</td>
                                            <td className="py-4 px-4 text-right font-mono text-lg text-accent">€{order.total_amount.toFixed(2)}</td>
                                            <td className="py-4 px-4 text-sm">{new Date(order.created_at).toLocaleDateString('de-DE', { dateStyle: 'medium' })}</td>
                                            
                                            {/* Status Dropdown */}
                                            <td className="py-4 px-4">
                                                <select
                                                    value={order.status}
                                                    onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                                                    disabled={isPending}
                                                    className={`p-2 rounded-md border text-sm transition-colors ${STATUS_COLORS[order.status]}`}
                                                >
                                                    {Object.keys(STATUS_TEXTS).map(key => (
                                                        <option key={key} value={key}>
                                                            {STATUS_TEXTS[key as OrderStatus]}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* MOBİL GÖRÜNÜMÜ */}
                        <div className="grid grid-cols-1 gap-4 md:hidden">
                            {orders.map((order) => (
                                <div key={order.id} className="bg-white p-4 rounded-lg shadow space-y-2 border-l-4 border-accent">
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-bold text-lg text-primary">Bestellung #{order.id}</h3>
                                        <span className="font-serif font-bold text-xl text-accent">€{order.total_amount.toFixed(2)}</span>
                                    </div>
                                    <p className="text-sm text-gray-600">
                                        <span className="font-semibold">Firma:</span> {order.partner_company_name}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        <span className="font-semibold">Datum:</span> {new Date(order.created_at).toLocaleDateString('de-DE', { dateStyle: 'medium' })}
                                    </p>
                                    
                                    {/* Status Dropdown (Mobil) */}
                                    <div>
                                        <span className="font-semibold text-sm block mb-1">Status:</span>
                                        <select
                                            value={order.status}
                                            onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                                            disabled={isPending}
                                            className={`p-2 rounded-md border text-sm transition-colors w-full ${STATUS_COLORS[order.status]}`}
                                        >
                                            {Object.keys(STATUS_TEXTS).map(key => (
                                                <option key={key} value={key}>
                                                    {STATUS_TEXTS[key as OrderStatus]}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}