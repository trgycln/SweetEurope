// src/app/portal/layout.tsx
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { PortalHeader } from "@/components/portal/PortalHeader";
import { PortalSidebar } from "@/components/portal/PortalSidebar";
import { Enums } from "@/lib/supabase/database.types";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return notFound();

    const [firmaRes, profilRes] = await Promise.all([
        supabase.from('firmalar').select('unvan').eq('portal_kullanicisi_id', user.id).single(),
        supabase.from('profiller').select('rol').eq('id', user.id).single()
    ]);
    
    const userRole = profilRes.data?.rol ?? null;

    return (
        <div className="h-screen w-full bg-secondary text-text-main antialiased font-sans">
            {/* Doğru PortalSidebar'ı çağırıyoruz */}
            <PortalSidebar userRole={userRole} />
            <div className="flex h-full flex-col lg:ml-64">
                <PortalHeader firmaUnvan={firmaRes.data?.unvan || 'Partner'} />
                <main className="flex-1 overflow-y-auto p-8 pt-24">
                    {children}
                </main>
            </div>
        </div>
    );
}