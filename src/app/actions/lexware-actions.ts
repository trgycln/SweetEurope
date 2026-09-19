'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createLexwareInvoiceForOrder, cancelLexwareInvoiceForOrder } from '@/lib/lexware/invoices';

/**
 * Admin tarafından sipariş için Lexware resmi faturası oluşturma eylemi
 */
export async function faturaOlusturAction(siparisId: string) {
  try {
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Yetkisiz işlem: Giriş yapınız.' };
    }

    const { data: profile } = await supabase
      .from('profiller')
      .select('rol')
      .eq('id', user.id)
      .maybeSingle();

    if (!['Yönetici', 'Personel', 'Ekip Üyesi'].includes(profile?.rol || '')) {
      return { success: false, error: 'Bu işlem için yetkiniz bulunmamaktadır.' };
    }

    const result = await createLexwareInvoiceForOrder(siparisId, { finalize: true });

    revalidatePath('/[locale]/admin/operasyon/siparisler/[siparisId]', 'page');
    revalidatePath('/[locale]/portal/siparisler/[siparisId]', 'page');

    return {
      success: true,
      invoiceId: result.invoiceId,
      invoiceNo: result.invoiceNo,
      pdfUrl: result.pdfUrl,
    };
  } catch (error: any) {
    console.error('faturaOlusturAction hatası:', error);
    return {
      success: false,
      error: error?.message || 'Lexware faturası oluşturulurken beklenmeyen bir hata meydana geldi.',
    };
  }
}

/**
 * Admin tarafından faturalandırılmış siparişi resmi olarak iptal etme (Storno / Rechnungskorrektur) eylemi
 */
export async function faturaIptalEtAction(siparisId: string, reason?: string) {
  try {
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Yetkisiz işlem: Giriş yapınız.' };
    }

    const { data: profile } = await supabase
      .from('profiller')
      .select('rol')
      .eq('id', user.id)
      .maybeSingle();

    if (!['Yönetici', 'Personel', 'Ekip Üyesi'].includes(profile?.rol || '')) {
      return { success: false, error: 'Bu işlem için yetkiniz bulunmamaktadır.' };
    }

    const result = await cancelLexwareInvoiceForOrder(siparisId, reason);

    revalidatePath('/[locale]/admin/operasyon/siparisler/[siparisId]', 'page');
    revalidatePath('/[locale]/portal/siparisler/[siparisId]', 'page');

    return {
      success: true,
      creditNoteId: result.creditNoteId,
      creditNoteNo: result.creditNoteNo,
      stornoPdfUrl: result.stornoPdfUrl,
    };
  } catch (error: any) {
    console.error('faturaIptalEtAction hatası:', error);
    return {
      success: false,
      error: error?.message || 'Fatura iptal edilirken (Storno) bir hata meydana geldi.',
    };
  }
}
