// src/components/Referanslar.tsx
import { createSupabaseServerClient } from "@/lib/supabase/server";
import Image from "next/image";

export async function Referanslar() {
    const supabase = createSupabaseServerClient();

    // Veritabanından referans olarak gösterilmesi istenen firmaları çek
    const { data: referanslar } = await supabase
        .from('firmalar')
        .select('id, unvan, firma_logosu_url')
        .eq('referans_olarak_goster', true);

    // Eğer gösterilecek referans yoksa, bölümü hiç render etme
    if (!referanslar || referanslar.length === 0) {
        return null;
    }

    return (
        <section className="bg-secondary py-16">
            <div className="container mx-auto text-center">
                <h2 className="font-serif text-3xl font-bold text-primary mb-4">Bize Güvenenler</h2>
                <p className="text-text-main/80 max-w-2xl mx-auto mb-10">Sektörün önde gelen kafe, restoran ve otelleriyle çalışmaktan gurur duyuyoruz.</p>
                <div className="flex justify-center items-center gap-8 flex-wrap">
                    {referanslar.map(firma => (
                        <div key={firma.id} className="relative h-20 w-40 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-300">
                            {firma.firma_logosu_url && (
                                <Image
                                    src={firma.firma_logosu_url}
                                    alt={`${firma.unvan} logo`}
                                    fill
                                    className="object-contain"
                                />
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}