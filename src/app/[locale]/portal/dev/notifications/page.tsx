// src/app/[locale]/portal/dev/notifications/page.tsx

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDictionary } from "@/dictionaries";
import { sendSelfTestNotification, markAllReadForCurrentUser, simulateFirmBroadcastToPortal } from "@/app/actions/notification-actions";

export default async function PortalNotificationsTestPage({ params }: { params: { locale: string } }) {
  const locale = params.locale;
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect(`/${locale}/login`);

  const { data: profile } = await supabase.from('profiller').select('rol, firma_id').eq('id', user.id).single();
  if (profile?.rol !== 'Müşteri' && profile?.rol !== 'Alt Bayi') {
    return redirect(`/${locale}/admin/dashboard`);
  }

  const dict = await getDictionary(locale as any);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Portal Bildirim Testleri</h1>
      <p className="text-gray-600">Firma kullanıcıları için test akışları. Zilde gerçek zamanlı yansır.</p>

      <form action={async () => { 'use server'; await sendSelfTestNotification('[TEST] Portal kendi bildirimini aldı'); }}>
        <button className="px-4 py-2 rounded-lg bg-accent text-white font-bold">Kendime Test Bildirim Gönder</button>
      </form>

      <form action={async () => { 'use server'; await simulateFirmBroadcastToPortal(); }}>
        <button className="px-4 py-2 rounded-lg bg-primary text-white font-bold">Aynı Firmadaki Tüm Kullanıcılara Test Bildirim</button>
      </form>

      <form action={async () => { 'use server'; await markAllReadForCurrentUser(); }}>
        <button className="px-4 py-2 rounded-lg bg-gray-800 text-white font-bold">Tümünü Okundu İşaretle</button>
      </form>

      <div className="text-sm text-gray-500">Zil simgesini kullanarak sonuçları kontrol edin.</div>
    </div>
  );
}
