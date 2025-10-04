// src/app/admin/login/actions.ts
'use server';

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'; 
import { cookies } from 'next/headers'; 
import { redirect } from 'next/navigation';

interface AuthResult {
    success: boolean;
    message: string;
}

// KRİTİK DÜZELTME: createServerComponentClient'ın doğru kullanımı.
// URL ve Key, sadece çerez fonksiyonu döndüren obje içinde DEĞİL, 
// doğrudan createServerComponentClient'a ayrı parametreler olarak geçirilmelidir.
// Ancak auth-helpers'ın en yeni ve önerilen kullanımı budur:
const createSupabaseClient = () => createServerComponentClient({
    // Tek zorunlu parametre çerezleri döndüren fonksiyondur.
    cookies: () => cookies(), 
});

/**
 * Admin girişi yapar (auth-helpers ile çerezleri ayarlar).
 */
export async function adminSignIn(email: string, password: string): Promise<AuthResult> {
    const supabase = createSupabaseClient();

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        console.error("Giriş Hatası:", error.message);
        return { success: false, message: "E-posta veya şifre yanlış. Detay: " + error.message };
    }

    return { success: true, message: "Giriş başarılı." };
}

/**
 * Güvenli bir şekilde oturumu kapatır ve login sayfasına yönlendirir.
 */
export async function adminSignOut(): Promise<void> {
    const supabase = createSupabaseClient();
    await supabase.auth.signOut();
    
    redirect('/admin/login');
}