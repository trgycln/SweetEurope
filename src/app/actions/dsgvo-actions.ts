'use server';

import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';

/**
 * DSGVO: Export Customer Data (Data Portability)
 * Müşterinin veya adminin kendi verilerini indirmesi.
 * RLS kullanılarak güvenli bir şekilde alınmalıdır (Admin yetkisi veya kendisi).
 */
export async function exportCustomerData(firmaId: string) {
  try {
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Yetkisiz erişim.' };
    }

    const { data: profile } = await supabase
      .from('profiller')
      .select('rol, firma_id')
      .eq('id', user.id)
      .maybeSingle();

    const isAdmin = ['Yönetici', 'Personel', 'Ekip Üyesi'].includes(profile?.rol || '');

    // Güvenlik: Admin değilse sadece KENDİ firmasının verisini dışa aktarabilir
    if (!isAdmin && profile?.firma_id !== firmaId) {
      return { success: false, error: 'Başka bir firmanın verilerini dışa aktarma yetkiniz yok.' };
    }

    // Firma verileri
    const { data: firma, error: firmaError } = await supabase
      .from('firmalar')
      .select('*')
      .eq('id', firmaId)
      .single();

    if (firmaError || !firma) {
      return { success: false, error: 'Firma bulunamadı.' };
    }

    // Profiller
    const { data: profiller } = await supabase
      .from('profiller')
      .select('*')
      .eq('firma_id', firmaId);

    // Siparişler
    const { data: siparisler } = await supabase
      .from('siparisler')
      .select('*, siparis_detay(*)')
      .eq('firma_id', firmaId);

    return {
      success: true,
      data: {
        firma,
        profiller: profiller || [],
        siparisler: siparisler || [],
        exportedAt: new Date().toISOString()
      }
    };
  } catch (error: any) {
    console.error('exportCustomerData hatası:', error);
    return { success: false, error: 'Veri dışa aktarma sırasında bir hata oluştu.' };
  }
}

/**
 * DSGVO: Right to be Forgotten / Anonymization vs GoBD
 * Firmanın siparişi varsa fiziksel olarak SİLİNEMEZ (GoBD).
 * Bunun yerine Kişisel Veriler (PII) anonimleştirilir (Soft Delete).
 */
export async function anonymizeCustomerData(firmaId: string) {
  try {
    const cookieStore = await cookies();
    // Admin only action generally, using Service Client to bypass RLS for the update,
    // BUT we must check auth first.
    const supabaseAuth = await createSupabaseServerClient(cookieStore);

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Yetkisiz erişim.' };
    }

    const { data: profile } = await supabaseAuth
      .from('profiller')
      .select('rol')
      .eq('id', user.id)
      .maybeSingle();

    const isAdmin = ['Yönetici', 'Personel', 'Ekip Üyesi'].includes(profile?.rol || '');
    if (!isAdmin) {
      return { success: false, error: 'Bu işlem için yetkiniz yok.' };
    }

    const supabaseAdmin = createSupabaseServiceClient();

    // Sipariş kontrolü
    const { count: orderCount, error: countError } = await supabaseAdmin
      .from('siparisler')
      .select('id', { count: 'exact', head: true })
      .eq('firma_id', firmaId);

    if (countError) {
      return { success: false, error: 'Siparişler kontrol edilemedi.' };
    }

    if (orderCount && orderCount > 0) {
      // Siparişi var -> GoBD kuralları gereği SİLİNEMEZ, ANONİMLEŞTİRİLMELİ
      const dummyString = '***_ANONYMIZED_***';
      
        const { error: updateError } = await supabaseAdmin
        .from('firmalar')
        .update({
          email: `anonim_${firmaId.substring(0,8)}@deleted.com`,
          telefon: dummyString,
          adres: dummyString,
          sehir: dummyString,
          posta_kodu: '00000',
          unvan: `SİLİNMİŞ MÜŞTERİ (${firmaId.substring(0,8)})`,
          vergi_no: dummyString,
          yetkili_kisi: dummyString,
          status: 'PASİF'
        })
        .eq('id', firmaId);

      if (updateError) {
        throw new Error('Anonimleştirme işlemi başarısız: ' + updateError.message);
      }

      // İlgili profilleri de anonimleştir veya sil (Eğer kullanıcılar giriş yapmasın diyorsak)
      await supabaseAdmin
        .from('profiller')
        .update({
          tam_ad: dummyString,
        })
        .eq('firma_id', firmaId);

      return { success: true, message: 'Firma sipariş geçmişi olduğu için kalıcı olarak silinemedi. Ancak DSGVO kapsamında tüm kişisel verileri (PII) başarıyla anonimleştirildi.' };
    } else {
      // Siparişi yok -> Fiziksel olarak silinebilir (Hard Delete)
      const { error: deleteError } = await supabaseAdmin
        .from('firmalar')
        .delete()
        .eq('id', firmaId);

      if (deleteError) {
        throw new Error('Silme işlemi başarısız: ' + deleteError.message);
      }

      return { success: true, message: 'Firma siparişi bulunmadığından kalıcı olarak silindi (Hard Delete).' };
    }

  } catch (error: any) {
    console.error('anonymizeCustomerData hatası:', error);
    return { success: false, error: error.message || 'Bir hata oluştu.' };
  }
}

/**
 * DSGVO: Data Retention / Chat Logs
 * 30 günden eski chat loglarını siler veya maskeler.
 */
export async function cleanupOldAiChatLogs() {
  try {
    const supabaseAdmin = createSupabaseServiceClient();

    // 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateLimit = thirtyDaysAgo.toISOString();

    const { error } = await supabaseAdmin
      .from('ai_chat_logs')
      .delete()
      .lt('created_at', dateLimit);

    if (error) {
      throw new Error('Sohbet kayıtları silinemedi: ' + error.message);
    }

    return { success: true, message: '30 günden eski sohbet kayıtları başarıyla silindi.' };
  } catch (error: any) {
    console.error('cleanupOldAiChatLogs hatası:', error);
    return { success: false, error: error.message || 'Temizlik sırasında hata oluştu.' };
  }
}
