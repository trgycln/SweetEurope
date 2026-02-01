import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Locale } from '@/i18n-config';
import { getDictionary } from '@/dictionaries';
import { redirect } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { CustomersPageClientWrapper } from '@/components/portal/musterilerim/CustomersPageClientWrapper';
import { addMyCustomerAction } from './actions';
import { Constants } from '@/lib/supabase/database.types';
import { KOLN_PLZ_MAP } from '@/lib/plzLookup';

export const dynamic = 'force-dynamic';

interface MusterilerimPageProps {
  params: Promise<{ locale: Locale }>;
  searchParams?: Promise<{
    q?: string;
    status?: string;
    city?: string;
    district?: string;
    posta_kodu?: string;
    priority_group?: string;
  }>;
}

export default async function MusterilerimPage({ params, searchParams }: MusterilerimPageProps) {
  noStore();
  const { locale } = await params;
  const searchParamsResolved = searchParams ? await searchParams : {};

  const dictionary = await getDictionary(locale);
  const content = (dictionary as any).portal?.customersPage || {};

  const labels = {
    title: content.title || 'Müşterilerim',
    subtitle: content.subtitle || 'Your registered customers',
    addCustomerButton: content.addCustomerButton || 'Add New Customer',
    totalCustomers: content.totalCustomers || 'customers',
    modal: content.modal || {},
    list: content.list || {},
    searchPlaceholder: locale === 'tr' ? 'Firma adı ara...' : 'Firmennamen suchen...',
    allStatusesLabel: locale === 'tr' ? 'Tüm Durumlar' : 'Alle Status',
    allPrioritiesLabel: locale === 'tr' ? 'Tüm Öncelikler' : 'Alle Prioritäten',
    allCitiesLabel: locale === 'tr' ? 'Tüm Şehirler' : 'Alle Städte',
    allDistrictsLabel: locale === 'tr' ? 'Tüm İlçeler' : 'Alle Bezirke',
    allZipCodesLabel: locale === 'tr' ? 'Tüm PLZ Bölgeleri' : 'Alle PLZ-Gebiete',
  };

  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect(`/${locale}/login`);

  // Extract filter values
  const searchQuery = searchParamsResolved.q || '';
  const statusFilter = searchParamsResolved.status || '';
  const cityFilter = searchParamsResolved.city || '';
  const districtFilter = searchParamsResolved.district || '';
  const zipCodeFilter = searchParamsResolved.posta_kodu || '';
  const priorityGroupFilter = searchParamsResolved.priority_group || '';

  // Fetch unique cities, districts, zip codes for filter dropdowns
  const { data: locationData } = await supabase
    .from('firmalar')
    .select('sehir, ilce, posta_kodu')
    .eq('sahip_id', user.id);

  const uniqueCities = Array.from(new Set(locationData?.map(f => f.sehir?.trim()).filter(Boolean))).sort() as string[];
  const uniqueDistricts = Array.from(new Set(locationData?.map(f => f.ilce?.trim()).filter(Boolean))).sort() as string[];
  const uniqueZipCodes = Array.from(new Set(locationData?.map(f => f.posta_kodu?.trim()).filter(Boolean))).sort() as string[];

  // Create zip code labels
  const zipCodeLabels: Record<string, string> = {};
  Object.entries(KOLN_PLZ_MAP).forEach(([plz, data]) => {
    zipCodeLabels[plz] = `${plz} - ${data.district}`;
  });
  locationData?.forEach(f => {
    const zip = f.posta_kodu?.trim();
    if (zip && !zipCodeLabels[zip]) {
      const locationName = f.ilce?.trim() || f.sehir?.trim() || '';
      zipCodeLabels[zip] = locationName ? `${zip} - ${locationName}` : zip;
    }
  });

  // Build query with filters
  let query = supabase
    .from('firmalar')
    .select(`
      id, 
      unvan, 
      telefon, 
      email, 
      kategori, 
      status, 
      created_at,
      adres,
      sehir,
      ilce,
      posta_kodu,
      kaynak,
      oncelik,
      oncelik_puani,
      etiketler,
      son_etkilesim_tarihi,
      google_maps_url,
      instagram_url
    `)
    .eq('sahip_id', user.id)
    .or('ticari_tip.eq.musteri,ticari_tip.is.null');

  // Apply filters
  if (searchQuery) {
    query = query.or(`unvan.ilike.%${searchQuery}%,adres.ilike.%${searchQuery}%`);
  }
  if (statusFilter) {
    query = query.eq('status', statusFilter);
  }
  if (cityFilter) {
    query = query.ilike('sehir', `%${cityFilter}%`);
  }
  if (districtFilter) {
    query = query.ilike('ilce', `%${districtFilter}%`);
  }
  if (zipCodeFilter) {
    query = query.eq('posta_kodu', zipCodeFilter);
  }
  if (priorityGroupFilter) {
    if (priorityGroupFilter === 'A') {
      query = query.gte('oncelik_puani', 80);
    } else if (priorityGroupFilter === 'B') {
      query = query.lt('oncelik_puani', 80).gte('oncelik_puani', 50);
    } else if (priorityGroupFilter === 'C') {
      query = query.lt('oncelik_puani', 50);
    }
  }

  const { data: customers, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading customers:', error);
    return <div className="p-6 text-red-500 bg-red-50 rounded-lg">Error loading customers.</div>;
  }

  const statusOptions = [...Constants.public.Enums.firma_status];
  const categoryOptions = ['Kafe', 'Restoran', 'Otel', 'Market', 'Catering'];

  async function handleSubmit(formData: FormData) {
    'use server';
    await addMyCustomerAction(formData, locale);
  }

  return (
    <CustomersPageClientWrapper
      customers={customers || []}
      locale={locale}
      onSubmit={handleSubmit}
      labels={labels}
      statusOptions={statusOptions}
      categoryOptions={categoryOptions}
      cityOptions={uniqueCities}
      districtOptions={uniqueDistricts}
      zipCodeOptions={uniqueZipCodes}
      zipCodeLabels={zipCodeLabels}
    />
  );
}
