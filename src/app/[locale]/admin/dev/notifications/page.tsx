// src/app/[locale]/admin/dev/notifications/page.tsx

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDictionary } from "@/dictionaries";
import { sendSelfTestNotification, markAllReadForCurrentUser, simulateAdminBroadcast } from "@/app/actions/notification-actions";

export default async function AdminNotificationsTestPage({ params }: { params: { locale: string } }) {
  const locale = params.locale;
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect(`/${locale}/login`);

  const { data: profile } = await supabase.from('profiller').select('rol').eq('id', user.id).single();
  if (profile?.rol !== 'Yönetici' && profile?.rol !== 'Ekip Üyesi') {
    return redirect(`/${locale}/portal/dashboard`);
  }

  const dict = await getDictionary(locale as any);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Admin Bildirim Testleri</h1>
      <p className="text-gray-600">Aşağıdaki butonlar bildirim akışını test eder. Zilde gerçek zamanlı olarak yansır.</p>

      <form action={async () => { 'use server'; await sendSelfTestNotification('[TEST] Admin kendi bildirimini aldı'); }}>
        <button className="px-4 py-2 rounded-lg bg-accent text-white font-bold">Kendime Test Bildirim Gönder</button>
      </form>

      <form action={async () => { 'use server'; await simulateAdminBroadcast(); }}>
        <button className="px-4 py-2 rounded-lg bg-primary text-white font-bold">Tüm Yönetici/Ekip için Test Bildirim</button>
      </form>

      <form action={async () => { 'use server'; await markAllReadForCurrentUser(); }}>
        <button className="px-4 py-2 rounded-lg bg-gray-800 text-white font-bold">Tümünü Okundu İşaretle</button>
      </form>

      <div className="text-sm text-gray-500">Zil simgesini kullanarak sonuçları kontrol edin.</div>
    </div>
  );
}
