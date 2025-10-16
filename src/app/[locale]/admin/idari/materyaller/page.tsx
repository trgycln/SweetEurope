// src/app/admin/idari/materyaller/page.tsx
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { FiFileText, FiPlus, FiTrash2, FiUploadCloud } from 'react-icons/fi';
import { revalidatePath } from 'next/cache';
import { deleteFileAction } from '@/app/actions/storage-actions';

// Yeni materyal ekleyen Server Action
async function materyalEkleAction(formData: FormData) {
    'use server';
    const supabase = createSupabaseServerClient();

    const file = formData.get('file') as File;
    if (!file || file.size === 0) return { error: 'Lütfen bir dosya seçin.' };

    const rawData = {
        baslik: formData.get('baslik') as string,
        aciklama: formData.get('aciklama') as string,
        kategori: formData.get('kategori'),
        hedef_kitle: formData.get('hedef_kitle'),
    };

    // 1. Dosyayı Storage'a yükle
    const filePath = `${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
        .from('pazarlama-materyalleri')
        .upload(filePath, file);
    
    if (uploadError) return { error: `Dosya yüklenemedi: ${uploadError.message}` };

    // 2. Veritabanına metaveriyi kaydet
    const { error: insertError } = await supabase.from('pazarlama_materyalleri').insert({
        ...rawData,
        dosya_url: filePath,
        dosya_adi: file.name,
        dosya_boyutu_kb: Math.round(file.size / 1024),
    });

    if (insertError) return { error: `Veritabanı kaydı başarısız: ${insertError.message}` };
    
    revalidatePath('/admin/idari/materyaller');
}

// Materyali silen Server Action
async function materyalSilAction(materyalId: string, dosyaYolu: string) {
    'use server';
    const supabase = createSupabaseServerClient();

    // 1. Storage'dan dosyayı sil
    await deleteFileAction(dosyaYolu, 'pazarlama-materyalleri');

    // 2. Veritabanından kaydı sil
    await supabase.from('pazarlama_materyalleri').delete().eq('id', materyalId);
    
    revalidatePath('/admin/idari/materyaller');
}


export default async function MateryalYonetimPage() {
    const supabase = createSupabaseServerClient();
    const { data: materyaller } = await supabase.from('pazarlama_materyalleri').select('*').order('created_at', { ascending: false });

    return (
        <div className="space-y-8">
            <header>
                <h1 className="font-serif text-4xl font-bold text-primary">Pazarlama Materyalleri Yönetimi</h1>
                <p className="text-text-main/80 mt-1">Partnerlerinizle paylaşmak için yeni materyaller yükleyin ve mevcutları yönetin.</p>
            </header>

            {/* Yükleme Formu */}
            <div className="bg-white p-6 rounded-2xl shadow-lg">
                <h2 className="font-serif text-2xl font-bold text-primary mb-4">Yeni Materyal Yükle</h2>
                <form action={materyalEkleAction} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
                    {/* Form alanları */}
                    <input name="baslik" placeholder="Başlık" required className="w-full p-2 border rounded"/>
                    <select name="kategori" required className="w-full p-2 border rounded">
                        <option value="Broşürler">Broşürler</option>
                        <option value="Ürün Fotoğrafları">Ürün Fotoğrafları</option>
                        <option value="Sosyal Medya Kitleri">Sosyal Medya Kitleri</option>
                        <option value="Fiyat Listeleri">Fiyat Listeleri</option>
                        <option value="Diğer">Diğer</option>
                    </select>
                    <select name="hedef_kitle" required className="w-full p-2 border rounded">
                        <option value="Tüm Partnerler">Tüm Partnerler</option>
                        <option value="Sadece Alt Bayiler">Sadece Alt Bayiler</option>
                    </select>
                    <input type="file" name="file" required className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-accent/20 file:text-accent hover:file:bg-accent/30"/>
                    <input name="aciklama" placeholder="Açıklama (opsiyonel)" className="md:col-span-2 lg:col-span-3 w-full p-2 border rounded"/>
                    <button type="submit" className="flex items-center justify-center gap-2 px-4 py-2 bg-accent text-white font-bold rounded-lg"><FiUploadCloud/> Yükle</button>
                </form>
            </div>

            {/* Liste */}
            <div className="bg-white p-6 rounded-2xl shadow-lg">
                <h2 className="font-serif text-2xl font-bold text-primary mb-4">Yüklenmiş Materyaller</h2>
                <ul className="divide-y divide-gray-200">
                    {materyaller?.map(m => (
                        <li key={m.id} className="py-3 flex justify-between items-center">
                           <div className='flex items-center gap-3'>
                                <FiFileText className='text-accent'/>
                                <div>
                                    <p className='font-bold text-primary'>{m.baslik}</p>
                                    <p className='text-sm text-gray-500'>{m.kategori} - {m.hedef_kitle}</p>
                                </div>
                           </div>
                           <form action={materyalSilAction.bind(null, m.id, m.dosya_url)}>
                                <button type="submit" className='text-red-500 hover:text-red-700 p-2'><FiTrash2/></button>
                           </form>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}