import { NextRequest, NextResponse } from 'next/server';
import { renderToStream } from '@react-pdf/renderer';
import { getKatalogData } from '@/app/actions/katalog-actions';
import KatalogPdfDocument from '@/components/admin/urun-yonetimi/urunler/KatalogPdfDocument';
import React from 'react';

export async function GET(
  request: NextRequest,
  { params }: { params: { locale: string } }
) {
  try {
    const localeParams = await params;
    const locale = localeParams.locale === 'en' ? 'en' : 'de'; // Varsayılan de
    
    // 1. Verileri çek (DB'den en güncel veriler)
    const data = await getKatalogData(locale as 'de' | 'en');
    
    // 2. PDF'i stream olarak oluştur
    const stream = await renderToStream(<KatalogPdfDocument data={data} locale={locale as 'de' | 'en'} />);
    
    // 3. Header'ları ayarla (Tarayıcıda açılsın)
    const headers = new Headers();
    headers.set('Content-Type', 'application/pdf');
    headers.set('Content-Disposition', `inline; filename="elyson-sweets-katalog-${locale}.pdf"`);
    // Cache'lenmesini engelleyelim ki her zaman en güncel halini versin.
    headers.set('Cache-Control', 'no-store, max-age=0');
    
    // @ts-ignore - Next.js NextResponse stream kabul ediyor ama tipi bazen uyuşmuyor
    return new NextResponse(stream, { status: 200, headers });
  } catch (error) {
    console.error('Katalog API Error:', error);
    return new NextResponse('Katalog olusturulurken hata meydana geldi.', { status: 500 });
  }
}
