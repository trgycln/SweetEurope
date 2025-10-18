// app/[locale]/portal/layout.tsx (DİL DESTEĞİ EKLENMİŞ NİHAİ HALİ)

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { PortalProvider } from '@/contexts/PortalContext';
import { PortalContainer } from '@/components/portal/PortalContainer';
import { Toaster } from 'sonner';
import { Database } from '@/lib/supabase/database.types';
import { getDictionary } from '@/dictionaries'; // DİKKAT: Bu import'u ekliyoruz
import { Locale } from '@/i18n-config'; // DİKKAT: Bu import'u ekliyoruz

type ProfileWithFirma = Database['public']['Tables']['profiller']['Row'] & {
    firmalar: (Database['public']['Tables']['firmalar']['Row'] & {
        firmalar_finansal: Database['public']['Tables']['firmalar_finansal']['Row'][] | null;
    }) | null;
};

// DİKKAT: Fonksiyon artık 'params' alıyor
export default async function PortalLayout({ children, params }: { children: React.ReactNode; params: { locale: Locale } }) {
    const supabase = createSupabaseServerClient();
    // DİKKAT: Artık 'locale'e göre doğru sözlüğü çekiyoruz
    const dictionary = await getDictionary(params.locale);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return redirect(`/${params.locale}/login`); // Yönlendirmeye locale ekledik
    }

    const [profileData, notificationsData] = await Promise.all([
        supabase.from('profiller').select(`*, firmalar!profiller_firma_id_fkey (*, firmalar_finansal (*))`).eq('id', user.id).single(),
        supabase.from('bildirimler').select('*', { count: 'exact' }).eq('alici_id', user.id).order('created_at', { ascending: false }).limit(10)
    ]);

    const { data, error } = profileData;
    const profile = data as ProfileWithFirma | null;
    const firma = profile?.firmalar;

    if (error || !profile || !firma) {
        console.error("Portal erişim hatası:", { error });
        return redirect(`/${params.locale}/login?error=unauthorized`); // Yönlendirmeye locale ekledik
    }
    
    const initialNotifications = notificationsData.data || [];
    const unreadNotificationCount = notificationsData.count !== null 
        ? (await supabase.from('bildirimler').select('*', { count: 'exact', head: true }).eq('alici_id', user.id).eq('okundu_mu', false)).count ?? 0
        : 0;

    const portalContextValue = { 
        profile, 
        firma,
        initialNotifications,
        unreadNotificationCount
    };

    return (
        <PortalProvider value={portalContextValue}>
            {/* DİKKAT: Artık dictionary'yi PortalContainer'a prop olarak geçiyoruz */}
            <PortalContainer dictionary={dictionary}>
                {children}
            </PortalContainer>
            <Toaster position="top-right" richColors />
        </PortalProvider>
    );
}