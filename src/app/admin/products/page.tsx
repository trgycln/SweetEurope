"use client";

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import Image from 'next/image';
import { dictionary } from '@/dictionaries/de';
import { getAllProducts, deleteProduct, Product, SaveProductState } from './actions'; 
import { FaBoxOpen, FaSpinner, FaCheckCircle, FaTimesCircle, FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import Modal from '@/components/Modal'; // Ihre allgemeine Modal-Komponente
import ProductForm from './ProductForm'; // Die neue useFormState-basierte Form
import { createClient } from '@/lib/supabase/client'; // Behalten Sie den Client nur für Realtime bei, falls gewünscht

// ---------------------------------------------
// HAUPTKOMPONENTE
// ---------------------------------------------
export default function AdminProductsPage() {
    const dict = dictionary;
    const content = dict.adminDashboard;
    const supabase = createClient(); // Nur für Realtime-Channel beibehalten

    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [isPending, startTransition] = useTransition();
    const [feedback, setFeedback] = useState<SaveProductState | null>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null); 
    const [isAdding, setIsAdding] = useState(false); 

    // Alle Produktdaten abrufen (Verwendet nun die Server Action)
    const fetchProducts = useCallback(async () => {
        setLoading(true);
        // ACHTUNG: Verwenden Sie hier die Server Action 'getAllProducts', NICHT den Client!
        const data = await getAllProducts(); 
        setProducts(data);
        setLoading(false);
    }, []);

    // **REALTIME HINZUGEFÜGT:** Behalten Sie Ihre Realtime-Logik bei
    useEffect(() => {
        const channel = supabase.channel('realtime products').on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => { 
            // Bei jeder Änderung, laden wir die Daten über die Server Action neu
            fetchProducts(); 
        }).subscribe();

        fetchProducts();

        return () => { supabase.removeChannel(channel); };
    }, [supabase, fetchProducts]);
    
    // Modal-Funktionen
    const openFormModal = (product: Product | null) => {
        if (product) {
            setEditingProduct(product);
            setIsAdding(false);
        } else {
            setEditingProduct(null);
            setIsAdding(true);
        }
        setIsModalOpen(true);
    };

    const closeFormModal = () => {
        setIsModalOpen(false);
        setEditingProduct(null);
        setIsAdding(false);
    };

    // Callback nach Speichern/Löschen (wird von ProductForm aufgerufen)
    const handleActionComplete = (result: SaveProductState) => {
        setFeedback(result);
        if (result.success) {
            closeFormModal();
            // Die Realtime-Funktion kümmert sich um fetchProducts()
        }
    };
    
    // Produkt Löschen (Verwendet nun die Server Action)
    const handleDeleteProduct = (product: Product) => {
        if (!confirm(content.productsPage.deleteConfirmation.replace('{productName}', product.name_de))) {
            return;
        }

        startTransition(async () => {
            setFeedback(null);
            const result = await deleteProduct(product.id);
            
            setFeedback(result);
            // Die Realtime-Funktion kümmert sich um fetchProducts()
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
                <FaSpinner className="animate-spin mr-2" /> {content.dashboardPage.loading}
            </div>
        );
    }

    return (
        <div className="bg-secondary p-8 rounded-lg shadow-lg h-full flex flex-col">
            <header className="flex justify-between items-center mb-6 flex-shrink-0">
                <h1 className="font-serif text-4xl text-primary flex items-center gap-3">
                    <FaBoxOpen className="text-accent"/> {content.sidebar.products}
                </h1>
                <button 
                    onClick={() => openFormModal(null)}
                    className="bg-accent text-primary hover:bg-opacity-80 transition-colors p-3 rounded-md font-bold flex items-center gap-2"
                >
                    <FaPlus /> {content.productsPage.addProduct}
                </button>
            </header>
            
            {/* Feedback Nachricht */}
            {feedback && (
                <div className={`p-4 rounded-md mb-4 flex items-center ${feedback.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {feedback.success ? <FaCheckCircle className="mr-2" /> : <FaTimesCircle className="mr-2" />}
                    {feedback.message}
                </div>
            )}

            {/* Produkttabelle (Tailwind-Version, Mobil-freundlich) */}
            <div className="flex-1 min-h-0 overflow-y-auto">
                {/* MASAÜSTÜ/TABLET GÖRÜNÜMÜ */}
                <div className="hidden md:block w-full text-left font-sans bg-white rounded-lg shadow-md">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b-2 sticky top-0 bg-white">
                                <th className="py-3 px-4 uppercase text-sm w-[5%]">Bild</th>
                                <th className="py-3 px-4 uppercase text-sm w-[20%]">Name</th>
                                <th className="py-3 px-4 uppercase text-sm w-[15%]">Kategorie</th>
                                <th className="py-3 px-4 uppercase text-sm w-[10%] text-right">Preis</th>
                                <th className="py-3 px-4 uppercase text-sm w-[10%] text-right">Lagerbestand</th>
                                <th className="py-3 px-4 uppercase text-sm w-[10%] text-center">Aktiv</th>
                                <th className="py-3 px-4 uppercase text-sm w-[10%] text-right">Aktionen</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-8 text-gray-500">
                                        Keine Produkte gefunden.
                                    </td>
                                </tr>
                            ) : (
                                products.map((product) => (
                                    <tr key={product.id} className="border-b hover:bg-gray-50">
                                        <td className="py-2 px-4">
                                            {product.image_url ? (
                                                <div className="relative w-12 h-12 rounded-lg overflow-hidden border">
                                                    <Image 
                                                        src={product.image_url} 
                                                        alt={product.name_de} 
                                                        fill 
                                                        style={{objectFit: 'cover'}}
                                                        sizes="50px"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center text-xs text-gray-500">
                                                    N/A
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-4 px-4 font-bold text-primary">{product.name_de}</td>
                                        <td className="py-4 px-4">{product.category_de || '-'}</td>
                                        <td className="py-4 px-4 text-right font-mono text-sm">€{product.price.toFixed(2)}</td>
                                        <td className="py-4 px-4 text-right text-sm">{product.stock_quantity}</td>
                                        <td className="py-4 px-4 text-center">
                                            <div className={`w-4 h-4 rounded-full mx-auto ${product.is_active ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                        </td>
                                        <td className="py-4 px-4 text-right">
                                            <button onClick={() => openFormModal(product)} className="text-blue-500 hover:text-blue-700 mr-3" title="Bearbeiten"><FaEdit /></button>
                                            <button onClick={() => handleDeleteProduct(product)} disabled={isPending} className="text-red-500 hover:text-red-700" title="Löschen"><FaTrash /></button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* MOBİL GÖRÜNÜMÜ */}
                <div className="grid grid-cols-1 gap-4 md:hidden">
                    {products.length === 0 ? (
                        <p className="text-center py-8 text-gray-500">Keine Produkte gefunden.</p>
                    ) : (
                        products.map(product => (
                            <div key={product.id} className="border rounded-lg p-4 space-y-2 shadow border-l-4 border-accent">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center">
                                        {product.image_url && (
                                            <div className="relative w-10 h-10 rounded-full overflow-hidden mr-2 flex-shrink-0">
                                                <Image src={product.image_url} alt={product.name_de} fill style={{objectFit: 'cover'}} sizes="40px" />
                                            </div>
                                        )}
                                        <span className="font-bold text-primary pr-2">{product.name_de}</span>
                                    </div>
                                    <span className="font-serif font-bold text-accent whitespace-nowrap">€{product.price.toFixed(2)}</span>
                                </div>
                                <div className="text-sm text-gray-600 space-y-1">
                                    <p>Kategorie: {product.category_de}</p>
                                    <p>Lager: {product.stock_quantity}</p>
                                    <p>Status: <span className={`font-semibold ${product.is_active ? 'text-green-600' : 'text-red-600'}`}>{product.is_active ? 'Aktiv' : 'Inaktiv'}</span></p>
                                </div>
                                <div className="flex gap-2 pt-2 border-t mt-2">
                                    <button onClick={() => openFormModal(product)} className="text-blue-500 hover:text-blue-700" title="Bearbeiten"><FaEdit /></button>
                                    <button onClick={() => handleDeleteProduct(product)} disabled={isPending} className="text-red-500 hover:text-red-700" title="Löschen"><FaTrash /></button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
            
            {/* Hinzufügen/Bearbeiten Modal (Verwendet Ihre zentrale Modal-Komponente) */}
            <Modal 
                isOpen={isModalOpen} 
                onClose={closeFormModal} 
                title={isAdding ? "Neues Produkt Hinzufügen" : `Produkt ${editingProduct?.name_de} Bearbeiten`}
            >
                {/* ProductForm verwendet useFormState, um Aktionen auszuführen */}
                <ProductForm 
                    product={editingProduct} 
                    onActionComplete={handleActionComplete}
                    onClose={closeFormModal}
                />
            </Modal>
        </div>
    );
}