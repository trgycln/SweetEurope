// src/app/portal/materyaller/page.tsx

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { FiDownload, FiFileText } from 'react-icons/fi';
import { MateryalIndirButton } from '@/components/portal/materyal-indir-button'; // Yeni Client Component

export default async function PartnerMateryallerPage() {
    const supabase = createSupabaseServerClient();
    
    // RLS politikası, kullanıcının rolüne göre sadece yetkili olduğu materyalleri çeker.
    const { data: materyaller, error } = await supabase
        .from('pazarlama_materyalleri')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Materyal çekme hatası:", error);
        return <div>Materyaller yüklenirken bir hata oluştu.</div>
    }

    return (
        <div className="space-y-8">
            <header>
                <h1 className="font-serif text-4xl font-bold text-primary">Pazarlama Materyalleri</h1>
                <p className="text-text-main/80 mt-1">İşinizi büyütmek için profesyonel içeriklerimizden yararlanın.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {materyaller.map(materyal => (
                    <div key={materyal.id} className="bg-white rounded-lg shadow-lg p-6 flex flex-col">
                        <FiFileText size={40} className="text-accent mb-4"/>
                        <h2 className="font-serif text-xl font-bold text-primary">{materyal.baslik}</h2>
                        <p className="text-sm text-text-main/70 mt-2 flex-grow">{materyal.aciklama}</p>
                        <p className="text-xs text-gray-400 mt-4">Kategori: {materyal.kategori}</p>
                        <MateryalIndirButton dosyaYolu={materyal.dosya_url} dosyaAdi={materyal.dosya_adi} />
                    </div>
                ))}
                {materyaller.length === 0 && <p>Size uygun bir materyal bulunmamaktadır.</p>}
            </div>
        </div>
    );
}