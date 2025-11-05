"use server";

import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendNotification } from "@/lib/notificationUtils";

export async function sendSelfTestNotification(message?: string) {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "auth" };
  }
  const icerik = message || "Test bildirim (kullanıcıya)";
  const link = "/";
  const res = await sendNotification({ aliciId: user.id, icerik, link, supabaseClient: supabase });
  return { ok: res.success };
}

export async function markAllReadForCurrentUser() {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "auth" };
  const { error } = await supabase
    .from("bildirimler")
    .update({ okundu_mu: true })
    .eq("alici_id", user.id)
    .eq("okundu_mu", false);
  return { ok: !error, error };
}

export async function simulateAdminBroadcast() {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);
  const icerik = "[TEST] Yeni test bildirimi (Admin/Ekip)";
  const link = "/admin";
  const res = await sendNotification({ aliciRol: ["Yönetici", "Ekip Üyesi"], icerik, link, supabaseClient: supabase });
  return { ok: res.success };
}

export async function simulateFirmBroadcastToPortal() {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "auth" };
  const { data: profile, error } = await supabase
    .from("profiller")
    .select("firma_id")
    .eq("id", user.id)
    .single();
  if (error || !profile?.firma_id) return { ok: false, error: "profile" };
  const icerik = "[TEST] Firma kullanıcılarına test bildirimi";
  const link = "/portal";
  const res = await sendNotification({ aliciFirmaId: profile.firma_id, icerik, link, supabaseClient: supabase });
  return { ok: res.success };
}
