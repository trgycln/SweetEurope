// app/[locale]/login/page.tsx (YENİ SUNUCU TARAFI TAŞIYICI)

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getDictionary } from '@/dictionaries';
import { Locale } from '@/i18n-config';
import LoginForm from '@/components/LoginForm'; // YENİ: Oluşturacağımız bileşeni import ediyoruz

export default async function LoginPage({ params }: { params: { locale: Locale } }) {
    const supabase = createSupabaseServerClient();
    const dictionary = await getDictionary(params.locale);

    const { data: { user } } = await supabase.auth.getUser();

    // Eğer kullanıcı zaten giriş yapmışsa, onu ilgili dashboard'a yönlendir
    if (user) {
        const { data: profile } = await supabase.from('profiller').select('rol').eq('id', user.id).single();
        if (profile?.rol === 'Yönetici' || profile?.rol === 'Ekip Üyesi') {
            redirect('/admin/dashboard');
        } else {
            redirect('/portal/dashboard');
        }
    }
    
    // Kullanıcı giriş yapmamışsa, LoginForm istemci bileşenini render et ve
    // ona doğru dil sözlüğünü prop olarak gönder.
    return <LoginForm dictionary={dictionary} />;
}