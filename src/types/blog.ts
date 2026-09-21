export type I18nString = {
  tr: string;
  en: string;
  de: string;
  ar: string;
};

export type BlogYazisi = {
  id: string; // uuid
  slug: string;
  title: I18nString;
  excerpt: I18nString;
  content: I18nString;
  meta_title: I18nString;
  meta_description: I18nString;
  image_url: string | null;
  author_name: string;
  published_at: string; // ISO string (timestamptz)
  is_published: boolean;
  created_at: string; // ISO string (timestamptz)
  updated_at: string; // ISO string (timestamptz)
};

export type BlogYazisiInsert = Omit<BlogYazisi, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type BlogYazisiUpdate = Partial<BlogYazisiInsert>;
