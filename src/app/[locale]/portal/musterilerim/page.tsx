import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Locale } from '@/i18n-config';
import { getDictionary } from '@/dictionaries';
import { redirect } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { CustomersPageClient } from '@/components/portal/musterilerim/CustomersPageClient';
import { addMyCustomerAction } from './actions';
import { Constants } from '@/lib/supabase/database.types';

export const dynamic = 'force-dynamic';

export default async function MusterilerimPage({ params }: { params: Promise<{ locale: Locale }> }) {
  noStore();
  const { locale } = await params;

  const dictionary = await getDictionary(locale);
  const content = (dictionary as any).portal?.customersPage || {};

  const labels = {
    title: content.title || 'My Customers',
    subtitle: content.subtitle || 'Your registered customers',
    addCustomerButton: content.addCustomerButton || 'Add New Customer',
    totalCustomers: content.totalCustomers || 'customers',
    modal: content.modal || {},
    list: content.list || {},
  };

  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect(`/${locale}/login`);

  const { data: customers, error } = await supabase
    .from('firmalar')
    .select('id, unvan, telefon, email, kategori, status, created_at')
    .eq('sahip_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading customers:', error);
    return <div className="p-6 text-red-500 bg-red-50 rounded-lg">Error loading customers.</div>;
  }

  const statusOptions = [...Constants.public.Enums.firma_status];
  const categoryOptions = ['Kafe', 'Restoran', 'Otel', 'Market'];

  async function handleSubmit(formData: FormData) {
    'use server';
    await addMyCustomerAction(formData, locale);
  }

  return (
    <CustomersPageClient
      customers={customers || []}
      locale={locale}
      onSubmit={handleSubmit}
      labels={labels}
      statusOptions={statusOptions}
      categoryOptions={categoryOptions}
    />
  );
}
