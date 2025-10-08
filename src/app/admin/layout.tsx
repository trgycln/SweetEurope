// src/app/admin/layout.tsx (GÜNCEL HALİ)

import React from 'react';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server'; 
import { Database } from '@/lib/supabase/database.types';
import { User } from '@supabase/supabase-js';

// Bu, birazdan oluşturacağımız Client Component'tir.
// Sayfanın görsel düzenini ve interaktifliğini yönetir.
import { AdminLayoutClient } from '@/components/AdminLayoutClient';

type UserRole = Database['public']['Enums']['user_role'];
const ALLOWED_ROLES: UserRole[] = ["Yönetici"];

// Bu ana layout bileşeni bir Server Component olarak kalır.
// Görevi: Güvenlik kontrolü yapmak ve veriyi çekip Client Component'e aktarmak.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Oturum ve Rol Kontrolleri
  if (!user) {
    redirect('/login');
  }

  const { data: profileData, error: profileError } = await supabase
    .from('profiller').select('rol').eq('id', user.id).single();

  if (profileError || !profileData) {
    console.error("Profil çekme hatası veya profil bulunamadı:", profileError);
    redirect('/login'); 
  }

  const userRole = profileData.rol;
  if (!ALLOWED_ROLES.includes(userRole)) {
    redirect('/'); 
  }
  
  // Tüm kontrollerden geçildikten sonra, kullanıcı bilgisi ve sayfa içeriği (children)
  // görsel iskeleti oluşturan Client Component'e prop olarak gönderilir.
  return (
  <AdminLayoutClient user={user} userRole={userRole}>
      {children}
    </AdminLayoutClient>
  );
}