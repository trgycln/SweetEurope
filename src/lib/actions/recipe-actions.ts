'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

type MultiLangText = { tr: string; en: string; de: string; ar: string; };
type MultiLangArray = { tr: string[]; en: string[]; de: string[]; ar: string[]; };

type RecipeInput = {
  title: MultiLangText;
  description: MultiLangText;
  ingredients: MultiLangArray;
  instructions: MultiLangArray;
  prep_time_minutes: number;
  category: string;
};

export async function saveRecipeAndRedirect(
  recipeData: RecipeInput, 
  locale: string, 
  productId: string | null
) {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);

  // Türkçe karakterleri çevirmek için yardımcı harita
  const trMap: Record<string, string> = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', 'Ç': 'C', 'Ğ': 'G', 'İ': 'I', 'Ö': 'O', 'Ş': 'S', 'Ü': 'U' };
  
  // Create a base slug from the Turkish or German title
  const baseTitle = recipeData.title.tr || recipeData.title.de || 'recipe';
  const slugifiedTitle = baseTitle.replace(/[çğıöşüÇĞİÖŞÜ]/g, m => trMap[m]);
  const baseSlug = slugifiedTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
  const uniqueSlug = `${baseSlug}-${Math.random().toString(36).substring(2, 7)}`;

  const { data, error } = await supabase
    .from('recipes')
    .insert({
      slug: uniqueSlug,
      locale: locale,
      title: recipeData.title,
      description: recipeData.description,
      ingredients: recipeData.ingredients,
      instructions: recipeData.instructions,
      prep_time_minutes: recipeData.prep_time_minutes || 5,
      category: recipeData.category || 'cocktail',
      product_id: productId,
    })
    .select('slug')
    .single();

  if (error) {
    console.error('Supabase Insert Error:', JSON.stringify(error, null, 2));
    throw new Error(`Reçete kaydedilemedi: ${error.message} (code: ${error.code})`);
  }

  // Kullanıcıyı yeni oluşturulan SEO sayfasına yönlendir
  redirect(`/${locale}/recipes/${data.slug}`);
}

export async function incrementRecipeLike(recipeId: string) {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);
  // Supabase RPC (Remote Procedure Call) kullanmak en güvenlisidir ama 
  // basitlik için mevcut sayıyı alıp 1 artırıyoruz.
  const { data: recipe } = await supabase.from('recipes').select('likes_count').eq('id', recipeId).single();
  
  if (recipe) {
    await supabase.from('recipes').update({ likes_count: recipe.likes_count + 1 }).eq('id', recipeId);
  }
}

export async function saveRecipesBulk(
  recipesData: RecipeInput[], 
  locale: string, 
  productId: string | null
) {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);

  // Türkçe karakterleri çevirmek için yardımcı harita
  const trMap: Record<string, string> = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', 'Ç': 'C', 'Ğ': 'G', 'İ': 'I', 'Ö': 'O', 'Ş': 'S', 'Ü': 'U' };

  const recipesToInsert = recipesData.map(recipeData => {
    const baseTitle = recipeData.title.tr || recipeData.title.de || 'recipe';
    const slugifiedTitle = baseTitle.replace(/[çğıöşüÇĞİÖŞÜ]/g, m => trMap[m]);
    const baseSlug = slugifiedTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    const uniqueSlug = `${baseSlug}-${Math.random().toString(36).substring(2, 7)}`;

    return {
      slug: uniqueSlug,
      locale: locale,
      title: recipeData.title,
      description: recipeData.description,
      ingredients: recipeData.ingredients,
      instructions: recipeData.instructions,
      prep_time_minutes: recipeData.prep_time_minutes || 5,
      category: recipeData.category || 'cocktail',
      product_id: productId,
    };
  });

  const { error } = await supabase
    .from('recipes')
    .insert(recipesToInsert);

  if (error) {
    console.error('Supabase Bulk Insert Error:', JSON.stringify(error, null, 2));
    throw new Error(`Reçeteler kaydedilemedi: ${error.message} (code: ${error.code})`);
  }

  return true;
}
