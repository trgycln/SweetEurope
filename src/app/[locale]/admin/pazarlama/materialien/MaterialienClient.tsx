// src/app/[locale]/admin/pazarlama/materialien/MaterialienClient.tsx (useParams Korrektur)
'use client';

import React, { useTransition } from 'react';
import Link from 'next/link';
// KORREKTUR: Stelle sicher, dass useParams aus 'next/navigation' importiert wird
import { useParams, useRouter } from 'next/navigation';
import { Database, Tables, Enums } from '@/lib/supabase/database.types';
import { FiPlus, FiPaperclip, FiDownload, FiTrash2, FiUsers, FiTag, FiLoader } from 'react-icons/fi';
import MaterialienFiltreleri from './MaterialienFiltreleri';
import { deleteMaterialAction } from './actions';
import { toast } from 'sonner';

type MaterialRow = Tables<'pazarlama_materyalleri'>;

interface MaterialienClientProps {
    materialListe: MaterialRow[];
    kategorieOptions: Enums<'materyal_kategori'>[];
    hedefKitleOptions: Enums<'hedef_rol'>[];
}

// Delete Button (unverändert)
function DeleteMaterialButton({ material }: { material: MaterialRow }) {
    const [isPending, startTransition] = useTransition();

    const handleDelete = () => {
        if (confirm(`Sind Sie sicher, dass Sie "${material.baslik}" löschen möchten?`)) {
            startTransition(async () => {
                let filePath: string | null = null;
                if (material.dosya_url) {
                    try {
                        const url = new URL(material.dosya_url);
                        const pathSegments = url.pathname.split('/');
                        if (pathSegments.length > 2) {
                             filePath = pathSegments.slice(2).join('/');
                        }
                    } catch (e) { console.error("Ungültige Datei-URL:", material.dosya_url); }
                }
                const result = await deleteMaterialAction({ materialId: material.id, filePath });
                if (result.success) {
                    toast.success(result.message);
                } else {
                    toast.error(result.message);
                }
            });
        }
    };

    return (
        <button onClick={handleDelete} disabled={isPending} className="text-red-500 hover:text-red-700 inline-flex items-center gap-1 disabled:opacity-50" title="Löschen">
            {isPending ? <FiLoader className="animate-spin" /> : <FiTrash2 size={16} />}
            <span className="hidden sm:inline">Löschen</span>
        </button>
    );
}

// Haupt-Client Komponente
export function MaterialienClient({ materialListe, kategorieOptions, hedefKitleOptions }: MaterialienClientProps) {
    const params = useParams();
    // KORREKTUR: Stelle sicher, dass params existiert und locale ein String ist. Fallback auf 'de'.
    const locale = (params?.locale as string) || 'de';

    const materialAnzahl = materialListe.length;

    const formatBytes = (bytes: number | null, decimals = 1) => {
        if (!bytes || bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        const size = typeof bytes === 'number' ? parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) : 0;
        return size + ' ' + sizes[i];
    }

    const hasActiveFilters = typeof window !== 'undefined' && window.location.search.length > 1;

     return (
        <div className="space-y-8">
            <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="font-serif text-4xl font-bold text-primary">Marketingmaterialien</h1>
                    <p className="text-text-main/80 mt-1">{materialAnzahl} Materialien aufgelistet.</p>
                </div>
                {/* locale wird hier verwendet */}
                <Link href={`/${locale}/admin/pazarlama/materialien/yeni`} passHref>
                    <button className="flex items-center justify-center gap-2 px-5 py-3 bg-accent text-white rounded-lg shadow-md hover:bg-opacity-90 transition-all duration-200 font-bold text-sm w-full sm:w-auto">
                        <FiPlus size={18} />
                        Neues Material hochladen
                    </button>
                </Link>
            </header>

            <MaterialienFiltreleri kategorieOptions={kategorieOptions} hedefKitleOptions={hedefKitleOptions} />

            {materialAnzahl === 0 ? (
                <div className="mt-12 text-center p-10 border-2 border-dashed border-bg-subtle rounded-lg bg-white shadow-sm">
                    <FiPaperclip className="mx-auto text-5xl text-gray-300 mb-4" />
                    <h2 className="font-serif text-2xl font-semibold text-primary">
                        {hasActiveFilters ? 'Keine Materialien für Filter gefunden' : 'Noch keine Materialien hochgeladen'}
                    </h2>
                    <p className="mt-2 text-text-main/70">
                        {hasActiveFilters ? 'Ändern Sie Ihre Filterkriterien.' : 'Laden Sie das erste Marketingmaterial hoch.'}
                    </p>
                </div>
            ) : (
                <div className="overflow-x-auto bg-white rounded-lg shadow-md">
                    <table className="min-w-full divide-y divide-bg-subtle">
                        <thead className="bg-bg-subtle">
                            <tr>
                                {['Titel', 'Kategorie', 'Zielgruppe', 'Dateiname', 'Größe', 'Aktionen'].map(header => (
                                    <th key={header} scope="col" className="px-6 py-3 text-left text-xs font-bold text-text-main uppercase tracking-wider">
                                        {header}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-bg-subtle">
                            {materialListe.map((material) => (
                                <tr key={material.id} className="hover:bg-bg-subtle/50 transition-colors duration-150">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-primary">{material.baslik}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-main">
                                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                            <FiTag size={12} /> {material.kategori}
                                        </span>
                                    </td>
                                     <td className="px-6 py-4 whitespace-nowrap text-sm text-text-main">
                                         <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                             <FiUsers size={12} /> {material.hedef_kitle}
                                         </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-main font-mono">{material.dosya_adi || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-main">{formatBytes(material.dosya_boyutu_kb ? material.dosya_boyutu_kb * 1024 : null)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-4">
                                        <a href={material.dosya_url} target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent-dark inline-flex items-center gap-1" title="Herunterladen">
                                            <FiDownload size={16} /> <span className="hidden sm:inline">Download</span>
                                        </a>
                                        <DeleteMaterialButton material={material} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}