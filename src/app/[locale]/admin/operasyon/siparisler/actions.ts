// src/app/[locale]/admin/operasyon/siparisler/actions.ts
// KORRIGIERTE VERSION (await cookies + await createClient)

'use server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { revalidatePath } from 'next/cache';
import { Enums } from '@/lib/supabase/database.types';
import { cookies } from 'next/headers'; // <-- WICHTIG: Importieren

// Typ für Rückgabewert definieren (optional, aber gut)
type ActionResult = {
    success?: string; // Erfolgsmeldung
    error?: string;   // Fehlermeldung
};

export async function statusAendernAction(
    siparisId: string,
    neuerStatus: Enums<'siparis_durumu'>
): Promise<ActionResult> { // Rückgabetyp verwenden

    // --- KORREKTUR: Supabase Client korrekt initialisieren ---
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    // --- ENDE KORREKTUR ---

    // Optional: Benutzerprüfung (wer darf Status ändern?)
    // const { data: { user } } = await supabase.auth.getUser(); // Funktioniert jetzt
    // if (!user) { return { error: "Nicht authentifiziert." }; }
    // const { data: profile } = await supabase.from('profiller').select('rol').eq('id', user.id).single();
    // if (profile?.rol !== 'Yönetici' && profile?.rol !== 'Ekip Üyesi') {
    //     return { error: "Keine Berechtigung zur Statusänderung." };
    // }

    // Status in der Datenbank aktualisieren
    const { error } = await supabase
        .from('siparisler')
        .update({ siparis_durumu: neuerStatus })
        .eq('id', siparisId);

    if (error) {
        console.error(`Fehler bei Statusänderung für Bestellung ${siparisId}:`, error);
        return { error: `Status konnte nicht geändert werden. DB-Fehler: ${error.message}` };
    }

    // Otomatik belge kaydı: sipariş "Hazırlanıyor" statüsüne geçince
    if (neuerStatus === 'Hazırlanıyor') {
        try {
            const { data: siparis } = await supabase
                .from('siparisler')
                .select('id, firma_id, siparis_tarihi, toplam_tutar_net, firma:firmalar(unvan)')
                .eq('id', siparisId)
                .single();

            const firmaAdi = (siparis as any)?.firma?.unvan || 'Bilinmeyen Firma';
            const tarih = siparis?.siparis_tarihi
                ? new Date(siparis.siparis_tarihi).toLocaleDateString('tr-TR')
                : new Date().toLocaleDateString('tr-TR');

            // Aynı sipariş için daha önce otomatik belge oluşturulmuş mu kontrol et
            const { data: mevcutBelge } = await (supabase as any)
                .from('belgeler')
                .select('id')
                .eq('iliski_tipi', 'siparis')
                .eq('iliski_id', siparisId)
                .eq('otomatik_eklendi', true)
                .maybeSingle();

            if (!mevcutBelge) {
                await (supabase as any).from('belgeler').insert({
                    ad: `Sipariş ${siparisId.slice(0, 8).toUpperCase()} - ${firmaAdi} (${tarih})`,
                    kategori: 'gelen_evrak',
                    alt_kategori: 'musteri_siparisleri',
                    iliski_tipi: 'siparis',
                    iliski_id: siparisId,
                    firma_id: siparis?.firma_id || null,
                    aciklama: `Tutar: €${siparis?.toplam_tutar_net?.toFixed(2) || '—'} • Otomatik oluşturuldu`,
                    otomatik_eklendi: true,
                    gizli: false,
                });
            }
        } catch (belgeErr) {
            // Belge kaydı başarısız olsa da sipariş durumu güncellendi, hata dönme
            console.error('Otomatik belge kaydı hatası:', belgeErr);
        }
    }

    revalidatePath('/admin/operasyon/siparisler');
    revalidatePath(`/admin/operasyon/siparisler/${siparisId}`);

    console.log(`Status für Bestellung ${siparisId} erfolgreich auf ${neuerStatus} geändert.`);
    return { success: `Status wurde auf "${neuerStatus}" geändert.` };
}

export async function assignSiparisPersonelAction(formData: FormData): Promise<ActionResult> {
    const siparisId = formData.get('siparisId') as string | null;
    const personelId = formData.get('personelId') as string | null;

    if (!siparisId) return { error: 'Sipariş ID eksik.' };

    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return { error: 'Yetkisiz işlem.' };
    const { data: profile } = await supabase.from('profiller').select('rol').eq('id', user.id).single();
    const isManager = profile?.rol === 'Yönetici' || profile?.rol === 'Personel' || profile?.rol === 'Ekip Üyesi';
    if (!isManager) return { error: 'Bu işlemi yapma yetkiniz yok.' };

    const supabaseAdmin = createSupabaseServiceClient();
    const { error } = await supabaseAdmin
        .from('siparisler')
        .update({ atanan_kisi_id: personelId || null })
        .eq('id', siparisId);

    if (error) {
        console.error(`Sipariş atama hatası (${siparisId}):`, error);
        return { error: `Atama yapılamadı: ${error.message}` };
    }

    revalidatePath('/admin/operasyon/siparisler');
    revalidatePath(`/admin/operasyon/siparisler/${siparisId}`);

    return { success: 'Sipariş ataması güncellendi.' };
}