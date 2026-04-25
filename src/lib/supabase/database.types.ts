export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      alt_bayi_gelirleri: {
        Row: {
          aciklama: string | null
          created_at: string | null
          id: string
          musteri_adi: string | null
          sahip_id: string
          tarih: string
          tutar: number
        }
        Insert: {
          aciklama?: string | null
          created_at?: string | null
          id?: string
          musteri_adi?: string | null
          sahip_id: string
          tarih: string
          tutar: number
        }
        Update: {
          aciklama?: string | null
          created_at?: string | null
          id?: string
          musteri_adi?: string | null
          sahip_id?: string
          tarih?: string
          tutar?: number
        }
        Relationships: [
          {
            foreignKeyName: "alt_bayi_gelirleri_sahip_id_fkey"
            columns: ["sahip_id"]
            isOneToOne: false
            referencedRelation: "kullanici_segment_bilgileri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alt_bayi_gelirleri_sahip_id_fkey"
            columns: ["sahip_id"]
            isOneToOne: false
            referencedRelation: "profiller"
            referencedColumns: ["id"]
          },
        ]
      }
      alt_bayi_giderleri: {
        Row: {
          aciklama: string | null
          created_at: string | null
          id: string
          kategori: string | null
          sahip_id: string
          tarih: string
          tutar: number
        }
        Insert: {
          aciklama?: string | null
          created_at?: string | null
          id?: string
          kategori?: string | null
          sahip_id: string
          tarih: string
          tutar: number
        }
        Update: {
          aciklama?: string | null
          created_at?: string | null
          id?: string
          kategori?: string | null
          sahip_id?: string
          tarih?: string
          tutar?: number
        }
        Relationships: [
          {
            foreignKeyName: "alt_bayi_giderleri_sahip_id_fkey"
            columns: ["sahip_id"]
            isOneToOne: false
            referencedRelation: "kullanici_segment_bilgileri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alt_bayi_giderleri_sahip_id_fkey"
            columns: ["sahip_id"]
            isOneToOne: false
            referencedRelation: "profiller"
            referencedColumns: ["id"]
          },
        ]
      }
      alt_bayi_satis_detay: {
        Row: {
          adet: number
          alis_birim_fiyati: number
          birim_fiyat_net: number
          id: string
          kdv_tutari: number
          satir_brut: number
          satir_net: number
          satis_id: string
          urun_id: string
        }
        Insert: {
          adet?: number
          alis_birim_fiyati?: number
          birim_fiyat_net?: number
          id?: string
          kdv_tutari?: number
          satir_brut?: number
          satir_net?: number
          satis_id: string
          urun_id: string
        }
        Update: {
          adet?: number
          alis_birim_fiyati?: number
          birim_fiyat_net?: number
          id?: string
          kdv_tutari?: number
          satir_brut?: number
          satir_net?: number
          satis_id?: string
          urun_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alt_bayi_satis_detay_satis_id_fkey"
            columns: ["satis_id"]
            isOneToOne: false
            referencedRelation: "alt_bayi_satislar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alt_bayi_satis_detay_urun_id_fkey"
            columns: ["urun_id"]
            isOneToOne: false
            referencedRelation: "public_urunler_katalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alt_bayi_satis_detay_urun_id_fkey"
            columns: ["urun_id"]
            isOneToOne: false
            referencedRelation: "urunler"
            referencedColumns: ["id"]
          },
        ]
      }
      alt_bayi_satis_detaylari: {
        Row: {
          id: number
          miktar: number
          satis_fiyati: number
          satis_kaydi_id: string
          toplam_fiyat: number | null
          urun_id: string
        }
        Insert: {
          id?: never
          miktar: number
          satis_fiyati: number
          satis_kaydi_id: string
          toplam_fiyat?: number | null
          urun_id: string
        }
        Update: {
          id?: never
          miktar?: number
          satis_fiyati?: number
          satis_kaydi_id?: string
          toplam_fiyat?: number | null
          urun_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alt_bayi_satis_detaylari_satis_kaydi_id_fkey"
            columns: ["satis_kaydi_id"]
            isOneToOne: false
            referencedRelation: "alt_bayi_satis_kayitlari"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alt_bayi_satis_detaylari_urun_id_fkey"
            columns: ["urun_id"]
            isOneToOne: false
            referencedRelation: "public_urunler_katalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alt_bayi_satis_detaylari_urun_id_fkey"
            columns: ["urun_id"]
            isOneToOne: false
            referencedRelation: "urunler"
            referencedColumns: ["id"]
          },
        ]
      }
      alt_bayi_satis_kayitlari: {
        Row: {
          created_at: string | null
          id: string
          musteri_firma_id: string | null
          sahip_id: string
          tarih: string
          toplam_tutar: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          musteri_firma_id?: string | null
          sahip_id: string
          tarih: string
          toplam_tutar?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          musteri_firma_id?: string | null
          sahip_id?: string
          tarih?: string
          toplam_tutar?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "alt_bayi_satis_kayitlari_musteri_firma_id_fkey"
            columns: ["musteri_firma_id"]
            isOneToOne: false
            referencedRelation: "firmalar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alt_bayi_satis_kayitlari_sahip_id_fkey"
            columns: ["sahip_id"]
            isOneToOne: false
            referencedRelation: "kullanici_segment_bilgileri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alt_bayi_satis_kayitlari_sahip_id_fkey"
            columns: ["sahip_id"]
            isOneToOne: false
            referencedRelation: "profiller"
            referencedColumns: ["id"]
          },
        ]
      }
      alt_bayi_satislar: {
        Row: {
          bayi_firma_id: string
          created_at: string
          durum: string
          id: string
          kdv_orani: number
          musteri_id: string
          on_fatura_no: string | null
          on_fatura_pdf_url: string | null
          toplam_brut: number
          toplam_kdv: number
          toplam_net: number
        }
        Insert: {
          bayi_firma_id: string
          created_at?: string
          durum?: string
          id?: string
          kdv_orani?: number
          musteri_id: string
          on_fatura_no?: string | null
          on_fatura_pdf_url?: string | null
          toplam_brut?: number
          toplam_kdv?: number
          toplam_net?: number
        }
        Update: {
          bayi_firma_id?: string
          created_at?: string
          durum?: string
          id?: string
          kdv_orani?: number
          musteri_id?: string
          on_fatura_no?: string | null
          on_fatura_pdf_url?: string | null
          toplam_brut?: number
          toplam_kdv?: number
          toplam_net?: number
        }
        Relationships: [
          {
            foreignKeyName: "alt_bayi_satislar_bayi_firma_id_fkey"
            columns: ["bayi_firma_id"]
            isOneToOne: false
            referencedRelation: "firmalar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alt_bayi_satislar_musteri_id_fkey"
            columns: ["musteri_id"]
            isOneToOne: false
            referencedRelation: "firmalar"
            referencedColumns: ["id"]
          },
        ]
      }
      alt_bayi_stoklari: {
        Row: {
          id: number
          miktar: number
          sahip_id: string
          updated_at: string | null
          urun_id: string
        }
        Insert: {
          id?: never
          miktar?: number
          sahip_id: string
          updated_at?: string | null
          urun_id: string
        }
        Update: {
          id?: never
          miktar?: number
          sahip_id?: string
          updated_at?: string | null
          urun_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alt_bayi_stoklari_sahip_id_fkey"
            columns: ["sahip_id"]
            isOneToOne: false
            referencedRelation: "kullanici_segment_bilgileri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alt_bayi_stoklari_sahip_id_fkey"
            columns: ["sahip_id"]
            isOneToOne: false
            referencedRelation: "profiller"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alt_bayi_stoklari_urun_id_fkey"
            columns: ["urun_id"]
            isOneToOne: false
            referencedRelation: "public_urunler_katalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alt_bayi_stoklari_urun_id_fkey"
            columns: ["urun_id"]
            isOneToOne: false
            referencedRelation: "urunler"
            referencedColumns: ["id"]
          },
        ]
      }
      bildirimler: {
        Row: {
          alici_id: string
          created_at: string
          icerik: string
          id: string
          link: string | null
          okundu_mu: boolean
        }
        Insert: {
          alici_id: string
          created_at?: string
          icerik: string
          id?: string
          link?: string | null
          okundu_mu?: boolean
        }
        Update: {
          alici_id?: string
          created_at?: string
          icerik?: string
          id?: string
          link?: string | null
          okundu_mu?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "bildirimler_alici_id_fkey"
            columns: ["alici_id"]
            isOneToOne: false
            referencedRelation: "kullanici_segment_bilgileri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bildirimler_alici_id_fkey"
            columns: ["alici_id"]
            isOneToOne: false
            referencedRelation: "profiller"
            referencedColumns: ["id"]
          },
        ]
      }
      birim_donusumleri: {
        Row: {
          alt_birim_id: string
          carpan: number
          created_at: string
          id: string
          ust_birim_id: string
        }
        Insert: {
          alt_birim_id: string
          carpan: number
          created_at?: string
          id?: string
          ust_birim_id: string
        }
        Update: {
          alt_birim_id?: string
          carpan?: number
          created_at?: string
          id?: string
          ust_birim_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "birim_donusumleri_alt_birim_id_fkey"
            columns: ["alt_birim_id"]
            isOneToOne: false
            referencedRelation: "birimler"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "birim_donusumleri_ust_birim_id_fkey"
            columns: ["ust_birim_id"]
            isOneToOne: false
            referencedRelation: "birimler"
            referencedColumns: ["id"]
          },
        ]
      }
      birimler: {
        Row: {
          ad: Json
          created_at: string
          id: string
          kisaltma: Json | null
        }
        Insert: {
          ad: Json
          created_at?: string
          id?: string
          kisaltma?: Json | null
        }
        Update: {
          ad?: Json
          created_at?: string
          id?: string
          kisaltma?: Json | null
        }
        Relationships: []
      }
      blog_yazilari: {
        Row: {
          baslik: string
          created_at: string
          durum: Database["public"]["Enums"]["yazi_durumu"]
          icerik: Json | null
          id: string
          meta_aciklama: string
          meta_baslik: string
          one_cikan_gorsel_url: string | null
          slug: string
          yayinlanma_tarihi: string | null
          yazar_id: string | null
        }
        Insert: {
          baslik: string
          created_at?: string
          durum?: Database["public"]["Enums"]["yazi_durumu"]
          icerik?: Json | null
          id?: string
          meta_aciklama: string
          meta_baslik: string
          one_cikan_gorsel_url?: string | null
          slug: string
          yayinlanma_tarihi?: string | null
          yazar_id?: string | null
        }
        Update: {
          baslik?: string
          created_at?: string
          durum?: Database["public"]["Enums"]["yazi_durumu"]
          icerik?: Json | null
          id?: string
          meta_aciklama?: string
          meta_baslik?: string
          one_cikan_gorsel_url?: string | null
          slug?: string
          yayinlanma_tarihi?: string | null
          yazar_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_yazilari_yazar_id_fkey"
            columns: ["yazar_id"]
            isOneToOne: false
            referencedRelation: "kullanici_segment_bilgileri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_yazilari_yazar_id_fkey"
            columns: ["yazar_id"]
            isOneToOne: false
            referencedRelation: "profiller"
            referencedColumns: ["id"]
          },
        ]
      }
      degerlendirme_oylari: {
        Row: {
          created_at: string | null
          degerlendirme_id: string
          id: string
          kullanici_id: string
          yardimci_mi: boolean
        }
        Insert: {
          created_at?: string | null
          degerlendirme_id: string
          id?: string
          kullanici_id: string
          yardimci_mi: boolean
        }
        Update: {
          created_at?: string | null
          degerlendirme_id?: string
          id?: string
          kullanici_id?: string
          yardimci_mi?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "degerlendirme_oylari_degerlendirme_id_fkey"
            columns: ["degerlendirme_id"]
            isOneToOne: false
            referencedRelation: "urun_degerlendirmeleri"
            referencedColumns: ["id"]
          },
        ]
      }
      dis_kontaklar: {
        Row: {
          ad_soyad: string
          created_at: string
          email: string | null
          firma_id: string
          id: string
          telefon: string | null
          unvan: string | null
        }
        Insert: {
          ad_soyad: string
          created_at?: string
          email?: string | null
          firma_id: string
          id?: string
          telefon?: string | null
          unvan?: string | null
        }
        Update: {
          ad_soyad?: string
          created_at?: string
          email?: string | null
          firma_id?: string
          id?: string
          telefon?: string | null
          unvan?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dis_kontaklar_firma_id_fkey"
            columns: ["firma_id"]
            isOneToOne: false
            referencedRelation: "firmalar"
            referencedColumns: ["id"]
          },
        ]
      }
      document_activity_log: {
        Row: {
          action: string
          created_at: string
          document_id: string
          id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          document_id: string
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          document_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_activity_log_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_folders: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          created_at: string
          description: string | null
          document_date: string | null
          document_subject: string | null
          document_type: string | null
          downloaded_count: number
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          folder_id: string | null
          id: string
          owner_id: string
          recipient: string | null
          reference_number: string | null
          search_vector: unknown
          sender: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          document_date?: string | null
          document_subject?: string | null
          document_type?: string | null
          downloaded_count?: number
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          folder_id?: string | null
          id?: string
          owner_id: string
          recipient?: string | null
          reference_number?: string | null
          search_vector?: unknown
          sender?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          document_date?: string | null
          document_subject?: string | null
          document_type?: string | null
          downloaded_count?: number
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          folder_id?: string | null
          id?: string
          owner_id?: string
          recipient?: string | null
          reference_number?: string | null
          search_vector?: unknown
          sender?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "document_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      duyurular: {
        Row: {
          aktif: boolean
          baslik: string
          bitis_tarihi: string | null
          created_at: string
          hedef_kitle: Database["public"]["Enums"]["hedef_rol"]
          icerik: string | null
          id: string
          olusturan_id: string | null
          yayin_tarihi: string
        }
        Insert: {
          aktif?: boolean
          baslik: string
          bitis_tarihi?: string | null
          created_at?: string
          hedef_kitle?: Database["public"]["Enums"]["hedef_rol"]
          icerik?: string | null
          id?: string
          olusturan_id?: string | null
          yayin_tarihi?: string
        }
        Update: {
          aktif?: boolean
          baslik?: string
          bitis_tarihi?: string | null
          created_at?: string
          hedef_kitle?: Database["public"]["Enums"]["hedef_rol"]
          icerik?: string | null
          id?: string
          olusturan_id?: string | null
          yayin_tarihi?: string
        }
        Relationships: [
          {
            foreignKeyName: "duyurular_olusturan_id_fkey"
            columns: ["olusturan_id"]
            isOneToOne: false
            referencedRelation: "kullanici_segment_bilgileri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duyurular_olusturan_id_fkey"
            columns: ["olusturan_id"]
            isOneToOne: false
            referencedRelation: "profiller"
            referencedColumns: ["id"]
          },
        ]
      }
      etkinlikler: {
        Row: {
          aciklama: string
          created_at: string
          etkinlik_tipi: Database["public"]["Enums"]["etkinlik_tipi"]
          firma_id: string
          id: string
          olusturan_personel_id: string
        }
        Insert: {
          aciklama: string
          created_at?: string
          etkinlik_tipi: Database["public"]["Enums"]["etkinlik_tipi"]
          firma_id: string
          id?: string
          olusturan_personel_id: string
        }
        Update: {
          aciklama?: string
          created_at?: string
          etkinlik_tipi?: Database["public"]["Enums"]["etkinlik_tipi"]
          firma_id?: string
          id?: string
          olusturan_personel_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "etkinlikler_firma_id_fkey"
            columns: ["firma_id"]
            isOneToOne: false
            referencedRelation: "firmalar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "etkinlikler_olusturan_personel_id_fkey"
            columns: ["olusturan_personel_id"]
            isOneToOne: false
            referencedRelation: "kullanici_segment_bilgileri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "etkinlikler_olusturan_personel_id_fkey"
            columns: ["olusturan_personel_id"]
            isOneToOne: false
            referencedRelation: "profiller"
            referencedColumns: ["id"]
          },
        ]
      }
      faturalar: {
        Row: {
          created_at: string
          dosya_url: string | null
          fatura_no: string
          firma_id: string
          id: string
          odeme_durumu: Database["public"]["Enums"]["fatura_durumu"]
          odeme_tarihi: string | null
          siparis_id: string | null
          tutar: number
          vade_tarihi: string
        }
        Insert: {
          created_at?: string
          dosya_url?: string | null
          fatura_no: string
          firma_id: string
          id?: string
          odeme_durumu?: Database["public"]["Enums"]["fatura_durumu"]
          odeme_tarihi?: string | null
          siparis_id?: string | null
          tutar: number
          vade_tarihi: string
        }
        Update: {
          created_at?: string
          dosya_url?: string | null
          fatura_no?: string
          firma_id?: string
          id?: string
          odeme_durumu?: Database["public"]["Enums"]["fatura_durumu"]
          odeme_tarihi?: string | null
          siparis_id?: string | null
          tutar?: number
          vade_tarihi?: string
        }
        Relationships: [
          {
            foreignKeyName: "faturalar_firma_id_fkey"
            columns: ["firma_id"]
            isOneToOne: false
            referencedRelation: "firmalar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faturalar_siparis_id_fkey"
            columns: ["siparis_id"]
            isOneToOne: false
            referencedRelation: "siparisler"
            referencedColumns: ["id"]
          },
        ]
      }
      favori_urunler: {
        Row: {
          created_at: string
          kullanici_id: string
          urun_id: string
        }
        Insert: {
          created_at?: string
          kullanici_id: string
          urun_id: string
        }
        Update: {
          created_at?: string
          kullanici_id?: string
          urun_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favori_urunler_urun_id_fkey"
            columns: ["urun_id"]
            isOneToOne: false
            referencedRelation: "public_urunler_katalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favori_urunler_urun_id_fkey"
            columns: ["urun_id"]
            isOneToOne: false
            referencedRelation: "urunler"
            referencedColumns: ["id"]
          },
        ]
      }
      firmalar: {
        Row: {
          adres: string | null
          created_at: string
          created_by: string | null
          email: string | null
          etiketler: string[] | null
          facebook_url: string | null
          google_maps_url: string | null
          goruldu: boolean | null
          iban: string | null
          id: string
          ilce: string | null
          inherit_facebook_url: boolean | null
          inherit_google_maps_url: boolean | null
          inherit_instagram_url: boolean | null
          inherit_linkedin_url: boolean | null
          inherit_web_url: boolean | null
          instagram_url: string | null
          iskonto_orani: number
          kategori: string | null
          kaynak: string | null
          linkedin_url: string | null
          mahalle: string | null
          musteri_profil_id: string | null
          oncelik: string | null
          oncelik_puani: number | null
          parent_firma_id: string | null
          posta_kodu: string | null
          referans_olarak_goster: boolean
          sahip_id: string | null
          sehir: string | null
          son_etkilesim_tarihi: string | null
          sorumlu_personel_id: string | null
          status: Database["public"]["Enums"]["firma_status"] | null
          sube_sayisi: number | null
          telefon: string | null
          ticari_tip: string | null
          unvan: string
          updated_by: string | null
          vergi_dairesi: string | null
          vergi_no: string | null
          web_url: string | null
          yetkili_kisi: string | null
        }
        Insert: {
          adres?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          etiketler?: string[] | null
          facebook_url?: string | null
          google_maps_url?: string | null
          goruldu?: boolean | null
          iban?: string | null
          id?: string
          ilce?: string | null
          inherit_facebook_url?: boolean | null
          inherit_google_maps_url?: boolean | null
          inherit_instagram_url?: boolean | null
          inherit_linkedin_url?: boolean | null
          inherit_web_url?: boolean | null
          instagram_url?: string | null
          iskonto_orani?: number
          kategori?: string | null
          kaynak?: string | null
          linkedin_url?: string | null
          mahalle?: string | null
          musteri_profil_id?: string | null
          oncelik?: string | null
          oncelik_puani?: number | null
          parent_firma_id?: string | null
          posta_kodu?: string | null
          referans_olarak_goster?: boolean
          sahip_id?: string | null
          sehir?: string | null
          son_etkilesim_tarihi?: string | null
          sorumlu_personel_id?: string | null
          status?: Database["public"]["Enums"]["firma_status"] | null
          sube_sayisi?: number | null
          telefon?: string | null
          ticari_tip?: string | null
          unvan: string
          updated_by?: string | null
          vergi_dairesi?: string | null
          vergi_no?: string | null
          web_url?: string | null
          yetkili_kisi?: string | null
        }
        Update: {
          adres?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          etiketler?: string[] | null
          facebook_url?: string | null
          google_maps_url?: string | null
          goruldu?: boolean | null
          iban?: string | null
          id?: string
          ilce?: string | null
          inherit_facebook_url?: boolean | null
          inherit_google_maps_url?: boolean | null
          inherit_instagram_url?: boolean | null
          inherit_linkedin_url?: boolean | null
          inherit_web_url?: boolean | null
          instagram_url?: string | null
          iskonto_orani?: number
          kategori?: string | null
          kaynak?: string | null
          linkedin_url?: string | null
          mahalle?: string | null
          musteri_profil_id?: string | null
          oncelik?: string | null
          oncelik_puani?: number | null
          parent_firma_id?: string | null
          posta_kodu?: string | null
          referans_olarak_goster?: boolean
          sahip_id?: string | null
          sehir?: string | null
          son_etkilesim_tarihi?: string | null
          sorumlu_personel_id?: string | null
          status?: Database["public"]["Enums"]["firma_status"] | null
          sube_sayisi?: number | null
          telefon?: string | null
          ticari_tip?: string | null
          unvan?: string
          updated_by?: string | null
          vergi_dairesi?: string | null
          vergi_no?: string | null
          web_url?: string | null
          yetkili_kisi?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "firmalar_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "kullanici_segment_bilgileri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "firmalar_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiller"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "firmalar_musteri_profil_id_fkey"
            columns: ["musteri_profil_id"]
            isOneToOne: false
            referencedRelation: "musteri_profilleri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "firmalar_parent_firma_id_fkey"
            columns: ["parent_firma_id"]
            isOneToOne: false
            referencedRelation: "firmalar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "firmalar_sahip_id_fkey"
            columns: ["sahip_id"]
            isOneToOne: false
            referencedRelation: "kullanici_segment_bilgileri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "firmalar_sahip_id_fkey"
            columns: ["sahip_id"]
            isOneToOne: false
            referencedRelation: "profiller"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "firmalar_sorumlu_personel_id_fkey"
            columns: ["sorumlu_personel_id"]
            isOneToOne: false
            referencedRelation: "kullanici_segment_bilgileri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "firmalar_sorumlu_personel_id_fkey"
            columns: ["sorumlu_personel_id"]
            isOneToOne: false
            referencedRelation: "profiller"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "firmalar_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "kullanici_segment_bilgileri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "firmalar_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiller"
            referencedColumns: ["id"]
          },
        ]
      }
      firmalar_finansal: {
        Row: {
          firma_id: string
          odeme_vadesi_gun: number
          ozel_indirim_orani: number
        }
        Insert: {
          firma_id: string
          odeme_vadesi_gun?: number
          ozel_indirim_orani?: number
        }
        Update: {
          firma_id?: string
          odeme_vadesi_gun?: number
          ozel_indirim_orani?: number
        }
        Relationships: [
          {
            foreignKeyName: "firmalar_finansal_firma_id_fkey"
            columns: ["firma_id"]
            isOneToOne: true
            referencedRelation: "firmalar"
            referencedColumns: ["id"]
          },
        ]
      }
      fiyat_degisim_talepleri: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string
          id: string
          notlar: string | null
          proposed_satis_fiyati_alt_bayi: number | null
          proposed_satis_fiyati_musteri: number | null
          status: string
          urun_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by: string
          id?: string
          notlar?: string | null
          proposed_satis_fiyati_alt_bayi?: number | null
          proposed_satis_fiyati_musteri?: number | null
          status?: string
          urun_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string
          id?: string
          notlar?: string | null
          proposed_satis_fiyati_alt_bayi?: number | null
          proposed_satis_fiyati_musteri?: number | null
          status?: string
          urun_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fiyat_degisim_talepleri_urun_id_fkey"
            columns: ["urun_id"]
            isOneToOne: false
            referencedRelation: "public_urunler_katalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiyat_degisim_talepleri_urun_id_fkey"
            columns: ["urun_id"]
            isOneToOne: false
            referencedRelation: "urunler"
            referencedColumns: ["id"]
          },
        ]
      }
      fiyat_kurallari: {
        Row: {
          aciklama: string | null
          ad: string
          aktif: boolean
          baslangic_tarihi: string | null
          bitis_tarihi: string | null
          created_at: string
          firma_id: string | null
          id: string
          kanal: string
          kapsam: string
          kategori_id: string | null
          min_adet: number
          musteri_profil_id: string | null
          oncelik: number
          urun_id: string | null
          yuzde_degisim: number
        }
        Insert: {
          aciklama?: string | null
          ad: string
          aktif?: boolean
          baslangic_tarihi?: string | null
          bitis_tarihi?: string | null
          created_at?: string
          firma_id?: string | null
          id?: string
          kanal?: string
          kapsam: string
          kategori_id?: string | null
          min_adet?: number
          musteri_profil_id?: string | null
          oncelik?: number
          urun_id?: string | null
          yuzde_degisim: number
        }
        Update: {
          aciklama?: string | null
          ad?: string
          aktif?: boolean
          baslangic_tarihi?: string | null
          bitis_tarihi?: string | null
          created_at?: string
          firma_id?: string | null
          id?: string
          kanal?: string
          kapsam?: string
          kategori_id?: string | null
          min_adet?: number
          musteri_profil_id?: string | null
          oncelik?: number
          urun_id?: string | null
          yuzde_degisim?: number
        }
        Relationships: [
          {
            foreignKeyName: "fiyat_kurallari_firma_id_fkey"
            columns: ["firma_id"]
            isOneToOne: false
            referencedRelation: "firmalar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiyat_kurallari_kategori_id_fkey"
            columns: ["kategori_id"]
            isOneToOne: false
            referencedRelation: "kategoriler"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiyat_kurallari_musteri_profil_id_fkey"
            columns: ["musteri_profil_id"]
            isOneToOne: false
            referencedRelation: "musteri_profilleri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiyat_kurallari_urun_id_fkey"
            columns: ["urun_id"]
            isOneToOne: false
            referencedRelation: "public_urunler_katalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiyat_kurallari_urun_id_fkey"
            columns: ["urun_id"]
            isOneToOne: false
            referencedRelation: "urunler"
            referencedColumns: ["id"]
          },
        ]
      }
      gider_ana_kategoriler: {
        Row: {
          ad: string
          ad_translations: Json | null
          id: string
        }
        Insert: {
          ad: string
          ad_translations?: Json | null
          id?: string
        }
        Update: {
          ad?: string
          ad_translations?: Json | null
          id?: string
        }
        Relationships: []
      }
      gider_kalemleri: {
        Row: {
          ad: string
          ad_translations: Json | null
          ana_kategori_id: string
          id: string
        }
        Insert: {
          ad: string
          ad_translations?: Json | null
          ana_kategori_id: string
          id?: string
        }
        Update: {
          ad?: string
          ad_translations?: Json | null
          ana_kategori_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gider_kalemleri_ana_kategori_id_fkey"
            columns: ["ana_kategori_id"]
            isOneToOne: false
            referencedRelation: "gider_ana_kategoriler"
            referencedColumns: ["id"]
          },
        ]
      }
      gider_sablon_kalemleri: {
        Row: {
          aciklama: string | null
          created_at: string | null
          gider_kalemi_id: string
          id: string
          sablon_id: string
          varsayilan_tutar: number
        }
        Insert: {
          aciklama?: string | null
          created_at?: string | null
          gider_kalemi_id: string
          id?: string
          sablon_id: string
          varsayilan_tutar?: number
        }
        Update: {
          aciklama?: string | null
          created_at?: string | null
          gider_kalemi_id?: string
          id?: string
          sablon_id?: string
          varsayilan_tutar?: number
        }
        Relationships: [
          {
            foreignKeyName: "gider_sablon_kalemleri_gider_kalemi_id_fkey"
            columns: ["gider_kalemi_id"]
            isOneToOne: false
            referencedRelation: "gider_kalemleri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gider_sablon_kalemleri_sablon_id_fkey"
            columns: ["sablon_id"]
            isOneToOne: false
            referencedRelation: "gider_sablonlari"
            referencedColumns: ["id"]
          },
        ]
      }
      gider_sablonlari: {
        Row: {
          aciklama: string | null
          aktif: boolean
          created_at: string | null
          donem_tipi: string | null
          id: string
          sablon_adi: string
        }
        Insert: {
          aciklama?: string | null
          aktif?: boolean
          created_at?: string | null
          donem_tipi?: string | null
          id?: string
          sablon_adi: string
        }
        Update: {
          aciklama?: string | null
          aktif?: boolean
          created_at?: string | null
          donem_tipi?: string | null
          id?: string
          sablon_adi?: string
        }
        Relationships: []
      }
      giderler: {
        Row: {
          aciklama: string | null
          belge_url: string | null
          created_at: string
          durum: Database["public"]["Enums"]["gider_durumu"]
          gider_kalemi_id: string | null
          id: string
          islem_yapan_kullanici_id: string | null
          odeme_sikligi:
            | Database["public"]["Enums"]["zahlungshaeufigkeit"]
            | null
          tarih: string
          tutar: number
        }
        Insert: {
          aciklama?: string | null
          belge_url?: string | null
          created_at?: string
          durum?: Database["public"]["Enums"]["gider_durumu"]
          gider_kalemi_id?: string | null
          id?: string
          islem_yapan_kullanici_id?: string | null
          odeme_sikligi?:
            | Database["public"]["Enums"]["zahlungshaeufigkeit"]
            | null
          tarih: string
          tutar: number
        }
        Update: {
          aciklama?: string | null
          belge_url?: string | null
          created_at?: string
          durum?: Database["public"]["Enums"]["gider_durumu"]
          gider_kalemi_id?: string | null
          id?: string
          islem_yapan_kullanici_id?: string | null
          odeme_sikligi?:
            | Database["public"]["Enums"]["zahlungshaeufigkeit"]
            | null
          tarih?: string
          tutar?: number
        }
        Relationships: [
          {
            foreignKeyName: "giderler_gider_kalemi_id_fkey"
            columns: ["gider_kalemi_id"]
            isOneToOne: false
            referencedRelation: "gider_kalemleri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "giderler_islem_yapan_kullanici_id_fkey"
            columns: ["islem_yapan_kullanici_id"]
            isOneToOne: false
            referencedRelation: "kullanici_segment_bilgileri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "giderler_islem_yapan_kullanici_id_fkey"
            columns: ["islem_yapan_kullanici_id"]
            isOneToOne: false
            referencedRelation: "profiller"
            referencedColumns: ["id"]
          },
        ]
      }
      gorevler: {
        Row: {
          aciklama: string | null
          atanan_kisi_id: string
          baslik: string
          created_at: string
          durum: Database["public"]["Enums"]["gorev_durumu"]
          id: string
          ilgili_firma_id: string | null
          olusturan_kisi_id: string | null
          oncelik: Database["public"]["Enums"]["gorev_oncelik"]
          sahip_id: string | null
          son_tarih: string | null
          tamamlandi: boolean
        }
        Insert: {
          aciklama?: string | null
          atanan_kisi_id: string
          baslik: string
          created_at?: string
          durum?: Database["public"]["Enums"]["gorev_durumu"]
          id?: string
          ilgili_firma_id?: string | null
          olusturan_kisi_id?: string | null
          oncelik?: Database["public"]["Enums"]["gorev_oncelik"]
          sahip_id?: string | null
          son_tarih?: string | null
          tamamlandi?: boolean
        }
        Update: {
          aciklama?: string | null
          atanan_kisi_id?: string
          baslik?: string
          created_at?: string
          durum?: Database["public"]["Enums"]["gorev_durumu"]
          id?: string
          ilgili_firma_id?: string | null
          olusturan_kisi_id?: string | null
          oncelik?: Database["public"]["Enums"]["gorev_oncelik"]
          sahip_id?: string | null
          son_tarih?: string | null
          tamamlandi?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "gorevler_atanan_kisi_id_fkey"
            columns: ["atanan_kisi_id"]
            isOneToOne: false
            referencedRelation: "kullanici_segment_bilgileri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gorevler_atanan_kisi_id_fkey"
            columns: ["atanan_kisi_id"]
            isOneToOne: false
            referencedRelation: "profiller"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gorevler_olusturan_kisi_id_fkey"
            columns: ["olusturan_kisi_id"]
            isOneToOne: false
            referencedRelation: "kullanici_segment_bilgileri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gorevler_olusturan_kisi_id_fkey"
            columns: ["olusturan_kisi_id"]
            isOneToOne: false
            referencedRelation: "profiller"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gorevler_sahip_id_fkey"
            columns: ["sahip_id"]
            isOneToOne: false
            referencedRelation: "kullanici_segment_bilgileri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gorevler_sahip_id_fkey"
            columns: ["sahip_id"]
            isOneToOne: false
            referencedRelation: "profiller"
            referencedColumns: ["id"]
          },
        ]
      }
      ithalat_parti_kalemleri: {
        Row: {
          birim_alis_fiyati_orijinal: number
          ciplak_maliyet_eur: number
          created_at: string
          dagitilan_gumruk_eur: number
          dagitilan_navlun_eur: number
          dagitilan_ozel_gider_eur: number
          gercek_inis_maliyeti_net: number
          id: string
          maliyet_sapma_yuzde: number
          miktar_adet: number
          operasyon_ve_risk_yuku_eur: number
          parti_id: string
          standart_inis_maliyeti_net: number
          toplam_agirlik_kg: number
          urun_id: string
        }
        Insert: {
          birim_alis_fiyati_orijinal?: number
          ciplak_maliyet_eur?: number
          created_at?: string
          dagitilan_gumruk_eur?: number
          dagitilan_navlun_eur?: number
          dagitilan_ozel_gider_eur?: number
          gercek_inis_maliyeti_net?: number
          id?: string
          maliyet_sapma_yuzde?: number
          miktar_adet?: number
          operasyon_ve_risk_yuku_eur?: number
          parti_id: string
          standart_inis_maliyeti_net?: number
          toplam_agirlik_kg?: number
          urun_id: string
        }
        Update: {
          birim_alis_fiyati_orijinal?: number
          ciplak_maliyet_eur?: number
          created_at?: string
          dagitilan_gumruk_eur?: number
          dagitilan_navlun_eur?: number
          dagitilan_ozel_gider_eur?: number
          gercek_inis_maliyeti_net?: number
          id?: string
          maliyet_sapma_yuzde?: number
          miktar_adet?: number
          operasyon_ve_risk_yuku_eur?: number
          parti_id?: string
          standart_inis_maliyeti_net?: number
          toplam_agirlik_kg?: number
          urun_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ithalat_parti_kalemleri_parti_id_fkey"
            columns: ["parti_id"]
            isOneToOne: false
            referencedRelation: "ithalat_partileri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ithalat_parti_kalemleri_urun_id_fkey"
            columns: ["urun_id"]
            isOneToOne: false
            referencedRelation: "public_urunler_katalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ithalat_parti_kalemleri_urun_id_fkey"
            columns: ["urun_id"]
            isOneToOne: false
            referencedRelation: "urunler"
            referencedColumns: ["id"]
          },
        ]
      }
      ithalat_partileri: {
        Row: {
          created_at: string
          durum: string
          ek_notlar: string | null
          gumruk_vergi_toplam_eur: number
          id: string
          kuru_kg: number
          navlun_kuru_eur: number
          navlun_soguk_eur: number
          referans_kodu: string
          soguk_kg: number
          supplier_order_plan_record_id: string | null
          tedarikci_id: string | null
          traces_numune_ardiye_eur: number
          updated_at: string
          varis_tarihi: string | null
        }
        Insert: {
          created_at?: string
          durum?: string
          ek_notlar?: string | null
          gumruk_vergi_toplam_eur?: number
          id?: string
          kuru_kg?: number
          navlun_kuru_eur?: number
          navlun_soguk_eur?: number
          referans_kodu: string
          soguk_kg?: number
          supplier_order_plan_record_id?: string | null
          tedarikci_id?: string | null
          traces_numune_ardiye_eur?: number
          updated_at?: string
          varis_tarihi?: string | null
        }
        Update: {
          created_at?: string
          durum?: string
          ek_notlar?: string | null
          gumruk_vergi_toplam_eur?: number
          id?: string
          kuru_kg?: number
          navlun_kuru_eur?: number
          navlun_soguk_eur?: number
          referans_kodu?: string
          soguk_kg?: number
          supplier_order_plan_record_id?: string | null
          tedarikci_id?: string | null
          traces_numune_ardiye_eur?: number
          updated_at?: string
          varis_tarihi?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ithalat_partileri_tedarikci_id_fkey"
            columns: ["tedarikci_id"]
            isOneToOne: false
            referencedRelation: "tedarikciler"
            referencedColumns: ["id"]
          },
        ]
      }
      kategori_ozellik_sablonlari: {
        Row: {
          alan_adi: string
          alan_tipi: string
          alt_bayi_gorunur: boolean
          created_at: string
          gosterim_adi: Json
          id: string
          kategori_id: string
          musteri_gorunur: boolean
          public_gorunur: boolean
          sira: number | null
        }
        Insert: {
          alan_adi: string
          alan_tipi?: string
          alt_bayi_gorunur?: boolean
          created_at?: string
          gosterim_adi: Json
          id?: string
          kategori_id: string
          musteri_gorunur?: boolean
          public_gorunur?: boolean
          sira?: number | null
        }
        Update: {
          alan_adi?: string
          alan_tipi?: string
          alt_bayi_gorunur?: boolean
          created_at?: string
          gosterim_adi?: Json
          id?: string
          kategori_id?: string
          musteri_gorunur?: boolean
          public_gorunur?: boolean
          sira?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "kategori_ozellik_sablonlari_kategori_id_fkey"
            columns: ["kategori_id"]
            isOneToOne: false
            referencedRelation: "kategoriler"
            referencedColumns: ["id"]
          },
        ]
      }
      kategoriler: {
        Row: {
          ad: Json
          created_at: string
          id: string
          image_url: string | null
          slug: string | null
          urun_gami: string | null
          ust_kategori_id: string | null
        }
        Insert: {
          ad: Json
          created_at?: string
          id?: string
          image_url?: string | null
          slug?: string | null
          urun_gami?: string | null
          ust_kategori_id?: string | null
        }
        Update: {
          ad?: Json
          created_at?: string
          id?: string
          image_url?: string | null
          slug?: string | null
          urun_gami?: string | null
          ust_kategori_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kategoriler_ust_kategori_id_fkey"
            columns: ["ust_kategori_id"]
            isOneToOne: false
            referencedRelation: "kategoriler"
            referencedColumns: ["id"]
          },
        ]
      }
      musteri_profilleri: {
        Row: {
          aciklama: string | null
          ad: string
          aktif: boolean | null
          created_at: string
          genel_indirim_yuzdesi: number | null
          id: string
          sira_no: number | null
          updated_at: string
        }
        Insert: {
          aciklama?: string | null
          ad: string
          aktif?: boolean | null
          created_at?: string
          genel_indirim_yuzdesi?: number | null
          id?: string
          sira_no?: number | null
          updated_at?: string
        }
        Update: {
          aciklama?: string | null
          ad?: string
          aktif?: boolean | null
          created_at?: string
          genel_indirim_yuzdesi?: number | null
          id?: string
          sira_no?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      numune_talepleri: {
        Row: {
          created_at: string
          durum: Database["public"]["Enums"]["numune_talep_durumu"]
          firma_id: string
          id: string
          iptal_aciklamasi: string | null
          urun_id: string
        }
        Insert: {
          created_at?: string
          durum?: Database["public"]["Enums"]["numune_talep_durumu"]
          firma_id: string
          id?: string
          iptal_aciklamasi?: string | null
          urun_id: string
        }
        Update: {
          created_at?: string
          durum?: Database["public"]["Enums"]["numune_talep_durumu"]
          firma_id?: string
          id?: string
          iptal_aciklamasi?: string | null
          urun_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "numune_talepleri_firma_id_fkey"
            columns: ["firma_id"]
            isOneToOne: false
            referencedRelation: "firmalar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "numune_talepleri_urun_id_fkey"
            columns: ["urun_id"]
            isOneToOne: false
            referencedRelation: "public_urunler_katalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "numune_talepleri_urun_id_fkey"
            columns: ["urun_id"]
            isOneToOne: false
            referencedRelation: "urunler"
            referencedColumns: ["id"]
          },
        ]
      }
      pazarlama_materyalleri: {
        Row: {
          aciklama: string | null
          baslik: string
          created_at: string
          dosya_adi: string | null
          dosya_boyutu_kb: number | null
          dosya_url: string
          hedef_kitle: Database["public"]["Enums"]["hedef_rol"]
          id: string
          kategori: Database["public"]["Enums"]["materyal_kategori"]
        }
        Insert: {
          aciklama?: string | null
          baslik: string
          created_at?: string
          dosya_adi?: string | null
          dosya_boyutu_kb?: number | null
          dosya_url: string
          hedef_kitle?: Database["public"]["Enums"]["hedef_rol"]
          id?: string
          kategori: Database["public"]["Enums"]["materyal_kategori"]
        }
        Update: {
          aciklama?: string | null
          baslik?: string
          created_at?: string
          dosya_adi?: string | null
          dosya_boyutu_kb?: number | null
          dosya_url?: string
          hedef_kitle?: Database["public"]["Enums"]["hedef_rol"]
          id?: string
          kategori?: Database["public"]["Enums"]["materyal_kategori"]
        }
        Relationships: []
      }
      profiller: {
        Row: {
          firma_id: string | null
          id: string
          rol: Database["public"]["Enums"]["user_role"]
          tam_ad: string | null
          tercih_edilen_dil: string
        }
        Insert: {
          firma_id?: string | null
          id: string
          rol?: Database["public"]["Enums"]["user_role"]
          tam_ad?: string | null
          tercih_edilen_dil?: string
        }
        Update: {
          firma_id?: string | null
          id?: string
          rol?: Database["public"]["Enums"]["user_role"]
          tam_ad?: string | null
          tercih_edilen_dil?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiller_firma_id_fkey"
            columns: ["firma_id"]
            isOneToOne: false
            referencedRelation: "firmalar"
            referencedColumns: ["id"]
          },
        ]
      }
      sample_request_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity: number
          request_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
          request_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sample_request_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_urunler_katalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sample_request_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "urunler"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sample_request_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "sample_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      sample_requests: {
        Row: {
          created_at: string
          id: string
          note: string | null
          status: string
          updated_at: string
          waitlist_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          status?: string
          updated_at?: string
          waitlist_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          status?: string
          updated_at?: string
          waitlist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sample_requests_waitlist_id_fkey"
            columns: ["waitlist_id"]
            isOneToOne: false
            referencedRelation: "waitlist"
            referencedColumns: ["id"]
          },
        ]
      }
      siparis_detay: {
        Row: {
          birim_fiyat: number
          created_at: string
          id: string
          miktar: number
          o_anki_alis_fiyati: number | null
          o_anki_tahmini_ek_maliyet: number | null
          siparis_id: string
          toplam_fiyat: number
          urun_id: string
        }
        Insert: {
          birim_fiyat: number
          created_at?: string
          id?: string
          miktar: number
          o_anki_alis_fiyati?: number | null
          o_anki_tahmini_ek_maliyet?: number | null
          siparis_id: string
          toplam_fiyat: number
          urun_id: string
        }
        Update: {
          birim_fiyat?: number
          created_at?: string
          id?: string
          miktar?: number
          o_anki_alis_fiyati?: number | null
          o_anki_tahmini_ek_maliyet?: number | null
          siparis_id?: string
          toplam_fiyat?: number
          urun_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "siparis_detay_siparis_id_fkey"
            columns: ["siparis_id"]
            isOneToOne: false
            referencedRelation: "siparisler"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "siparis_detay_urun_id_fkey"
            columns: ["urun_id"]
            isOneToOne: false
            referencedRelation: "public_urunler_katalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "siparis_detay_urun_id_fkey"
            columns: ["urun_id"]
            isOneToOne: false
            referencedRelation: "urunler"
            referencedColumns: ["id"]
          },
        ]
      }
      siparisler: {
        Row: {
          atanan_kisi_id: string | null
          created_at: string
          firma_id: string
          id: string
          kdv_orani: number
          olusturan_kullanici_id: string | null
          siparis_durumu: string
          siparis_kaynagi: Database["public"]["Enums"]["siparis_kaynagi"] | null
          siparis_tarihi: string
          teslimat_adresi: string | null
          toplam_tutar_brut: number
          toplam_tutar_net: number
        }
        Insert: {
          atanan_kisi_id?: string | null
          created_at?: string
          firma_id: string
          id?: string
          kdv_orani: number
          olusturan_kullanici_id?: string | null
          siparis_durumu: string
          siparis_kaynagi?:
            | Database["public"]["Enums"]["siparis_kaynagi"]
            | null
          siparis_tarihi?: string
          teslimat_adresi?: string | null
          toplam_tutar_brut: number
          toplam_tutar_net: number
        }
        Update: {
          atanan_kisi_id?: string | null
          created_at?: string
          firma_id?: string
          id?: string
          kdv_orani?: number
          olusturan_kullanici_id?: string | null
          siparis_durumu?: string
          siparis_kaynagi?:
            | Database["public"]["Enums"]["siparis_kaynagi"]
            | null
          siparis_tarihi?: string
          teslimat_adresi?: string | null
          toplam_tutar_brut?: number
          toplam_tutar_net?: number
        }
        Relationships: [
          {
            foreignKeyName: "siparisler_atanan_kisi_id_fkey"
            columns: ["atanan_kisi_id"]
            isOneToOne: false
            referencedRelation: "kullanici_segment_bilgileri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "siparisler_atanan_kisi_id_fkey"
            columns: ["atanan_kisi_id"]
            isOneToOne: false
            referencedRelation: "profiller"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "siparisler_firma_id_fkey"
            columns: ["firma_id"]
            isOneToOne: false
            referencedRelation: "firmalar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "siparisler_olusturan_kullanici_id_fkey"
            columns: ["olusturan_kullanici_id"]
            isOneToOne: false
            referencedRelation: "kullanici_segment_bilgileri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "siparisler_olusturan_kullanici_id_fkey"
            columns: ["olusturan_kullanici_id"]
            isOneToOne: false
            referencedRelation: "profiller"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          setting_key: string
          setting_type: string
          setting_value: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          setting_type?: string
          setting_value: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          setting_key?: string
          setting_type?: string
          setting_value?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      tedarikciler: {
        Row: {
          created_at: string
          email: string | null
          id: string
          telefon: string | null
          unvan: string
          yetkili_kisi: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          telefon?: string | null
          unvan: string
          yetkili_kisi?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          telefon?: string | null
          unvan?: string
          yetkili_kisi?: string | null
        }
        Relationships: []
      }
      urun_degerlendirmeleri: {
        Row: {
          baslik: string | null
          created_at: string | null
          dogrulanmis_alis: boolean | null
          firma_id: string | null
          id: string
          kullanici_id: string
          onay_durumu: string | null
          onay_tarihi: string | null
          onaylayan_id: string | null
          puan: number
          red_nedeni: string | null
          resimler: string[] | null
          siparis_id: string | null
          updated_at: string | null
          urun_id: string
          yardimci_olmayan_oy_sayisi: number | null
          yardimci_oy_sayisi: number | null
          yorum: string | null
        }
        Insert: {
          baslik?: string | null
          created_at?: string | null
          dogrulanmis_alis?: boolean | null
          firma_id?: string | null
          id?: string
          kullanici_id: string
          onay_durumu?: string | null
          onay_tarihi?: string | null
          onaylayan_id?: string | null
          puan: number
          red_nedeni?: string | null
          resimler?: string[] | null
          siparis_id?: string | null
          updated_at?: string | null
          urun_id: string
          yardimci_olmayan_oy_sayisi?: number | null
          yardimci_oy_sayisi?: number | null
          yorum?: string | null
        }
        Update: {
          baslik?: string | null
          created_at?: string | null
          dogrulanmis_alis?: boolean | null
          firma_id?: string | null
          id?: string
          kullanici_id?: string
          onay_durumu?: string | null
          onay_tarihi?: string | null
          onaylayan_id?: string | null
          puan?: number
          red_nedeni?: string | null
          resimler?: string[] | null
          siparis_id?: string | null
          updated_at?: string | null
          urun_id?: string
          yardimci_olmayan_oy_sayisi?: number | null
          yardimci_oy_sayisi?: number | null
          yorum?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "urun_degerlendirmeleri_firma_id_fkey"
            columns: ["firma_id"]
            isOneToOne: false
            referencedRelation: "firmalar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "urun_degerlendirmeleri_siparis_id_fkey"
            columns: ["siparis_id"]
            isOneToOne: false
            referencedRelation: "siparisler"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "urun_degerlendirmeleri_urun_id_fkey"
            columns: ["urun_id"]
            isOneToOne: false
            referencedRelation: "public_urunler_katalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "urun_degerlendirmeleri_urun_id_fkey"
            columns: ["urun_id"]
            isOneToOne: false
            referencedRelation: "urunler"
            referencedColumns: ["id"]
          },
        ]
      }
      urun_stok_hareket_loglari: {
        Row: {
          aciklama: string | null
          birim: string
          birim_miktar: number | null
          created_at: string
          extra: Json
          hareket_tipi: string
          id: string
          kaynak: string
          miktar: number
          onceki_stok: number
          referans_kayit_id: string | null
          sonraki_stok: number
          tedarikci_id: string | null
          urun_id: string
          yapan_user_adi: string | null
          yapan_user_email: string | null
          yapan_user_id: string | null
        }
        Insert: {
          aciklama?: string | null
          birim?: string
          birim_miktar?: number | null
          created_at?: string
          extra?: Json
          hareket_tipi: string
          id?: string
          kaynak: string
          miktar: number
          onceki_stok: number
          referans_kayit_id?: string | null
          sonraki_stok: number
          tedarikci_id?: string | null
          urun_id: string
          yapan_user_adi?: string | null
          yapan_user_email?: string | null
          yapan_user_id?: string | null
        }
        Update: {
          aciklama?: string | null
          birim?: string
          birim_miktar?: number | null
          created_at?: string
          extra?: Json
          hareket_tipi?: string
          id?: string
          kaynak?: string
          miktar?: number
          onceki_stok?: number
          referans_kayit_id?: string | null
          sonraki_stok?: number
          tedarikci_id?: string | null
          urun_id?: string
          yapan_user_adi?: string | null
          yapan_user_email?: string | null
          yapan_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "urun_stok_hareket_loglari_tedarikci_id_fkey"
            columns: ["tedarikci_id"]
            isOneToOne: false
            referencedRelation: "tedarikciler"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "urun_stok_hareket_loglari_urun_id_fkey"
            columns: ["urun_id"]
            isOneToOne: false
            referencedRelation: "public_urunler_katalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "urun_stok_hareket_loglari_urun_id_fkey"
            columns: ["urun_id"]
            isOneToOne: false
            referencedRelation: "urunler"
            referencedColumns: ["id"]
          },
        ]
      }
      urunler: {
        Row: {
          aciklamalar: Json | null
          ad: Json
          aktif: boolean
          alis_fiyat_seviyesi: string | null
          allergene: Json | null
          almanya_kdv_orani: number | null
          ana_resim_url: string | null
          ana_satis_birimi_id: string | null
          birim_agirlik_kg: number | null
          created_at: string
          degerlendirme_sayisi: number | null
          distributor_alis_fiyati: number
          ean_gtin: string | null
          fire_zayiat_orani_yuzde: number | null
          galeri_resim_urls: string[] | null
          gumruk_vergi_orani_yuzde: number | null
          gunluk_depolama_maliyeti_eur: number | null
          haltbarkeit_monate: number | null
          haltbarkeit_nach_oeffnen_tage: number | null
          herkunftsland: Json | null
          hersteller_land: string | null
          hersteller_name: string | null
          id: string
          inhaltsstoffe: Json | null
          karlilik_alarm_aktif: boolean
          kategori_id: string
          koli_ici_adet: number | null
          koli_ici_kutu_adet: number | null
          kutu_ici_adet: number | null
          lagertemperatur_max_celsius: number | null
          lagertemperatur_min_celsius: number | null
          lieferzeit_werktage: number | null
          lojistik_sinifi: string | null
          mindest_bestellmenge: number | null
          mindest_bestellmenge_einheit: string | null
          naehrwerte: Json | null
          ortalama_puan: number | null
          ortalama_stokta_kalma_suresi: number | null
          palet_ici_adet: number | null
          palet_ici_koli_adet: number | null
          palet_ici_kutu_adet: number | null
          produktdatenblatt_url: string | null
          satis_fiyati_alt_bayi: number
          satis_fiyati_musteri: number
          satis_fiyati_toptanci: number | null
          slug: string | null
          son_gercek_inis_maliyeti_net: number | null
          son_maliyet_sapma_yuzde: number | null
          standart_inis_maliyeti_net: number | null
          stok_esigi: number
          stok_kodu: string | null
          stok_miktari: number
          taric_kodu: string | null
          tedarikci_id: string | null
          teknik_ozellikler: Json | null
          urun_gami: string | null
          zertifikate: string[] | null
        }
        Insert: {
          aciklamalar?: Json | null
          ad: Json
          aktif?: boolean
          alis_fiyat_seviyesi?: string | null
          allergene?: Json | null
          almanya_kdv_orani?: number | null
          ana_resim_url?: string | null
          ana_satis_birimi_id?: string | null
          birim_agirlik_kg?: number | null
          created_at?: string
          degerlendirme_sayisi?: number | null
          distributor_alis_fiyati?: number
          ean_gtin?: string | null
          fire_zayiat_orani_yuzde?: number | null
          galeri_resim_urls?: string[] | null
          gumruk_vergi_orani_yuzde?: number | null
          gunluk_depolama_maliyeti_eur?: number | null
          haltbarkeit_monate?: number | null
          haltbarkeit_nach_oeffnen_tage?: number | null
          herkunftsland?: Json | null
          hersteller_land?: string | null
          hersteller_name?: string | null
          id?: string
          inhaltsstoffe?: Json | null
          karlilik_alarm_aktif?: boolean
          kategori_id: string
          koli_ici_adet?: number | null
          koli_ici_kutu_adet?: number | null
          kutu_ici_adet?: number | null
          lagertemperatur_max_celsius?: number | null
          lagertemperatur_min_celsius?: number | null
          lieferzeit_werktage?: number | null
          lojistik_sinifi?: string | null
          mindest_bestellmenge?: number | null
          mindest_bestellmenge_einheit?: string | null
          naehrwerte?: Json | null
          ortalama_puan?: number | null
          ortalama_stokta_kalma_suresi?: number | null
          palet_ici_adet?: number | null
          palet_ici_koli_adet?: number | null
          palet_ici_kutu_adet?: number | null
          produktdatenblatt_url?: string | null
          satis_fiyati_alt_bayi?: number
          satis_fiyati_musteri?: number
          satis_fiyati_toptanci?: number | null
          slug?: string | null
          son_gercek_inis_maliyeti_net?: number | null
          son_maliyet_sapma_yuzde?: number | null
          standart_inis_maliyeti_net?: number | null
          stok_esigi?: number
          stok_kodu?: string | null
          stok_miktari?: number
          taric_kodu?: string | null
          tedarikci_id?: string | null
          teknik_ozellikler?: Json | null
          urun_gami?: string | null
          zertifikate?: string[] | null
        }
        Update: {
          aciklamalar?: Json | null
          ad?: Json
          aktif?: boolean
          alis_fiyat_seviyesi?: string | null
          allergene?: Json | null
          almanya_kdv_orani?: number | null
          ana_resim_url?: string | null
          ana_satis_birimi_id?: string | null
          birim_agirlik_kg?: number | null
          created_at?: string
          degerlendirme_sayisi?: number | null
          distributor_alis_fiyati?: number
          ean_gtin?: string | null
          fire_zayiat_orani_yuzde?: number | null
          galeri_resim_urls?: string[] | null
          gumruk_vergi_orani_yuzde?: number | null
          gunluk_depolama_maliyeti_eur?: number | null
          haltbarkeit_monate?: number | null
          haltbarkeit_nach_oeffnen_tage?: number | null
          herkunftsland?: Json | null
          hersteller_land?: string | null
          hersteller_name?: string | null
          id?: string
          inhaltsstoffe?: Json | null
          karlilik_alarm_aktif?: boolean
          kategori_id?: string
          koli_ici_adet?: number | null
          koli_ici_kutu_adet?: number | null
          kutu_ici_adet?: number | null
          lagertemperatur_max_celsius?: number | null
          lagertemperatur_min_celsius?: number | null
          lieferzeit_werktage?: number | null
          lojistik_sinifi?: string | null
          mindest_bestellmenge?: number | null
          mindest_bestellmenge_einheit?: string | null
          naehrwerte?: Json | null
          ortalama_puan?: number | null
          ortalama_stokta_kalma_suresi?: number | null
          palet_ici_adet?: number | null
          palet_ici_koli_adet?: number | null
          palet_ici_kutu_adet?: number | null
          produktdatenblatt_url?: string | null
          satis_fiyati_alt_bayi?: number
          satis_fiyati_musteri?: number
          satis_fiyati_toptanci?: number | null
          slug?: string | null
          son_gercek_inis_maliyeti_net?: number | null
          son_maliyet_sapma_yuzde?: number | null
          standart_inis_maliyeti_net?: number | null
          stok_esigi?: number
          stok_kodu?: string | null
          stok_miktari?: number
          taric_kodu?: string | null
          tedarikci_id?: string | null
          teknik_ozellikler?: Json | null
          urun_gami?: string | null
          zertifikate?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "urunler_ana_satis_birimi_id_fkey"
            columns: ["ana_satis_birimi_id"]
            isOneToOne: false
            referencedRelation: "birimler"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "urunler_kategori_id_fkey"
            columns: ["kategori_id"]
            isOneToOne: false
            referencedRelation: "kategoriler"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "urunler_tedarikci_id_fkey"
            columns: ["tedarikci_id"]
            isOneToOne: false
            referencedRelation: "tedarikciler"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist: {
        Row: {
          created_at: string | null
          durum: string | null
          email: string
          firma_adi: string
          firma_id: string | null
          id: string
          kayit_tarihi: string | null
          notlar: string | null
          product_preferences: Json | null
          telefon: string | null
          updated_at: string | null
          yetkili_kisi: string
        }
        Insert: {
          created_at?: string | null
          durum?: string | null
          email: string
          firma_adi: string
          firma_id?: string | null
          id?: string
          kayit_tarihi?: string | null
          notlar?: string | null
          product_preferences?: Json | null
          telefon?: string | null
          updated_at?: string | null
          yetkili_kisi: string
        }
        Update: {
          created_at?: string | null
          durum?: string | null
          email?: string
          firma_adi?: string
          firma_id?: string | null
          id?: string
          kayit_tarihi?: string | null
          notlar?: string | null
          product_preferences?: Json | null
          telefon?: string | null
          updated_at?: string | null
          yetkili_kisi?: string
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_firma_id_fkey"
            columns: ["firma_id"]
            isOneToOne: false
            referencedRelation: "firmalar"
            referencedColumns: ["id"]
          },
        ]
      }
      yeni_urun_talepleri: {
        Row: {
          admin_notu: string | null
          beschreibung: string | null
          created_at: string
          firma_id: string
          geschaetzte_menge_pro_woche: number | null
          id: string
          kategorie_vorschlag: string | null
          olusturan_kullanici_id: string | null
          produkt_name: string
          referenz_link_gorsel: string | null
          status: Database["public"]["Enums"]["urun_talep_durumu"]
        }
        Insert: {
          admin_notu?: string | null
          beschreibung?: string | null
          created_at?: string
          firma_id: string
          geschaetzte_menge_pro_woche?: number | null
          id?: string
          kategorie_vorschlag?: string | null
          olusturan_kullanici_id?: string | null
          produkt_name: string
          referenz_link_gorsel?: string | null
          status?: Database["public"]["Enums"]["urun_talep_durumu"]
        }
        Update: {
          admin_notu?: string | null
          beschreibung?: string | null
          created_at?: string
          firma_id?: string
          geschaetzte_menge_pro_woche?: number | null
          id?: string
          kategorie_vorschlag?: string | null
          olusturan_kullanici_id?: string | null
          produkt_name?: string
          referenz_link_gorsel?: string | null
          status?: Database["public"]["Enums"]["urun_talep_durumu"]
        }
        Relationships: [
          {
            foreignKeyName: "yeni_urun_talepleri_firma_id_fkey"
            columns: ["firma_id"]
            isOneToOne: false
            referencedRelation: "firmalar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yeni_urun_talepleri_olusturan_kullanici_id_fkey"
            columns: ["olusturan_kullanici_id"]
            isOneToOne: false
            referencedRelation: "kullanici_segment_bilgileri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yeni_urun_talepleri_olusturan_kullanici_id_fkey"
            columns: ["olusturan_kullanici_id"]
            isOneToOne: false
            referencedRelation: "profiller"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      favori_urunler_istatistik: {
        Row: {
          fav_count: number | null
          urun_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "favori_urunler_urun_id_fkey"
            columns: ["urun_id"]
            isOneToOne: false
            referencedRelation: "public_urunler_katalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favori_urunler_urun_id_fkey"
            columns: ["urun_id"]
            isOneToOne: false
            referencedRelation: "urunler"
            referencedColumns: ["id"]
          },
        ]
      }
      kullanici_segment_bilgileri: {
        Row: {
          id: string | null
          rol: Database["public"]["Enums"]["user_role"] | null
        }
        Insert: {
          id?: string | null
          rol?: Database["public"]["Enums"]["user_role"] | null
        }
        Update: {
          id?: string | null
          rol?: Database["public"]["Enums"]["user_role"] | null
        }
        Relationships: []
      }
      public_urunler_katalog: {
        Row: {
          aciklamalar: Json | null
          ad: Json | null
          allergene: Json | null
          ana_resim_url: string | null
          birim_agirlik_kg: number | null
          ean_gtin: string | null
          galeri_resim_urls: string[] | null
          haltbarkeit_monate: number | null
          haltbarkeit_nach_oeffnen_tage: number | null
          herkunftsland: Json | null
          hersteller_land: string | null
          hersteller_name: string | null
          id: string | null
          inhaltsstoffe: Json | null
          kategori_ad: Json | null
          kategori_id: string | null
          kategori_slug: string | null
          koli_ici_adet: number | null
          koli_ici_kutu_adet: number | null
          lagertemperatur_max_celsius: number | null
          lagertemperatur_min_celsius: number | null
          lieferzeit_werktage: number | null
          lojistik_sinifi: string | null
          mindest_bestellmenge: number | null
          mindest_bestellmenge_einheit: string | null
          naehrwerte: Json | null
          palet_ici_adet: number | null
          palet_ici_koli_adet: number | null
          palet_ici_kutu_adet: number | null
          produktdatenblatt_url: string | null
          slug: string | null
          stok_kodu: string | null
          teknik_ozellikler: Json | null
          urun_gami: string | null
          zertifikate: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "urunler_kategori_id_fkey"
            columns: ["kategori_id"]
            isOneToOne: false
            referencedRelation: "kategoriler"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      alt_bayi_satis_olustur_ve_stok_dus: {
        Args: {
          p_bayi_firma_id: string
          p_musteri_id: string
          p_satis_detaylari: Database["public"]["CompositeTypes"]["satis_detay_input"][]
        }
        Returns: string
      }
      calculate_actual_landed_cost: {
        Args: {
          p_ciplak_maliyet_eur: number
          p_fire_zayiat_orani_yuzde: number
          p_gumruk_vergi_orani_yuzde: number
          p_gunluk_depolama_maliyeti_eur: number
          p_navlun_kg_basi_eur: number
          p_ortalama_stok_gun: number
          p_soguk_ek_gider_kg_basi_eur: number
          p_urun_agirlik_kg: number
        }
        Returns: number
      }
      calculate_tier_price: {
        Args: { p_marj_yuzde: number; p_standart_inis_maliyeti: number }
        Returns: number
      }
      count_profiles_by_status: {
        Args: never
        Returns: {
          count: number
          status: string
        }[]
      }
      count_users_by_status: {
        Args: never
        Returns: {
          count: number
          status: string
        }[]
      }
      create_expenses_from_template: {
        Args: { p_hedef_ay?: string; p_sablon_id: string }
        Returns: Json
      }
      create_expenses_from_templates: {
        Args: { p_donem_tipi?: string; p_hedef_ay?: string }
        Returns: Json
      }
      create_giderler_from_templates: {
        Args: { target_month: string }
        Returns: Json
      }
      create_order_with_items_and_update_stock: {
        Args: {
          p_firma_id: string
          p_items: Database["public"]["CompositeTypes"]["order_item"][]
          p_olusturan_kullanici_id: string
          p_olusturma_kaynagi: Database["public"]["Enums"]["siparis_kaynagi"]
          p_teslimat_adresi: string
        }
        Returns: string
      }
      evaluate_variance_alert: {
        Args: {
          p_esik_yuzde?: number
          p_gercek_inis_maliyeti: number
          p_standart_inis_maliyeti: number
        }
        Returns: boolean
      }
      get_critical_product_ids: {
        Args: never
        Returns: {
          product_id: string
        }[]
      }
      get_dashboard_summary_for_member: {
        Args: { p_member_id: string }
        Returns: Json
      }
      get_detailed_pl_report: {
        Args: { end_date: string; start_date: string }
        Returns: Json
      }
      get_expense_categories_localized: {
        Args: { p_locale?: string }
        Returns: {
          ad: string
          ad_localized: string
          created_at: string
          id: string
        }[]
      }
      get_expense_items_localized: {
        Args: { p_category_id?: string; p_locale?: string }
        Returns: {
          ad: string
          ad_localized: string
          ana_kategori_id: string
          created_at: string
          id: string
        }[]
      }
      get_hizli_siparis_urunleri: {
        Args: { p_firma_id: string }
        Returns: {
          ad: Json
          ana_resim_url: string
          id: string
          satis_fiyati_alt_bayi: number
          satis_fiyati_musteri: number
          stok_esigi: number
          stok_kodu: string
          stok_miktari: number
          toplam_siparis_adeti: number
        }[]
      }
      get_kritik_stok_count: { Args: never; Returns: number }
      get_monthly_revenue: {
        Args: never
        Returns: {
          month: string
          total_revenue: number
        }[]
      }
      get_my_role: { Args: never; Returns: string }
      get_my_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_notification_message: {
        Args: {
          p_language: string
          p_message_key: string
          p_param1?: string
          p_param2?: string
          p_param3?: string
        }
        Returns: string
      }
      get_pending_balance_for_firma: {
        Args: { p_firma_id: string }
        Returns: number
      }
      get_pl_report: {
        Args: { end_date: string; start_date: string }
        Returns: Json
      }
      get_subdealer_performance_report: {
        Args: { end_date: string; p_firma_id: string; start_date: string }
        Returns: Json
      }
      get_top_bought_products_for_user: {
        Args: { p_user_id: string }
        Returns: {
          product_id: number
          product_name: string
          total_quantity: number
        }[]
      }
      search_documents: {
        Args: {
          p_date_from?: string
          p_date_to?: string
          p_folder_id?: string
          p_owner_id: string
          p_search_term: string
          p_tags?: string[]
        }
        Returns: {
          created_at: string
          description: string
          document_date: string
          document_subject: string
          file_name: string
          id: string
          recipient: string
          reference_number: string
          sender: string
          similarity_rank: number
          tags: string[]
        }[]
      }
      send_notification_to_firma: {
        Args: { p_firma_id: string; p_icerik: string; p_link?: string }
        Returns: number
      }
      send_notification_to_role: {
        Args: { p_icerik: string; p_link?: string; p_roller: string[] }
        Returns: number
      }
      send_notification_to_user: {
        Args: { p_alici_id: string; p_icerik: string; p_link?: string }
        Returns: string
      }
      translate_order_status: {
        Args: { p_language: string; p_status: string }
        Returns: string
      }
      update_order_status_and_log_activity: {
        Args: {
          p_kullanici_id: string
          p_siparis_id: string
          p_yeni_status: Database["public"]["Enums"]["siparis_durumu"]
        }
        Returns: undefined
      }
    }
    Enums: {
      etkinlik_tipi:
        | "Not"
        | "Telefon Görüşmesi"
        | "Toplantı"
        | "E-posta"
        | "Teklif"
        | "Instagram DM"
        | "Instagram Yorum"
        | "E-Mail Gönderimi"
        | "Yüz Yüze Ziyaret"
        | "Instagram Etkileşimi"
        | "DM Gönderildi"
        | "Numune İsteği"
      etkinlik_turu:
        | "Telefon Görüşmesi"
        | "Müşteri Ziyareti"
        | "E-posta"
        | "Durum Değişikliği"
        | "Diğer"
      fatura_durumu: "pending" | "paid" | "overdue" | "cancelled"
      firma_kategori:
        | "Kafe"
        | "Restoran"
        | "Otel"
        | "Alt Bayi"
        | "Zincir Market"
        | "Shisha & Lounge"
        | "Coffee Shop & Eiscafé"
        | "Casual Dining"
        | "Hotel & Event"
        | "Rakip/Üretici"
        | "Catering"
      firma_status:
        | "Aday"
        | "Takipte"
        | "Temas Kuruldu"
        | "İletişimde"
        | "Müşteri"
        | "Pasif"
        | "ISITILIYOR"
        | "TEMAS EDİLDİ"
        | "POTANSİYEL"
        | "ADAY"
        | "İLETİŞİMDE"
        | "MÜŞTERİ"
        | "PASİF"
        | "REDDEDİLDİ"
        | "NUMUNE VERİLDİ"
      gider_durumu: "Taslak" | "Onaylandı"
      gorev_durumu: "Yapılacak" | "Devam Ediyor" | "Tamamlandı"
      gorev_oncelik: "Düşük" | "Orta" | "Yüksek"
      hedef_rol: "Tüm Partnerler" | "Sadece Alt Bayiler"
      materyal_kategori:
        | "Broşürler"
        | "Ürün Fotoğrafları"
        | "Sosyal Medya Kitleri"
        | "Fiyat Listeleri"
        | "Diğer"
      numune_talep_durumu:
        | "Yeni Talep"
        | "Onaylandı"
        | "Hazırlanıyor"
        | "Gönderildi"
        | "İptal Edildi"
      siparis_durumu:
        | "Beklemede"
        | "Hazırlanıyor"
        | "Yola Çıktı"
        | "Teslim Edildi"
        | "İptal Edildi"
        | "processing"
        | "shipped"
        | "delivered"
        | "cancelled"
      siparis_kaynagi: "Admin Paneli" | "Müşteri Portalı"
      urun_gorunurluk: "Dahili" | "Portal" | "Herkese Açık"
      urun_talep_durumu:
        | "Yeni"
        | "Değerlendiriliyor"
        | "Onaylandı"
        | "Reddedildi"
      user_role: "Yönetici" | "Ekip Üyesi" | "Müşteri" | "Alt Bayi" | "Personel"
      yazi_durumu: "Taslak" | "Yayınlandı"
      zahlungshaeufigkeit: "Monatlich" | "Jährlich" | "Einmalig" | "Bedarf"
    }
    CompositeTypes: {
      order_item: {
        urun_id: string | null
        adet: number | null
        o_anki_satis_fiyati: number | null
      }
      satis_detay_input: {
        urun_id: string | null
        adet: number | null
        birim_fiyat_net: number | null
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      etkinlik_tipi: [
        "Not",
        "Telefon Görüşmesi",
        "Toplantı",
        "E-posta",
        "Teklif",
        "Instagram DM",
        "Instagram Yorum",
        "E-Mail Gönderimi",
        "Yüz Yüze Ziyaret",
        "Instagram Etkileşimi",
        "DM Gönderildi",
        "Numune İsteği",
      ],
      etkinlik_turu: [
        "Telefon Görüşmesi",
        "Müşteri Ziyareti",
        "E-posta",
        "Durum Değişikliği",
        "Diğer",
      ],
      fatura_durumu: ["pending", "paid", "overdue", "cancelled"],
      firma_kategori: [
        "Kafe",
        "Restoran",
        "Otel",
        "Alt Bayi",
        "Zincir Market",
        "Shisha & Lounge",
        "Coffee Shop & Eiscafé",
        "Casual Dining",
        "Hotel & Event",
        "Rakip/Üretici",
        "Catering",
      ],
      firma_status: [
        "Aday",
        "Takipte",
        "Temas Kuruldu",
        "İletişimde",
        "Müşteri",
        "Pasif",
        "ISITILIYOR",
        "TEMAS EDİLDİ",
        "POTANSİYEL",
        "ADAY",
        "İLETİŞİMDE",
        "MÜŞTERİ",
        "PASİF",
        "REDDEDİLDİ",
        "NUMUNE VERİLDİ",
      ],
      gider_durumu: ["Taslak", "Onaylandı"],
      gorev_durumu: ["Yapılacak", "Devam Ediyor", "Tamamlandı"],
      gorev_oncelik: ["Düşük", "Orta", "Yüksek"],
      hedef_rol: ["Tüm Partnerler", "Sadece Alt Bayiler"],
      materyal_kategori: [
        "Broşürler",
        "Ürün Fotoğrafları",
        "Sosyal Medya Kitleri",
        "Fiyat Listeleri",
        "Diğer",
      ],
      numune_talep_durumu: [
        "Yeni Talep",
        "Onaylandı",
        "Hazırlanıyor",
        "Gönderildi",
        "İptal Edildi",
      ],
      siparis_durumu: [
        "Beklemede",
        "Hazırlanıyor",
        "Yola Çıktı",
        "Teslim Edildi",
        "İptal Edildi",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ],
      siparis_kaynagi: ["Admin Paneli", "Müşteri Portalı"],
      urun_gorunurluk: ["Dahili", "Portal", "Herkese Açık"],
      urun_talep_durumu: [
        "Yeni",
        "Değerlendiriliyor",
        "Onaylandı",
        "Reddedildi",
      ],
      user_role: ["Yönetici", "Ekip Üyesi", "Müşteri", "Alt Bayi", "Personel"],
      yazi_durumu: ["Taslak", "Yayınlandı"],
      zahlungshaeufigkeit: ["Monatlich", "Jährlich", "Einmalig", "Bedarf"],
    },
  },
} as const
