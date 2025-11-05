'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FiPlus, FiFilter, FiEdit, FiTrash2, FiCopy } from 'react-icons/fi';
import { Dictionary } from '@/dictionaries';
import { Locale } from '@/i18n-config';
import { Tables, Enums, Database } from '@/lib/supabase/database.types';
import { formatDate, formatCurrency } from '@/lib/utils';
import { deleteGiderAction, copyGiderlerFromPreviousMonth } from '@/app/actions/gider-actions';
import { toast } from 'sonner';
import { GiderFormModal } from './GiderFormModal';

type GiderWithDetails = Tables<'giderler'> & {
    profiller: { tam_ad: string | null } | null;
    gider_kalemleri: {
        id: string;
        ad: string | null;
        ana_kategori_id: string;
        gider_ana_kategoriler: {
            ad: string | null;
        } | null;
    } | null;
};
type HauptKategorie = Tables<'gider_ana_kategoriler'>;
type GiderKalemi = Tables<'gider_kalemleri'>;

interface GiderlerClientProps {
    initialGiderler: GiderWithDetails[];
    hauptKategorien: HauptKategorie[];
    giderKalemleri: GiderKalemi[];
    availableFrequencies: readonly Database['public']['Enums']['zahlungshaeufigkeit'][];
    dictionary: Dictionary;
    locale: Locale;
    datePeriods: { label: string; value: string }[];
    currentPeriod: string;
}

export function GiderlerClient({
    initialGiderler,
    hauptKategorien,
    giderKalemleri,
    availableFrequencies,
    dictionary,
    locale,
    datePeriods,
    currentPeriod
}: GiderlerClientProps) {
    const router = useRouter();

    // ✅ EINFACHE STATE-VERWALTUNG - Filtern im CLIENT, nicht Server!
    const [selectedHauptCategory, setSelectedHauptCategory] = useState('');
    const [selectedGiderKalemi, setSelectedGiderKalemi] = useState('');
    const [selectedPeriod, setSelectedPeriod] = useState(currentPeriod);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingGider, setEditingGider] = useState<GiderWithDetails | null>(null);
    const [modalKey, setModalKey] = useState(Date.now().toString());

    const content = (dictionary as any).admin?.finans?.giderlerPage || {
        title: "Ausgabenverwaltung",
        description: "Alle Betriebsausgaben auflisten und verwalten.",
        newExpense: "Neue Ausgabe",
        filterByHauptCategory: "Nach Hauptkategorie filtern",
        filterByCategory: "Nach Ausgabenposten filtern",
        allCategories: "Alle Hauptkategorien",
        allSubCategories: "Alle Posten",
        date: "Datum",
        hauptCategory: "Hauptkategorie",
        category: "Ausgabenposten",
        descriptionCol: "Beschreibung",
        amount: "Betrag",
        frequency: "Häufigkeit",
        recordedBy: "Erfasst von",
        actions: "Aktionen",
        edit: "Bearbeiten",
        delete: "Löschen",
        duplicate: "Duplizieren",
        confirmDelete: "Möchten Sie diese Ausgabe wirklich löschen?",
        deleteSuccess: "Ausgabe gelöscht.",
        deleteError: "Fehler beim Löschen.",
        noExpensesFoundFilter: "Für diese Filter wurden keine Ausgaben gefunden.",
        noExpensesYet: "Noch keine Ausgaben erfasst.",
    };

    // ✅ DATUM-BERECHNUNG basierend auf Periode
    useEffect(() => {
        if (selectedPeriod === 'custom') return;

        const now = new Date();
        let start = new Date();
        let end = new Date();

        if (selectedPeriod === 'this-month') {
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        } else if (selectedPeriod === 'last-month') {
            start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            end = new Date(now.getFullYear(), now.getMonth(), 0);
        } else if (selectedPeriod === 'this-year') {
            start = new Date(now.getFullYear(), 0, 1);
            end = new Date(now.getFullYear(), 11, 31);
        }

        const formatDate = (d: Date) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        setDateFrom(formatDate(start));
        setDateTo(formatDate(end));
    }, [selectedPeriod]);

    // ✅ CLIENT-SIDE FILTERING - Super einfach!
    const filteredGiderler = useMemo(() => {
        let result = [...initialGiderler];

        // Filter nach Hauptkategorie
        if (selectedHauptCategory) {
            result = result.filter(g => 
                g.gider_kalemleri?.ana_kategori_id === selectedHauptCategory
            );
        }

        // Filter nach Gider Kalemi
        if (selectedGiderKalemi) {
            result = result.filter(g => g.gider_kalemi_id === selectedGiderKalemi);
        }

        // Filter nach Datum
        if (dateFrom) {
            result = result.filter(g => g.tarih >= dateFrom);
        }
        if (dateTo) {
            result = result.filter(g => g.tarih <= dateTo);
        }

        console.log('🔍 Gefilterte Gider:', result.length, '/', initialGiderler.length);
        return result;
    }, [initialGiderler, selectedHauptCategory, selectedGiderKalemi, dateFrom, dateTo]);

    // ✅ Gider Kalemleri filtern basierend auf Hauptkategorie
    const filteredGiderKalemleri = useMemo(() => {
        if (!selectedHauptCategory) return giderKalemleri;
        return giderKalemleri.filter(k => k.ana_kategori_id === selectedHauptCategory);
    }, [selectedHauptCategory, giderKalemleri]);

    const handleNewExpense = () => {
        setEditingGider(null);
        setModalKey(Date.now().toString());
        setIsModalOpen(true);
    };

    const handleEditExpense = (gider: GiderWithDetails) => {
        setEditingGider(gider);
        setModalKey(gider.id);
        setIsModalOpen(true);
    };

    const handleDuplicateExpense = (gider: GiderWithDetails) => {
        const duplicatedData = { ...gider };
        delete (duplicatedData as any).id;
        delete (duplicatedData as any).created_at;
        delete (duplicatedData as any).islem_yapan_kullanici_id;
        delete (duplicatedData as any).profiller;
        duplicatedData.tarih = new Date().toISOString().split('T')[0];
        setEditingGider(duplicatedData as GiderWithDetails);
        setModalKey(Date.now().toString());
        setIsModalOpen(true);
    };

    const handleDelete = async (gider: GiderWithDetails) => {
        if (window.confirm(`${content.confirmDelete}\n\n${formatDate(gider.tarih, locale)} - ${gider.aciklama}: ${formatCurrency(gider.tutar, locale)}`)) {
            const result = await deleteGiderAction(gider.id);
            if (result.success) {
                toast.success(content.deleteSuccess || 'Ausgabe gelöscht.');
                router.refresh();
            } else {
                toast.error(`${content.deleteError || 'Fehler:'} ${result.error}`);
            }
        }
    };

    // ✅ FILTER ZURÜCKSETZEN
    const handleResetFilters = () => {
        setSelectedHauptCategory('');
        setSelectedGiderKalemi('');
        setSelectedPeriod('this-month');
    };

    // ✅ YENİ: GEÇEN AYDAN KOPYALA
    const handleCopyFromPreviousMonth = async () => {
        if (isCopying) return;

        const confirmed = window.confirm(
            '⚠️ Geçen ayın TÜM giderlerini bu aya kopyalamak istiyor musunuz?\n\n' +
            'Bu işlem geri alınamaz!'
        );

        if (!confirmed) return;

        setIsCopying(true);

        try {
            // Hedef ay: Şu anki seçili tarih aralığından al
            const now = new Date();
            const targetMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

            console.log('🔄 Kopyalama başlatılıyor, hedef ay:', targetMonth);

            const result = await copyGiderlerFromPreviousMonth(targetMonth);

            if (result.success) {
                toast.success(`✅ ${result.count} adet gider başarıyla kopyalandı!`);
                router.refresh(); // Listeyi yenile
            } else {
                toast.error(result.error || 'Kopyalama başarısız oldu.');
            }
        } catch (error) {
            console.error('Kopyalama hatası:', error);
            toast.error('Bir hata oluştu!');
        } finally {
            setIsCopying(false);
        }
    };

    return (
        <div className="space-y-6">
            <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="font-serif text-4xl font-bold text-primary">{content.title}</h1>
                    <p className="text-text-main/80 mt-1">{content.description}</p>
                </div>
                <button
                    onClick={handleNewExpense}
                    className="flex items-center justify-center gap-2 px-5 py-3 bg-accent text-white rounded-lg shadow-md hover:bg-opacity-90 transition-all duration-200 font-bold text-sm w-full sm:w-auto"
                >
                    <FiPlus size={18} />
                    {content.newExpense}
                </button>
            </header>

            {/* ✅ EINFACHE FILTER-SEKTION */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <FiFilter className="text-gray-500" />
                        <span className="text-sm font-bold text-primary">Filter</span>
                    </div>
                    <button
                        onClick={handleResetFilters}
                        className="text-sm text-gray-500 hover:text-gray-700 underline"
                    >
                        Zurücksetzen
                    </button>
                </div>

                {/* Zeitraum Filter */}
                <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">Zeitraum:</label>
                    <div className="flex flex-wrap gap-2">
                        {datePeriods.map(p => (
                            <button
                                key={p.value}
                                onClick={() => setSelectedPeriod(p.value)}
                                className={`px-3 py-1 text-sm font-medium rounded-full transition-colors ${
                                    selectedPeriod === p.value 
                                        ? 'bg-accent text-white' 
                                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                }`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Custom Datum */}
                {selectedPeriod === 'custom' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="dateFrom" className="text-sm font-medium text-gray-700 block mb-1">Von:</label>
                            <input
                                type="date"
                                id="dateFrom"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="w-full border border-gray-300 rounded-md py-2 px-3 bg-white shadow-sm focus:ring-accent focus:border-accent"
                            />
                        </div>
                        <div>
                            <label htmlFor="dateTo" className="text-sm font-medium text-gray-700 block mb-1">Bis:</label>
                            <input
                                type="date"
                                id="dateTo"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="w-full border border-gray-300 rounded-md py-2 px-3 bg-white shadow-sm focus:ring-accent focus:border-accent"
                            />
                        </div>
                    </div>
                )}

                {/* Kategorie Filter */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="hauptCategoryFilter" className="text-sm font-medium text-gray-700 block mb-1">
                            {content.filterByHauptCategory}:
                        </label>
                        <select
                            id="hauptCategoryFilter"
                            value={selectedHauptCategory}
                            onChange={(e) => {
                                setSelectedHauptCategory(e.target.value);
                                setSelectedGiderKalemi(''); // Unterkategorie zurücksetzen
                            }}
                            className="w-full border border-gray-300 rounded-md py-2 px-3 bg-white shadow-sm focus:ring-accent focus:border-accent"
                        >
                            <option value="">{content.allCategories}</option>
                            {hauptKategorien.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.ad}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="categoryFilter" className="text-sm font-medium text-gray-700 block mb-1">
                            {content.filterByCategory}:
                        </label>
                        <select
                            id="categoryFilter"
                            value={selectedGiderKalemi}
                            onChange={(e) => setSelectedGiderKalemi(e.target.value)}
                            disabled={filteredGiderKalemleri.length === 0}
                            className="w-full border border-gray-300 rounded-md py-2 px-3 bg-white shadow-sm focus:ring-accent focus:border-accent disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <option value="">{content.allSubCategories}</option>
                            {filteredGiderKalemleri.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.ad}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Ergebnis-Anzeige */}
                <div className="pt-2 border-t border-gray-200">
                    <p className="text-sm text-gray-600">
                        <span className="font-bold text-accent">{filteredGiderler.length}</span> von <span className="font-bold">{initialGiderler.length}</span> Ausgaben werden angezeigt
                    </p>
                </div>
            </div>

            {/* TABLO */}
            <div className="overflow-x-auto bg-white rounded-lg shadow-md border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{content.date}</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{content.hauptCategory}</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{content.category}</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{content.descriptionCol}</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">{content.amount}</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{content.frequency}</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{content.recordedBy}</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">{content.actions}</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredGiderler.length > 0 ? (
                            filteredGiderler.map((gider) => (
                                <tr key={gider.id} className="hover:bg-gray-50/50 transition-colors duration-150">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{formatDate(gider.tarih, locale)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">{gider.gider_kalemleri?.gider_ana_kategoriler?.ad || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{gider.gider_kalemleri?.ad || '-'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate" title={gider.aciklama || ''}>{gider.aciklama}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold text-right">{formatCurrency(gider.tutar, locale)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{gider.odeme_sikligi || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{gider.profiller?.tam_ad || 'System'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                        <button onClick={() => handleEditExpense(gider)} className="text-indigo-600 hover:text-indigo-900" title={content.edit}><FiEdit /></button>
                                        <button onClick={() => handleDuplicateExpense(gider)} className="text-green-600 hover:text-green-900" title={content.duplicate}><FiCopy /></button>
                                        <button onClick={() => handleDelete(gider)} className="text-red-600 hover:text-red-900" title={content.delete}><FiTrash2 /></button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={8} className="px-6 py-10 text-center text-gray-500">
                                    {selectedGiderKalemi || selectedHauptCategory || dateFrom || dateTo ? content.noExpensesFoundFilter : content.noExpensesYet}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <GiderFormModal
                key={modalKey}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                giderToEdit={editingGider}
                availableCategories={giderKalemleri}
                availableHauptCategories={hauptKategorien}
                availableFrequencies={availableFrequencies}
                dictionary={dictionary}
                locale={locale}
            />
        </div>
    );
}