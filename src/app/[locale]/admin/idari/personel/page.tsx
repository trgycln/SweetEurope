// src/app/[locale]/admin/idari/personel/page.tsx
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Locale } from '@/i18n-config';
import PersonelManager from '@/components/admin/personel/PersonelManager';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ locale: Locale }>;
}

export default async function PersonelPage({ params }: PageProps) {
  const { locale } = await params;
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect(`/${locale}/login?next=/${locale}/admin/idari/personel`);

  const { data: profile } = await supabase
    .from('profiller')
    .select('rol')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || (profile.rol !== 'Yönetici' && profile.rol !== 'Ekip Üyesi')) {
    return redirect(`/${locale}/admin`);
  }

  const { data: personel } = await supabase
    .from('profiller')
    .select('id, tam_ad')
    .eq('rol', 'Personel')
    .order('tam_ad');

  return (
    <main className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-primary">Personel Yönetimi</h1>
        <p className="text-sm text-gray-600">Personel oluştur, düzenle ve sil.</p>
      </header>

      <PersonelManager initialPersonel={personel || []} />
    </main>
  );
}
