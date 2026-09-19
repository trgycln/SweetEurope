import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { getLexwareInvoicePdfBuffer } from '@/lib/lexware/invoices';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ siparisId: string }> }
) {
  try {
    const { siparisId } = await context.params;
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    // 1. Oturum kontrolü
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new NextResponse('Yetkisiz erişim (Giriş yapınız)', { status: 401 });
    }

    // 2. Profil ve rol kontrolü
    const { data: profile } = await supabase
      .from('profiller')
      .select('id, rol, firma_id')
      .eq('id', user.id)
      .maybeSingle();

    const isAdmin = ['Yönetici', 'Personel', 'Ekip Üyesi'].includes(profile?.rol || '');

    // 3. Sipariş kontrolü
    const supabaseAdmin = createSupabaseServiceClient();
    const { data: siparis, error: siparisError } = await supabaseAdmin
      .from('siparisler')
      .select('id, firma_id, lexware_invoice_id, lexware_invoice_no')
      .eq('id', siparisId)
      .single();

    if (siparisError || !siparis) {
      return new NextResponse('Sipariş bulunamadı', { status: 404 });
    }

    // IDOR Güvenlik Kontrolü: Admin değilse sadece kendi firmasının faturasını görebilir
    if (!isAdmin) {
      // Profilin firması ile siparişin firması eşleşiyor mu?
      if (!profile?.firma_id || profile.firma_id !== siparis.firma_id) {
        return new NextResponse('Bu faturayı görüntüleme yetkiniz yok.', { status: 403 });
      }
    }

    if (!siparis.lexware_invoice_id) {
      return new NextResponse('Bu sipariş için henüz resmi bir Lexware faturası kesilmemiştir.', { status: 404 });
    }

    // 4. Lexware'den PDF dosyasını çek
    const { buffer, filename } = await getLexwareInvoicePdfBuffer(siparis.lexware_invoice_id);
    const invoiceNumber = siparis.lexware_invoice_no || filename;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Rechnung-${invoiceNumber}.pdf"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error: any) {
    console.error('Lexware PDF indirme hatası:', error);
    return new NextResponse(`Fatura PDF alınırken hata oluştu: ${error?.message || error}`, {
      status: 500,
    });
  }
}
