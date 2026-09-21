import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { FiSlash } from 'react-icons/fi';
import { getGlobalCachedUser } from '@/lib/admin/cache-utils';
import EditRecipeForm from '../components/EditRecipeForm';
import { notFound } from 'next/navigation';

export default async function RecipeEditPage({ params }: { params: Promise<{ locale: string, id: string }> }) {
    const { locale, id } = await params;
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    // Güvenlik
    const { data: { user } } = await getGlobalCachedUser();
    if (!user) return <div>Lütfen giriş yapın.</div>;
    
    const { data: profile } = await supabase.from('profiller').select('rol').eq('id', user.id).single();
    if (profile?.rol !== 'Yönetici') {
        return (
            <div className="p-8 text-center">
                <FiSlash className="mx-auto text-5xl text-red-500 mb-4" />
                <h1 className="font-serif text-2xl text-red-600">Erişim Reddedildi</h1>
            </div>
        );
    }

    // Reçeteyi Çek
    const { data: recipe, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !recipe) {
        return notFound();
    }

    return (
        <div className="max-w-4xl mx-auto py-6">
            <EditRecipeForm recipe={recipe} locale={locale} />
        </div>
    );
}
