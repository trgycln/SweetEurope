import {
    AppUserRole,
    InternalNotificationKey,
    isInternalUserRole,
    normalizeInternalNotificationPreferences,
} from '@/lib/admin/panel-access';
import { Enums } from '@/lib/supabase/database.types';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

type NotificationRecipient = {
    id: string;
    rol: AppUserRole;
};

interface SendNotificationParams {
    aliciId?: string;
    aliciRol?: Enums<'user_role'> | Enums<'user_role'>[];
    aliciFirmaId?: string;
    icerik: string;
    link?: string;
    preferenceKey?: InternalNotificationKey;
    supabaseClient?: Awaited<ReturnType<typeof createSupabaseServerClient>>;
}

async function filterRecipientsByInternalPreference(
    recipients: NotificationRecipient[],
    preferenceKey: InternalNotificationKey
): Promise<NotificationRecipient[]> {
    const internalRecipients = recipients.filter((recipient) => isInternalUserRole(recipient.rol));

    if (internalRecipients.length === 0) {
        return recipients;
    }

    try {
        const supabaseAdmin = createSupabaseServiceClient();
        const { data: authUsersData, error: authUsersError } = await supabaseAdmin.auth.admin.listUsers({
            page: 1,
            perPage: 1000,
        });

        if (authUsersError) {
            console.warn('[sendNotification] Bildirim tercihleri okunamadı, varsayılan davranış kullanılacak:', authUsersError);
            return recipients;
        }

        const authUserMap = new Map((authUsersData?.users || []).map((authUser) => [authUser.id, authUser]));

        return recipients.filter((recipient) => {
            if (!isInternalUserRole(recipient.rol)) {
                return true;
            }

            const authUser = authUserMap.get(recipient.id);
            const preferences = normalizeInternalNotificationPreferences(authUser?.user_metadata?.internal_notification_preferences);
            return preferences[preferenceKey];
        });
    } catch (error) {
        console.warn('[sendNotification] Bildirim tercihleri sorgulanırken hata oluştu, bildirim gönderimi devam ediyor:', error);
        return recipients;
    }
}

export async function sendNotification(
    params: SendNotificationParams
): Promise<{ success: boolean; error?: unknown; skipped?: boolean; recipientCount?: number }> {
    const { aliciId, aliciRol, aliciFirmaId, icerik, link, preferenceKey, supabaseClient } = params;
    const supabase = supabaseClient || (await createSupabaseServerClient(await cookies()));
    let recipients: NotificationRecipient[] = [];

    if (!icerik?.trim()) {
        return { success: false, error: 'Bildirim içeriği boş olamaz.' };
    }

    try {
        if (aliciId) {
            const { data: recipientProfile, error: recipientError } = await supabase
                .from('profiller')
                .select('id, rol')
                .eq('id', aliciId)
                .maybeSingle();

            if (recipientError) {
                console.error('[sendNotification] Tekil alıcı profili okunamadı:', recipientError);
                throw recipientError;
            }

            recipients = recipientProfile
                ? [{ id: recipientProfile.id, rol: recipientProfile.rol as AppUserRole }]
                : [{ id: aliciId, rol: null }];
        } else if (aliciRol) {
            const roller = Array.isArray(aliciRol) ? aliciRol : [aliciRol];
            const { data: usersInRole, error: roleError } = await supabase
                .from('kullanici_segment_bilgileri')
                .select('id, rol')
                .in('rol', roller);

            if (roleError) {
                console.error('[sendNotification] Rol bazlı kullanıcı arama hatası:', roleError);
                throw roleError;
            }

            recipients = (usersInRole || []).map((user: { id: string; rol?: string | null }) => ({
                id: user.id,
                rol: (user.rol ?? null) as AppUserRole,
            }));
        } else if (aliciFirmaId) {
            const { data: usersInFirma, error: firmaError } = await supabase
                .from('profiller')
                .select('id, rol')
                .eq('firma_id', aliciFirmaId)
                .in('rol', ['Müşteri', 'Alt Bayi']);

            if (firmaError) {
                console.error('[sendNotification] Firma bazlı kullanıcı arama hatası:', firmaError);
                throw firmaError;
            }

            recipients = (usersInFirma || []).map((user) => ({
                id: user.id,
                rol: (user.rol ?? null) as AppUserRole,
            }));
        }

        const uniqueRecipients = Array.from(new Map(recipients.map((recipient) => [recipient.id, recipient])).values());

        if (uniqueRecipients.length === 0) {
            return { success: true, skipped: true, recipientCount: 0 };
        }

        const filteredRecipients = preferenceKey
            ? await filterRecipientsByInternalPreference(uniqueRecipients, preferenceKey)
            : uniqueRecipients;

        if (filteredRecipients.length === 0) {
            return { success: true, skipped: true, recipientCount: 0 };
        }

        const { error: insertError } = await supabase.from('bildirimler').insert(
            filteredRecipients.map((recipient) => ({
                alici_id: recipient.id,
                icerik,
                link: link || null,
                okundu_mu: false,
            }))
        );

        if (insertError) {
            console.error('[sendNotification] Bildirim ekleme hatası:', insertError);
            throw insertError;
        }

        return { success: true, recipientCount: filteredRecipients.length };
    } catch (error) {
        console.error('[sendNotification] Fonksiyon içinde genel hata:', error);
        return { success: false, error };
    }
}