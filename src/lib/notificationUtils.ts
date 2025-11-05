import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Enums } from '@/lib/supabase/database.types';

interface SendNotificationParams {
    aliciId?: string;
    aliciRol?: Enums<'user_role'> | Enums<'user_role'>[];
    aliciFirmaId?: string;
    icerik: string;
    link?: string;
    supabaseClient?: any;
}

export async function sendNotification(params: SendNotificationParams): Promise<{ success: boolean; error?: any }> {
    const { aliciId, aliciRol, aliciFirmaId, icerik, link, supabaseClient } = params;
    const supabase = supabaseClient || createSupabaseServerClient();
    let aliciIds: string[] = [];

    console.log('[sendNotification] Başlatıldı. Parametreler:', params); // <-- LOG 1

    try {
        if (aliciId) {
            aliciIds.push(aliciId);
            console.log(`[sendNotification] Hedef: Tek kullanıcı ID ${aliciId}`); // <-- LOG 2a
        } else if (aliciRol) {
            const roller = Array.isArray(aliciRol) ? aliciRol : [aliciRol];
            console.log(`[sendNotification] Hedef: Roller ${roller.join(', ')} aranıyor...`); // <-- LOG 2b
            // RLS'e takılmamak için view kullan (id, rol)
            const { data: usersInRole, error: roleError } = await supabase
                .from('kullanici_segment_bilgileri')
                .select('id')
                .in('rol', roller as any);
            if (roleError) {
                console.error('[sendNotification] Rol bazlı kullanıcı arama hatası (view üzerinden):', roleError); // <-- LOG HATA 1
                throw roleError;
            }
            if (usersInRole && usersInRole.length > 0) {
                 aliciIds.push(...usersInRole.map((u: any) => u.id));
                 console.log(`[sendNotification] Bulunan yönetici/ekip üyesi ID'leri: ${aliciIds.join(', ')}`); // <-- LOG 3b
            } else {
                 console.warn(`[sendNotification] '${roller.join(', ')}' rollerinde kullanıcı bulunamadı.`); // <-- LOG UYARI 1
            }
        } else if (aliciFirmaId) {
            console.log(`[sendNotification] Hedef: Firma ID ${aliciFirmaId} kullanıcıları aranıyor...`); // <-- LOG 2c
            const { data: usersInFirma, error: firmaError } = await supabase
                .from('profiller')
                .select('id')
                .eq('firma_id', aliciFirmaId)
                .in('rol', ['Müşteri', 'Alt Bayi']);
            if (firmaError) {
                console.error('[sendNotification] Firma bazlı kullanıcı arama hatası:', firmaError); // <-- LOG HATA 2
                throw firmaError;
            }
             if (usersInFirma && usersInFirma.length > 0) {
                 aliciIds.push(...usersInFirma.map(u => u.id));
                 console.log(`[sendNotification] Firmada bulunan portal kullanıcı ID'leri: ${aliciIds.join(', ')}`); // <-- LOG 3c
             } else {
                 console.warn(`[sendNotification] '${aliciFirmaId}' firmasında portal kullanıcısı bulunamadı.`); // <-- LOG UYARI 2
             }
        }

        if (aliciIds.length === 0 || !icerik) {
            console.warn('[sendNotification] Geçerli alıcı bulunamadı veya içerik boş. Gönderim yapılmayacak.'); // <-- LOG UYARI 3
            return { success: false, error: 'Alıcı bulunamadı veya içerik boş.' };
        }

        const uniqueAliciIds = [...new Set(aliciIds)];
        console.log(`[sendNotification] Benzersiz alıcı ID'leri: ${uniqueAliciIds.join(', ')}`); // <-- LOG 4

        const bildirimlerToInsert = uniqueAliciIds.map(id => ({
            alici_id: id,
            icerik: icerik,
            link: link || null,
            okundu_mu: false
        }));

        console.log('[sendNotification] Bildirimler veritabanına ekleniyor...'); // <-- LOG 5
        const { error: insertError } = await supabase
            .from('bildirimler')
            .insert(bildirimlerToInsert);

        if (insertError) {
            console.error('[sendNotification] Bildirim ekleme hatası:', insertError); // <-- LOG HATA 3
            throw insertError;
        }

        console.log(`[sendNotification] Bildirim başarıyla ${uniqueAliciIds.length} alıcıya gönderildi.`); // <-- LOG 6
        return { success: true };

    } catch (error) {
        console.error('[sendNotification] Fonksiyon içinde genel hata:', error); // <-- LOG HATA 4
        return { success: false, error: error };
    }
}