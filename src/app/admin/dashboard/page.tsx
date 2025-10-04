// src/app/admin/dashboard/page.tsx
import React from 'react';
import { dictionary } from '@/dictionaries/de';
import { FaEuroSign, FaUsers, FaBoxOpen, FaClock } from 'react-icons/fa';

// Server Actions Imports
// 1. Umsatz- und Bestelldaten
import { getMonthlyRevenueData } from '../orders/actions'; 
// 2. Partner-Status-Daten
import { getPartnerStatusCounts } from '../applications/actions'; 
// 3. Gesamtzahl der Produkte (Angenommen, Sie haben diese Funktion in products/actions.ts)
import { getAllProducts } from '../products/actions'; 

// Client Components - ACHTUNG: Stellen Sie sicher, dass diese Dateien existieren!
import { AdminRevenueChart, PartnerStatusChartCard } from './AdminCharts'; 
import { AdminStatCard } from './AdminStatCard'; 

// ---------------------------------------------
// HELPER FUNKTIONEN (FÜR STATISTIKEN)
// ---------------------------------------------

/**
 * Ruft alle Daten für das Dashboard parallel ab.
 */
async function getDashboardData() {
    // Paralleles Daten-Fetching für beste Performance
    const [revenueData, statusCounts, products] = await Promise.all([
        getMonthlyRevenueData(),
        getPartnerStatusCounts(),
        // Stellen Sie sicher, dass getAllProducts eine Liste von Objekten zurückgibt
        getAllProducts(), 
    ]);

    // Berechne Metriken
    const totalRevenue = revenueData.reduce((sum, item) => sum + item.total_revenue, 0);
    const totalPartners = statusCounts.reduce((sum, item) => sum + item.count, 0);
    // Wir nehmen an, dass products ein Array ist
    const totalProducts = products.length; 

    return {
        revenueData,
        statusCounts,
        totalRevenue,
        totalPartners,
        totalProducts,
    };
}


// ---------------------------------------------
// HAUPTKOMPONENTE (SERVER COMPONENT)
// ---------------------------------------------
export default async function AdminDashboardPage() {
    const dict = dictionary;
    const content = dict.adminDashboard;
    
    try {
        // Datenabruf
        const data = await getDashboardData();
        const currentMonthRevenue = data.revenueData.length > 0 ? data.revenueData[data.revenueData.length - 1].total_revenue : 0;
        const pendingPartners = data.statusCounts.find(s => s.status === 'pending')?.count || 0;
        
        return (
            <div className="p-8 space-y-8">
                <h1 className="font-serif text-4xl text-primary">{content.dashboardPage.title}</h1>
                
                {/* 1. OBERE STATISTIK-KACHELN */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <AdminStatCard 
                        title={content.dashboardPage.totalRevenue}
                        value={`€${data.totalRevenue.toFixed(2)}`}
                        // KORREKTUR: Icon als JSX-Element übergeben
                        icon={<FaEuroSign />} 
                        description="Gesamtumsatz seit Beginn"
                        color="bg-primary text-secondary"
                    />
                    <AdminStatCard 
                        title={content.dashboardPage.currentMonthRevenue}
                        value={`€${currentMonthRevenue.toFixed(2)}`}
                        // KORREKTUR: Icon als JSX-Element übergeben
                        icon={<FaEuroSign />}
                        description="Umsatz im letzten Monat"
                        color="bg-accent text-primary"
                    />
                    <AdminStatCard 
                        title={content.dashboardPage.totalPartners}
                        value={data.totalPartners.toString()}
                        // KORREKTUR: Icon als JSX-Element übergeben
                        icon={<FaUsers />}
                        description="Gesamtzahl registrierter Partner"
                        color="bg-secondary text-primary border-2 border-primary"
                    />
                    <AdminStatCard 
                        title={content.dashboardPage.pendingApplications}
                        value={pendingPartners.toString()}
                        // KORREKTUR: Icon als JSX-Element übergeben
                        icon={<FaClock />}
                        description="Ausstehende Partner-Bewerbungen"
                        color="bg-yellow-100 text-yellow-700"
                    />
                </div>

                {/* 2. CHARTS / GRAPHE / PRODUKTE */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Umsatz-Chart (Groß) */}
                    <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-lg">
                        <h2 className="text-xl font-bold mb-4 text-primary">Monatlicher Umsatz-Trend</h2>
                        <AdminRevenueChart data={data.revenueData} />
                    </div>
                    
                    {/* Partner-Status & Produkt-Übersicht (Klein) */}
                    <div className="space-y-6">
                        {/* Partner-Status-Chart */}
                        <PartnerStatusChartCard 
                            title="Partner Status Verteilung"
                            statusCounts={data.statusCounts} 
                        />
                        
                        {/* Produkt-Inventar-Kachel */}
                        <AdminStatCard 
                            title="Aktiver Produktkatalog"
                            value={data.totalProducts.toString()}
                            // KORREKTUR: Icon als JSX-Element übergeben
                            icon={<FaBoxOpen />}
                            description="Gesamtzahl der Produkte im Katalog"
                            color="bg-gray-100 text-gray-700"
                        />
                    </div>
                </div>
            </div>
        );
    } catch (error) {
        console.error("Fehler beim Laden des Dashboards:", error);
        return (
            <div className="p-8 text-red-600">
                <h1 className="text-3xl">Dashboard-Fehler</h1>
                <p>Konnte Daten nicht laden. Bitte überprüfen Sie die Server Actions und die Supabase-Verbindung.</p>
            </div>
        );
    }
}