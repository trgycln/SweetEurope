// app/[locale]/portal/layout.tsx (BİLDİRİM VERİSİ ÇEKME EKLENDİ)

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { PortalProvider } from '@/contexts/PortalContext';
import { PortalContainer } from '@/components/portal/PortalContainer';
import { Toaster } from 'sonner';
import { Database } from '@/lib/supabase/database.types';

type ProfileWithFirma = Database['public']['Tables']['profiller']['Row'] & {
    firmalar: (Database['public']['Tables']['firmalar']['Row'] & {
        firmalar_finansal: Database['public']['Tables']['firmalar_finansal']['Row'][] | null;
    }) | null;
};

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
    const supabase = createSupabaseServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return redirect('/login');
    }

    // YENİ EKLEME: Promise.all ile tüm başlangıç verilerini tek seferde çekelim
    const [profileData, notificationsData] = await Promise.all([
        supabase
            .from('profiller')
            .select(`*, firmalar!profiller_firma_id_fkey (*, firmalar_finansal (*))`)
            .eq('id', user.id)
            .single(),
        supabase
            .from('bildirimler')
            .select('*', { count: 'exact' })
            .eq('alici_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10)
    ]);

    const { data, error } = profileData;
    const profile = data as ProfileWithFirma | null;
    const firma = profile?.firmalar;

    if (error || !profile || !firma) {
        console.error("Portal erişim hatası:", { error });
        return redirect('/login?error=unauthorized');
    }
    
    // YENİ EKLEME: Bildirim verilerini context'e eklemek için hazırlıyoruz.
    const initialNotifications = notificationsData.data || [];
    const unreadNotificationCount = notificationsData.count !== null 
        ? (await supabase.from('bildirimler').select('*', { count: 'exact', head: true }).eq('alici_id', user.id).eq('okundu_mu', false)).count ?? 0
        : 0;

    const portalContextValue = { 
        profile, 
        firma,
        // YENİ EKLEME:
        initialNotifications,
        unreadNotificationCount
    };

    return (
        <PortalProvider value={portalContextValue}>
            <PortalContainer>
                {children}
            </PortalContainer>
            <Toaster position="top-right" richColors />
        </PortalProvider>
    );
}