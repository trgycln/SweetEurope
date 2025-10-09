// src/app/admin/operasyon/urunler/[urunId]/page.tsx
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { UrunDetayClient } from "@/components/urun-duzenle-client";

export default async function UrunDuzenlePage({ params }: { params: { urunId: string } }) {
    const supabase = createSupabaseServerClient();
    // ... (Veri çekme ve rol kontrolü mantığı burada)
    return <UrunDetayClient urun={urun} tedarikciler={tedarikciler || []} userRole={userProfile?.rol ?? null} />;
}