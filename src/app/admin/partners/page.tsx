// src/app/admin/partners/page.tsx 

import { dictionary } from "@/dictionaries/de";
import { getAllPartners } from "./actions";
import { PartnerTableWrapper } from "./PartnerTableWrapper"; // WIRD GLEICH ERSTELLT

export default async function AdminPartnersPage() {
    // Datenabruf bleibt auf dem Server (schnell und sicher)
    const partners = await getAllPartners();
    const dict = dictionary;
    const content = dict.adminPartners || {};

    return (
        <div className="p-8">
            <PartnerTableWrapper 
                partners={partners} 
                content={content} 
            />
        </div>
    );
}