'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { FiUsers, FiExternalLink } from 'react-icons/fi';

interface DistributorsListProps {
    locale: string;
    dictionary: any;
    cookieStore: any;
}

export async function DistributorsList({ locale, dictionary, cookieStore }: DistributorsListProps) {
    const supabase = await createSupabaseServerClient(cookieStore);

    // Get alt bayi users and/or firm records
    const [{ data: altBayiProfiles }, { data: altBayiFirmalar }] = await Promise.all([
        supabase
            .from('profiller')
            .select('id, firma_adi, firma_id')
            .eq('rol', 'Alt Bayi'),
        supabase
            .from('firmalar')
            .select('id, unvan, sahip_id, kategori, ticari_tip')
            .or('ticari_tip.eq.alt_bayi,kategori.eq.Alt Bayi')
    ]);

    const profileById = new Map((altBayiProfiles || []).map((profile) => [profile.id, profile]));
    const firmOwnerIds = new Set((altBayiFirmalar || []).map((firma) => firma.sahip_id).filter(Boolean) as string[]);

    const distributorsSeed = [
        ...(altBayiFirmalar || []).map((firma) => {
            const ownerId = firma.sahip_id ?? null;
            const profile = ownerId ? profileById.get(ownerId) : null;
            return {
                id: `firma:${firma.id}`,
                firmaId: firma.id,
                ownerId,
                displayName: profile?.firma_adi || firma.unvan || 'Unknown'
            };
        }),
        ...(altBayiProfiles || [])
            .filter((profile) => !firmOwnerIds.has(profile.id))
            .map((profile) => ({
                id: `profil:${profile.id}`,
                firmaId: profile.firma_id ?? null,
                ownerId: profile.id,
                displayName: profile.firma_adi || 'Unknown'
            }))
    ];

    if (distributorsSeed.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500">
                <FiUsers className="mx-auto text-4xl text-gray-300 mb-3" />
                <p>{locale === 'tr' ? 'Henüz alt bayi bulunmamaktadır.' : 'Es gibt noch keine Distributoren.'}</p>
            </div>
        );
    }

    // Get customer count by category for each distributor
    const distributorsWithCustomers = await Promise.all(
        distributorsSeed.map(async (distributor) => {
            let ownerIds: string[] = [];

            if (distributor.firmaId) {
                const { data: altBayiFirma } = await supabase
                    .from('firmalar')
                    .select('sahip_id, ticari_tip')
                    .eq('id', distributor.firmaId)
                    .single();

                const { data: subDealerProfiles } = await supabase
                    .from('profiller')
                    .select('id, rol, firma_id')
                    .eq('firma_id', distributor.firmaId);

                ownerIds = (subDealerProfiles || [])
                    .filter((p: any) => p.rol === 'Alt Bayi')
                    .map((p: any) => p.id);

                if (ownerIds.length === 0 && altBayiFirma?.sahip_id) {
                    ownerIds.push(altBayiFirma.sahip_id);
                }

                if (ownerIds.length === 0 && altBayiFirma?.ticari_tip === 'alt_bayi') {
                    const { data: altBayiOnlyProfiles } = await supabase
                        .from('profiller')
                        .select('id')
                        .eq('rol', 'Alt Bayi');

                    if ((altBayiOnlyProfiles || []).length === 1) {
                        const fallbackId = altBayiOnlyProfiles![0].id;
                        ownerIds.push(fallbackId);
                        await supabase
                            .from('firmalar')
                            .update({ sahip_id: fallbackId })
                            .eq('id', distributor.firmaId);
                    }
                }
            }

            if (ownerIds.length === 0 && distributor.ownerId) {
                ownerIds = [distributor.ownerId];
            }

            // CRITICAL FIX: Some customers may use firma_id directly as sahip_id
            if (ownerIds.length === 0 && distributor.firmaId) {
                ownerIds = [distributor.firmaId];
            }

            if (ownerIds.length === 0) {
                return {
                    ...distributor,
                    customerCount: 0,
                    categoryBreakdown: {}
                };
            }

            const { data: customers, error: customerError } = await supabase
                .from('firmalar')
                .select('kategori')
                .in('sahip_id', ownerIds)
                .or('ticari_tip.eq.musteri,ticari_tip.is.null');

            if (customerError) {
                console.error('Dashboard DistributorsList customer query error for', distributor.displayName, ':', customerError);
            }
            console.log('Dashboard DistributorsList - Distributor:', distributor.displayName, 'Owner IDs:', ownerIds, 'Customers:', customers?.length ?? 0);

            // Group by category
            const categoryCount: Record<string, number> = {};
            (customers || []).forEach(customer => {
                const category = customer.kategori || 'Diğer';
                categoryCount[category] = (categoryCount[category] || 0) + 1;
            });

            return {
                ...distributor,
                customerCount: customers?.length ?? 0,
                categoryBreakdown: categoryCount
            };
        })
    );

    // Sort by customer count descending
    distributorsWithCustomers.sort((a, b) => b.customerCount - a.customerCount);

    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead>
                    <tr className="border-b border-gray-200">
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                            {locale === 'tr' ? 'Alt Bayi Adı' : 'Distributor Name'}
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                            {locale === 'tr' ? 'Kategoriye Göre Müşteri Sayısı' : 'Kunden nach Kategorie'}
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                            {locale === 'tr' ? 'Toplam Müşteri' : 'Gesamt'}
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                            {locale === 'tr' ? 'İşlemler' : 'Aktionen'}
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {distributorsWithCustomers.map((distributor) => (
                        <tr key={distributor.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 text-sm font-medium text-primary">
                                {distributor.displayName || 'Unknown'}
                            </td>
                            <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-2">
                                    {Object.entries(distributor.categoryBreakdown).length > 0 ? (
                                        Object.entries(distributor.categoryBreakdown)
                                            .sort(([, a], [, b]) => b - a)
                                            .map(([category, count]) => (
                                                <span 
                                                    key={category}
                                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700"
                                                >
                                                    <span className="font-semibold">{category}:</span>
                                                    <span className="text-primary font-bold">{count}</span>
                                                </span>
                                            ))
                                    ) : (
                                        <span className="text-xs text-gray-400">
                                            {locale === 'tr' ? 'Henüz müşteri yok' : 'Noch keine Kunden'}
                                        </span>
                                    )}
                                </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                                <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
                                    {distributor.customerCount}
                                </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                                <Link 
                                    href={distributor.firmaId ? `/${locale}/admin/crm/firmalar/${distributor.firmaId}/musteriler` : `/${locale}/admin/crm/firmalar?sahip_id=${distributor.ownerId ?? ''}`}
                                    className="inline-flex items-center gap-1 text-accent hover:underline font-semibold text-sm"
                                >
                                    <FiExternalLink size={14} />
                                    {locale === 'tr' ? 'Göster' : 'Anzeigen'}
                                </Link>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
