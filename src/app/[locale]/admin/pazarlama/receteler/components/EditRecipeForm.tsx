'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { FiSave, FiArrowLeft, FiPlus, FiTrash2 } from 'react-icons/fi';
import Link from 'next/link';
import { toast } from 'sonner';

export default function EditRecipeForm({ recipe, locale }: { recipe: any, locale: string }) {
    const router = useRouter();
    const supabase = createSupabaseBrowserClient();
    
    const [isSaving, setIsSaving] = useState(false);
    const [title, setTitle] = useState(recipe.title || '');
    const [description, setDescription] = useState(recipe.description || '');
    const [category, setCategory] = useState(recipe.category || 'coffee');
    const [prepTime, setPrepTime] = useState(recipe.prep_time_minutes || 5);
    
    // Arrays for JSONB fields
    const [ingredients, setIngredients] = useState<string[]>(Array.isArray(recipe.ingredients) ? recipe.ingredients : []);
    const [instructions, setInstructions] = useState<string[]>(Array.isArray(recipe.instructions) ? recipe.instructions : []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        
        try {
            const { error } = await supabase
                .from('recipes')
                .update({
                    title,
                    description,
                    category,
                    prep_time_minutes: prepTime,
                    ingredients,
                    instructions
                })
                .eq('id', recipe.id);
                
            if (error) throw error;
            
            toast.success('Reçete başarıyla güncellendi!');
            router.push(`/${locale}/admin/pazarlama/receteler`);
            router.refresh();
        } catch (error) {
            console.error(error);
            toast.error('Reçete güncellenirken hata oluştu.');
        } finally {
            setIsSaving(false);
        }
    };

    const updateArrayItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number, value: string) => {
        setter(prev => {
            const newArr = [...prev];
            newArr[index] = value;
            return newArr;
        });
    };

    const addArrayItem = (setter: React.Dispatch<React.SetStateAction<string[]>>) => {
        setter(prev => [...prev, '']);
    };

    const removeArrayItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number) => {
        setter(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <form onSubmit={handleSave} className="space-y-8 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center border-b pb-4">
                <h2 className="text-xl font-bold text-gray-800">Reçeteyi Düzenle</h2>
                <div className="flex gap-2">
                    <Link 
                        href={`/${locale}/admin/pazarlama/receteler`}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center gap-2 text-sm font-medium transition-colors"
                    >
                        <FiArrowLeft /> İptal
                    </Link>
                    <button 
                        type="submit" 
                        disabled={isSaving}
                        className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 flex items-center gap-2 text-sm font-medium transition-colors disabled:opacity-50"
                    >
                        <FiSave /> {isSaving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Başlık</label>
                        <input 
                            type="text" 
                            required
                            value={title} 
                            onChange={(e) => setTitle(e.target.value)} 
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
                        <textarea 
                            rows={3}
                            value={description} 
                            onChange={(e) => setDescription(e.target.value)} 
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                            <select 
                                value={category} 
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                            >
                                <option value="coffee">Kahve</option>
                                <option value="cocktail">Kokteyl</option>
                                <option value="mocktail">Mocktail</option>
                                <option value="smoothie">Smoothie</option>
                            </select>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Hazırlık Süresi (Dk)</label>
                            <input 
                                type="number" 
                                min="1"
                                value={prepTime} 
                                onChange={(e) => setPrepTime(Number(e.target.value))} 
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                            />
                        </div>
                    </div>
                </div>
                
                <div className="space-y-6">
                    {/* Malzemeler */}
                    <div className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex justify-between items-center mb-3">
                            <label className="block text-sm font-bold text-gray-700">Malzemeler</label>
                            <button 
                                type="button" 
                                onClick={() => addArrayItem(setIngredients)}
                                className="text-xs text-amber-600 hover:text-amber-800 font-medium flex items-center gap-1"
                            >
                                <FiPlus /> Malzeme Ekle
                            </button>
                        </div>
                        <div className="space-y-2">
                            {ingredients.map((item, idx) => (
                                <div key={idx} className="flex gap-2">
                                    <input 
                                        type="text" 
                                        value={item} 
                                        onChange={(e) => updateArrayItem(setIngredients, idx, e.target.value)} 
                                        className="flex-1 border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                                        placeholder={`Malzeme ${idx + 1}`}
                                    />
                                    <button 
                                        type="button" 
                                        onClick={() => removeArrayItem(setIngredients, idx)}
                                        className="text-red-500 hover:text-red-700 p-1"
                                    >
                                        <FiTrash2 />
                                    </button>
                                </div>
                            ))}
                            {ingredients.length === 0 && <p className="text-sm text-gray-500 italic">Hiç malzeme eklenmemiş.</p>}
                        </div>
                    </div>

                    {/* Yapılışı */}
                    <div className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex justify-between items-center mb-3">
                            <label className="block text-sm font-bold text-gray-700">Yapılışı (Adımlar)</label>
                            <button 
                                type="button" 
                                onClick={() => addArrayItem(setInstructions)}
                                className="text-xs text-amber-600 hover:text-amber-800 font-medium flex items-center gap-1"
                            >
                                <FiPlus /> Adım Ekle
                            </button>
                        </div>
                        <div className="space-y-2">
                            {instructions.map((item, idx) => (
                                <div key={idx} className="flex gap-2">
                                    <span className="font-bold text-gray-400 pt-2">{idx + 1}.</span>
                                    <textarea 
                                        rows={2}
                                        value={item} 
                                        onChange={(e) => updateArrayItem(setInstructions, idx, e.target.value)} 
                                        className="flex-1 border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                                        placeholder={`Adım ${idx + 1} açıklaması`}
                                    />
                                    <button 
                                        type="button" 
                                        onClick={() => removeArrayItem(setInstructions, idx)}
                                        className="text-red-500 hover:text-red-700 p-1 mt-1"
                                    >
                                        <FiTrash2 />
                                    </button>
                                </div>
                            ))}
                            {instructions.length === 0 && <p className="text-sm text-gray-500 italic">Hiç adım eklenmemiş.</p>}
                        </div>
                    </div>
                </div>
            </div>
        </form>
    );
}
