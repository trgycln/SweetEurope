import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Locale } from '@/i18n-config';
import { getDictionary } from '@/dictionaries';
import PriceMatrixClient from './PriceMatrixClient';

interface PageProps {
    params: Promise<{ locale: Locale }>;
}

export default async function FiyatMatrisiPage({ params }: PageProps) {
    const { locale } = await params;
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    const dictionary = await getDictionary(locale);

    // Check authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (!user || userError) {
        redirect(`/${locale}/login?next=/admin/urun-yonetimi/fiyat-matrisi`);
    }

    // Check role - only admin/team
    const { data: profile } = await supabase
        .from('profiller')
        .select('rol')
        .eq('id', user.id)
        .single();

    const userRole = profile?.rol;
    if (userRole !== 'Yönetici' && userRole !== 'Ekip Üyesi') {
        redirect(`/${locale}/login`);
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <header className="mb-8">
                <h1 className="font-serif text-4xl font-bold text-primary mb-2">
                    💰 Fiyat Karşılaştırma Matrisi
                </h1>
                <p className="text-gray-600">
                    Tüm ürünlerin firmalar ve alt bayilere sattığınız fiyatlarını karşılaştırın
                </p>
            </header>

            <PriceMatrixClient locale={locale} />
        </div>
    );
}

