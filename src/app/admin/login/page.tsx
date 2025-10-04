// src/app/admin/login/page.tsx
import AdminLoginForm from './AdminLoginForm';
import { redirect } from 'next/navigation';

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers'; 

// Admin Giriş Sayfası (Server Component)
export default async function AdminLoginPage() {
    
    // Server Side Supabase Client'ı oluştur
    const supabase = createServerComponentClient({
        cookies: () => cookies(), 
    }); 

    // Oturum kontrolü: Kullanıcı oturum açmış mı?
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        // Oturum açmışsa, hemen profiles tablosundan rolünü kontrol et.
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
        
        // KRİTİK KONTROL: Eğer rolü Admin ise Dashboard'a yönlendir.
        if (profile?.role === 'admin') {
            redirect('/admin/dashboard'); 
        } else {
            // Rolü Admin değilse (partner, vs.), ana sayfaya veya başka bir yere yönlendir.
            // Bu, sorgusuz girişi engeller.
            redirect('/'); 
        }
    }

    // Eğer oturum açmamışsa, formu göster
    return (
        <div className="flex justify-center items-center min-h-screen bg-gray-100">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-xl">
                <h2 className="text-2xl font-bold text-center">Yönetici Girişi</h2>
                <AdminLoginForm />
            </div>
        </div>
    );
}