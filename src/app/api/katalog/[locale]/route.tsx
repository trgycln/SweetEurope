import { NextRequest, NextResponse } from 'next/server';


export async function GET(
  request: NextRequest,
  { params }: { params: { locale: string } }
) {
  try {
    const localeParams = await params;
    const locale = localeParams.locale === 'en' ? 'en' : 'de'; // Varsayılan de
    
    // Vercel serverless fonksiyonlarında @react-pdf/renderer'in Node stream oluşturması
    // bellek ve kütüphane boyutu sınırlarına (50MB) takıldığı için sıkça 500 hatası veriyor.
    // PDF oluşturma işlemini tarayıcı (client-side) tarafına taşıdığımız için
    // QR kodlardan gelen eski linkleri yeni client-side sayfasına yönlendiriyoruz.
    const redirectUrl = new URL(`/katalog/${locale}`, request.url);
    return NextResponse.redirect(redirectUrl);
  } catch (error: any) {
    console.error('Katalog Yönlendirme Hatası:', error);
    return new NextResponse(`Yönlendirme sırasında hata meydana geldi: ${error.message || error.toString()}`, { status: 500 });
  }
}
