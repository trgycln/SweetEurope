// src/app/[locale]/admin/dashboard/FinanzChartClient.tsx
// BU BİR YENİ DOSYADIR (Client Component für das Diagramm)

'use client'; // <-- 'use client' direktifi en üstte olmalı

import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { FiLoader } from 'react-icons/fi';
import { Database } from '@/lib/supabase/database.types'; // Database tipini import et

// Chart.js bileşenlerini kaydet
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// Raporlama (P&L) fonksiyonundan dönecek veri tipi
type ReportData = {
    totalGrossRevenue: number;
    totalRevenue: number; // Net
    totalCogs: number;
    grossProfit: number;
    totalExpenses: number;
    netProfit: number;
    expenseBreakdown: any[];
};

// Para Formatlama (Client-side)
const formatCurrencyClient = (value: number | null | undefined) => {
    if (value === null || value === undefined) return 'N/A';
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
};

// Prop Tipi
interface FinanzChartClientProps {
    plReport: ReportData | null;
    dictionary: any; // Dictionary tipini gerektiği gibi ayarlayın
}

// Finansal Grafik Bileşeni
export function FinanzChartClient({ plReport, dictionary }: FinanzChartClientProps) {
    // Sözlük içeriklerini güvenle al
    const pnlContent = dictionary.pnlReportPage || {};
    // dashboardPage'in var olup olmadığını kontrol et
    const pageContent = (dictionary.adminDashboard && dictionary.adminDashboard.dashboardPage) 
        ? dictionary.adminDashboard.dashboardPage 
        : {};
    
    // Grafik için verileri hazırla
    const data = {
        labels: [
            pnlContent.totalGrossRevenue || 'Brüt Ciro', 
            pnlContent.totalOpEx || 'Toplam Giderler', 
            pageContent.cardNetProfitThisMonth || 'Net Kâr (Bu Ay)'
        ],
        datasets: [
            {
                label: 'Betrag in €',
                data: [
                    plReport?.totalGrossRevenue ?? 0,
                    plReport?.totalExpenses ?? 0,
                    plReport?.netProfit ?? 0
                ],
                backgroundColor: [
                    '#C69F6B', // Vurgu Rengi (Accent - Ciro)
                    '#DC2626', // Kırmızı (Gider - Tailwind red-600)
                    (plReport?.netProfit ?? 0) >= 0 ? '#16A34A' : '#DC2626' // Kâr (Yeşil - green-600) veya Zarar (Kırmızı)
                ],
                borderRadius: 6,
                borderSkipped: false,
            },
        ],
    };

    // Grafik ayarları
    const options = {
        responsive: true,
        maintainAspectRatio: false, // Grafiğin kapsayıcıya uyması için
        plugins: {
            legend: {
                display: false, // Etiketi (label) gizle
            },
            title: {
                display: true,
                text: 'Finanzübersicht (Dieser Monat)', // Başlık
                font: {
                    size: 18,
                    family: "'Playfair Display', serif", // Tailwind config'deki 'serif' fontunuz
                },
                color: '#3D3D3D' // Ana Metin Rengi
            },
            tooltip: {
                 callbacks: {
                     label: function(context: any) {
                         let label = context.dataset.label || '';
                         if (label) {
                             label += ': ';
                         }
                         if (context.parsed.y !== null) {
                             label += formatCurrencyClient(context.parsed.y);
                         }
                         return label;
                     }
                 }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    callback: function(value: any) {
                        // Y eksenindeki sayıları para formatında göster
                        return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value as number);
                    }
                }
            },
            x: {
                 grid: {
                     display: false // X ekseni ızgara çizgilerini gizle
                 }
            }
        },
    };

    return (
        // Kartın yüksekliğini belirle
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 h-80 md:h-96"> 
            {plReport ? (
                // Chart.js'nin TypeScript uyumluluğu için options'ı 'any' olarak cast et
                <Bar options={options as any} data={data} />
            ) : (
                // Rapor yüklenirken veya null ise göster
                <div className="flex items-center justify-center h-full text-gray-500">
                    <FiLoader className="animate-spin mr-2" />
                    Finanzdaten werden geladen...
                </div>
            )}
        </div>
    );
}