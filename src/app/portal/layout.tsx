// src/app/portal/layout.tsx
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { PortalHeader } from "@/components/portal/PortalHeader"; // Neue Komponente
import { PortalSidebar } from "@/components/portal/PortalSidebar"; // Neue Komponente

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return notFound();

    // Finde die Firma, die mit dem eingeloggten Benutzer verknüpft ist
    const { data: firma } = await supabase
        .from('firmalar')
        .select('unvan')
        .eq('portal_kullanicisi_id', user.id)
        .single();
    
    // Die Portal-Struktur mit Header, Sidebar und dem Inhalt der Seite
    return (
        <div className="h-screen w-full bg-secondary text-text-main antialiased font-sans">
            <PortalSidebar />
            <div className="flex h-full flex-col lg:ml-64">
                <PortalHeader firmaUnvan={firma?.unvan || 'Partner'} />
                <main className="flex-1 overflow-y-auto p-8 pt-24">
                    {children}
                </main>
            </div>
        </div>
    );
}