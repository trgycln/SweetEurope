// src/app/[locale]/admin/idari/finans/raporlama/kar-zarar/page.tsx
// Modern Kar & Zarar Raporu

export const dynamic = 'force-dynamic';

import React from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { getDictionary } from '@/dictionaries';
import { Locale } from '@/lib/utils';
import { redirect } from 'next/navigation';
import PNLReportClient from './PNLReportClient';

// ReportData Typ
type ExpenseDetail = {
    id: string;
    tarih: string;
    tutar: number;
    aciklama: string | null;
};

type ExpenseItem = {
    kalem_id: string;
    kalem_adi: string;
    toplam: number;
    detaylar: ExpenseDetail[] | null;
};

type ExpenseCategory = {
    kategori: string;
    toplam: number;
    kalemler: ExpenseItem[];
};

type ReportData = {
    totalGrossRevenue: number;
    totalRevenue: number;
    totalCogs: number;
    grossProfit: number;
    totalExpenses: number;
    netProfit: number;
    expenseBreakdown: ExpenseCategory[];
};

// Datumsbereich-Funktion
const getDateRange = (period: string, customFrom?: string, customTo?: string) => {
     if (period === 'custom' && customFrom && customTo) {
         return { start: customFrom, end: customTo };
     }
     
     const now = new Date();
     let startDate = new Date();
     let endDate = new Date();
     
     switch (period) {
         case 'last-month':
             startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
             endDate = new Date(now.getFullYear(), now.getMonth(), 0);
             break;
         case 'last-3-months':
             startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
             endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
             break;
         case 'last-6-months':
             startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
             endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
             break;
         case 'this-year':
             startDate = new Date(now.getFullYear(), 0, 1);
             endDate = new Date(now.getFullYear(), 11, 31);
             break;
         case 'last-year':
             startDate = new Date(now.getFullYear() - 1, 0, 1);
             endDate = new Date(now.getFullYear() - 1, 11, 31);
             break;
         case 'this-month':
         default:
             startDate = new Date(now.getFullYear(), now.getMonth(), 1);
             endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
             break;
     }
     
     return {
         start: startDate.toISOString().split('T')[0],
         end: endDate.toISOString().split('T')[0]
     };
};

// Hauptkomponente
export default async function PNLDetailPage({
    params,
    searchParams
}: {
    params: Promise<{ locale: Locale }>;
    searchParams: Promise<{ period?: string, from?: string, to?: string }>
}) {
    const { locale } = await params;
    const search = await searchParams;
    
    // Supabase Client korrekt initialisieren
    const cookieStore = await cookies(); 
    const supabase = await createSupabaseServerClient(cookieStore); 

    const dictionary = await getDictionary(locale);

    // Benutzerprüfung
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return redirect(`/${locale}/login`);

    const { data: profile } = await supabase.from('profiller').select('rol').eq('id', user!.id).single();
    if (profile?.rol !== 'Yönetici') {
        return redirect(`/${locale}/admin/dashboard`);
    }

    // Zeitfilterung
    const currentPeriod = search.period || 'this-month';
    const { start, end } = getDateRange(currentPeriod, search.from, search.to);

    // RPC-Funktion aufrufen - yeni fonksiyon yoksa eski fonksiyona fallback
    let reportData: any = null;
    let error: any = null;

    // Önce yeni detaylı fonksiyonu dene
    const detailedResult = await (supabase as any)
        .rpc('get_detailed_pl_report', { start_date: start, end_date: end })
        .single();

    if (detailedResult.error) {
        // Yeni fonksiyon yoksa eski fonksiyonu kullan
        console.log("Detaylı fonksiyon bulunamadı, standart fonksiyon kullanılıyor...");
        const standardResult = await supabase
            .rpc('get_pl_report', { start_date: start, end_date: end })
            .single();
        
        if (standardResult.error) {
            error = standardResult.error;
        } else {
            const oldData = standardResult.data as any;
            // Eski veriyi yeni formata dönüştür
            reportData = {
                ...oldData,
                expenseBreakdown: (oldData?.expenseBreakdown || []).map((exp: any) => ({
                    kategori: exp.kategori,
                    toplam: exp.toplam,
                    kalemler: [] // Eski fonksiyonda detay yok
                }))
            };
        }
    } else {
        reportData = detailedResult.data;
    }

    const report = reportData as ReportData | null;

    if (error || !report) {
        console.error("P&L Bericht Fehler:", error);
    }

    return (
        <PNLReportClient 
            locale={locale}
            dictionary={dictionary}
            report={report}
            error={error}
            currentPeriod={currentPeriod}
            startDate={start}
            endDate={end}
        />
    );
}
