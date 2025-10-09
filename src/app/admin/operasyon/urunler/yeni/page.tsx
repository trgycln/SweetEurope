// src/app/admin/operasyon/urunler/yeni/page.tsx
import { UrunFormu } from "@/components/urun-formu";
import { createSupabaseServerClient } from "@/lib/supabase/server";
// (Gerekli diğer importlar: Yönetici kontrolü için)

export default async function YeniUrunPage() {
    const supabase = createSupabaseServerClient();
    // ... (Yönetici rol kontrolü burada yapılmalı)
    const { data: tedarikciler } = await supabase.from('tedarikciler').select('id, ad');
    return <UrunFormu tedarikciler={tedarikciler || []} />;
}