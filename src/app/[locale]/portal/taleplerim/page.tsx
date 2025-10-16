// src/app/portal/taleplerim/page.tsx
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Enums } from "@/lib/supabase/database.types";
import Link from 'next/link';

export default async function PartnerTaleplerimPage() {
    const supabase = createSupabaseServerClient();
    // RLS filtert automatisch
    const { data: talepler, error } = await supabase
        .from('numune_talepleri')
        .select('id, durum, created_at, urunler(urun_adi)')
        .order('created_at', { ascending: false });

    return (
        <div className="space-y-8">
            <header><h1 className="font-serif text-4xl font-bold text-primary">Numune Taleplerim</h1></header>
            <div className="bg-white rounded-lg shadow-md divide-y">
                {talepler?.map(talep => (
                    <div key={talep.id} className="p-4 flex justify-between items-center">
                        <div>
                            <p className="font-bold text-primary">{talep.urunler?.urun_adi}</p>
                            <p className="text-sm text-gray-500">Talep Tarihi: {new Date(talep.created_at).toLocaleDateString('tr-TR')}</p>
                        </div>
                        <span className="text-sm font-semibold px-2 py-1 bg-blue-100 text-blue-800 rounded-full">{talep.durum}</span>
                    </div>
                ))}
                {talepler?.length === 0 && <p className="p-8 text-center text-gray-500">Henüz numune talebiniz yok.</p>}
            </div>
        </div>
    );
}