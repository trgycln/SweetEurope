// src/app/[locale]/admin/idari/personel/page.tsx
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import PersonelManager from '@/components/admin/personel/PersonelManager';
import { Locale } from '@/i18n-config';
import { ADMIN_PANEL_OPTIONS, getEffectiveAdminPanels, normalizeInternalNotificationPreferences } from '@/lib/admin/panel-access';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ locale: Locale }>;
}

type UserListItem = {
  id: string;
  tam_ad: string | null;
  rol: string;
  email: string | null;
  firma_id: string | null;
  firma_unvan: string | null;
  tercih_edilen_dil: string | null;
  gorev_sayisi: number;
  acik_gorev_sayisi: number;
  gorevler: string[];
  allowed_admin_panels: string[];
  notification_preferences: Record<string, boolean>;
};

type FirmaOption = {
  id: string;
  unvan: string;
  ticari_tip: string | null;
  kategori: string | null;
  sahip_id: string | null;
};

export default async function PersonelPage({ params }: PageProps) {
  const { locale } = await params;
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return redirect(`/${locale}/login?next=/${locale}/admin/idari/personel`);

  const { data: profile } = await supabase.from('profiller').select('rol').eq('id', user.id).maybeSingle();

  if (!profile || (profile.rol !== 'Yönetici' && profile.rol !== 'Ekip Üyesi')) {
    return redirect(`/${locale}/admin`);
  }

  const [profilesRes, gorevlerRes, firmalarRes] = await Promise.all([
    supabase
      .from('profiller')
      .select('id, tam_ad, rol, firma_id, tercih_edilen_dil, firma:firmalar(id, unvan)')
      .order('tam_ad'),
    supabase.from('gorevler').select('id, baslik, atanan_kisi_id, tamamlandi').order('created_at', { ascending: false }),
    supabase.from('firmalar').select('id, unvan, ticari_tip, kategori, sahip_id').order('unvan'),
  ]);

  const profiles = profilesRes.data || [];
  const gorevler = gorevlerRes.data || [];
  const firmalar: FirmaOption[] = firmalarRes.data || [];

  const taskMap = new Map<string, { total: number; open: number; titles: string[] }>();
  for (const gorev of gorevler) {
    const current = taskMap.get(gorev.atanan_kisi_id) || { total: 0, open: 0, titles: [] };
    current.total += 1;
    if (!gorev.tamamlandi) current.open += 1;
    if (current.titles.length < 3) current.titles.push(gorev.baslik);
    taskMap.set(gorev.atanan_kisi_id, current);
  }

  const emailMap = new Map<string, string | null>();
  const allowedPanelsMap = new Map<string, string[]>();
  const notificationPreferencesMap = new Map<string, Record<string, boolean>>();
  const authNameMap = new Map<string, string | null>();

  try {
    const supabaseAdmin = createSupabaseServiceClient();
    const { data: authUsersData, error: authUsersError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });

    if (authUsersError) {
      console.error('Auth kullanıcı listesi alınamadı:', authUsersError);
    } else {
      for (const authUser of authUsersData.users) {
        emailMap.set(authUser.id, authUser.email ?? null);
        authNameMap.set(authUser.id, typeof authUser.user_metadata?.tam_ad === 'string' ? authUser.user_metadata.tam_ad : null);
        allowedPanelsMap.set(
          authUser.id,
          getEffectiveAdminPanels(
            (profiles.find((item) => item.id === authUser.id)?.rol as string | null) || null,
            authUser.user_metadata?.allowed_admin_panels
          )
        );
        notificationPreferencesMap.set(
          authUser.id,
          normalizeInternalNotificationPreferences(authUser.user_metadata?.internal_notification_preferences)
        );
      }
    }
  } catch (error) {
    console.error('Auth kullanıcıları service client ile alınamadı:', error);
  }

  const profileMap = new Map(profiles.map((item) => [item.id, item]));
  const allUserIds = Array.from(new Set([...profiles.map((item) => item.id), ...Array.from(emailMap.keys())]));

  const initialUsers: UserListItem[] = allUserIds
    .map((userId) => {
      const item = profileMap.get(userId);
      const taskInfo = taskMap.get(userId) || { total: 0, open: 0, titles: [] };
      const firma = item ? (Array.isArray(item.firma) ? item.firma[0] : item.firma) : null;

      return {
        id: userId,
        tam_ad: item?.tam_ad ?? authNameMap.get(userId) ?? null,
        rol: item?.rol ? String(item.rol) : 'Tanımsız',
        email: emailMap.get(userId) ?? null,
        firma_id: item?.firma_id ?? null,
        firma_unvan: firma?.unvan ?? null,
        tercih_edilen_dil: item?.tercih_edilen_dil ?? null,
        gorev_sayisi: taskInfo.total,
        acik_gorev_sayisi: taskInfo.open,
        gorevler: taskInfo.titles,
        allowed_admin_panels: allowedPanelsMap.get(userId) ?? [],
        notification_preferences: notificationPreferencesMap.get(userId) ?? normalizeInternalNotificationPreferences(null),
      };
    })
    .sort((a, b) => {
      const left = (a.tam_ad || a.email || a.id).toLocaleLowerCase('tr');
      const right = (b.tam_ad || b.email || b.id).toLocaleLowerCase('tr');
      return left.localeCompare(right, 'tr');
    });

  return (
    <main className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-primary">Kullanıcı ve Personel Yönetimi</h1>
        <p className="text-sm text-gray-600">
          İç ekip kullanıcılarını yönetin, hangi panellere erişebileceklerini belirleyin ve müşteri/alt bayi hesaplarını tek ekrandan takip edin.
        </p>
      </header>

      <PersonelManager
        initialUsers={initialUsers}
        panelOptions={ADMIN_PANEL_OPTIONS.map((panel) => ({
          key: panel.key,
          label: panel.label,
          description: panel.description,
        }))}
        firmaOptions={firmalar}
        locale={locale}
        canManage={profile.rol === 'Yönetici'}
        currentUserId={user.id}
      />
    </main>
  );
}
