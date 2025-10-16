// src/components/portal/dashboard/Announcements.tsx
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getDictionary } from '@/dictionaries';
import { Locale } from '@/i18n-config';
import { FiDownload } from 'react-icons/fi';

export async function Announcements({ locale }: { locale: Locale }) {
    const dictionary = await getDictionary(locale);
    const content = dictionary.portal.dashboard;
    const supabase = createSupabaseServerClient();
    
    // TODO: 'hedef_kitle' rolüne göre filtreleme eklenmeli (Tüm Partnerler, Alt Bayiler vb.)
    const { data: materials } = await supabase
        .from('pazarlama_materyalleri')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);

    return (
        <div className="bg-white p-6 rounded-2xl shadow-lg">
            <h3 className="font-serif text-xl font-bold text-primary mb-4">{content.announcementsTitle}</h3>
            {materials && materials.length > 0 ? (
                <ul className="space-y-3">
                    {materials.map(material => (
                        <li key={material.id}>
                            <a href={material.dosya_url} target="_blank" rel="noopener noreferrer" 
                               className="flex items-center justify-between p-3 bg-secondary rounded-lg hover:bg-bg-subtle transition-colors">
                                <div>
                                    <p className="font-semibold text-sm">{material.baslik}</p>
                                    <p className="text-xs text-text-main/60">{material.aciklama}</p>
                                </div>
                                <FiDownload className="text-accent" />
                            </a>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-sm text-text-main/70">{content.announcementsPlaceholder}</p>
            )}
        </div>
    );
}