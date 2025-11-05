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
            referencedRelation: "profiller"
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
            referencedRelation: "urunler"
            referencedColumns: ["id"]
          },
        ]
      }
      firmalar: {
        Row: {
          adres: string | null
          created_at: string
          email: string | null
          iban: string | null
          id: string
          iskonto_orani: number
          kategori: string | null
          referans_olarak_goster: boolean
          sorumlu_personel_id: string | null
          status: string | null
          telefon: string | null
          unvan: string
          vergi_dairesi: string | null
          vergi_no: string | null
        }
        Insert: {
          adres?: string | null
          created_at?: string
          email?: string | null
          iban?: string | null
          id?: string
          iskonto_orani?: number
          kategori?: string | null
          referans_olarak_goster?: boolean
          sorumlu_personel_id?: string | null
          status?: string | null
          telefon?: string | null
          unvan: string
          vergi_dairesi?: string | null
          vergi_no?: string | null
        }
        Update: {
          adres?: string | null
          created_at?: string
          email?: string | null
          iban?: string | null
          id?: string
          iskonto_orani?: number
          kategori?: string | null
          referans_olarak_goster?: boolean
          sorumlu_personel_id?: string | null
          status?: string | null
          telefon?: string | null
          unvan?: string
          vergi_dairesi?: string | null
          vergi_no?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "firmalar_sorumlu_personel_id_fkey"
            columns: ["sorumlu_personel_id"]
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
      gider_ana_kategoriler: {
        Row: {
          ad: string
          id: string
        }
        Insert: {
          ad: string
          id?: string
        }
        Update: {
          ad?: string
          id?: string
        }
        Relationships: []
      }
      gider_kalemleri: {
        Row: {
          ad: string
          ana_kategori_id: string
          id: string
        }
        Insert: {
          ad: string
          ana_kategori_id: string
          id?: string
        }
        Update: {
          ad?: string
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
      gider_sablonlari: {
        Row: {
          id: string
          gider_kalemi_id: string
          varsayilan_tutar: number
          odeme_sikligi: Database["public"]["Enums"]["zahlungshaeufigkeit"]
          aciklama_sablonu: string | null
          aktif: boolean
          created_at: string
        }
        Insert: {
          id?: string
          gider_kalemi_id: string
          varsayilan_tutar?: number
          odeme_sikligi?: Database["public"]["Enums"]["zahlungshaeufigkeit"]
          aciklama_sablonu?: string | null
          aktif?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          gider_kalemi_id?: string
          varsayilan_tutar?: number
          odeme_sikligi?: Database["public"]["Enums"]["zahlungshaeufigkeit"]
          aciklama_sablonu?: string | null
          aktif?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gider_sablonlari_gider_kalemi_id_fkey"
            columns: ["gider_kalemi_id"]
            isOneToOne: false
            referencedRelation: "gider_kalemleri"
            referencedColumns: ["id"]
          },
        ]
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
          son_tarih?: string | null
          tamamlandi?: boolean
        }
        Relationships: [
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
            referencedRelation: "profiller"
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
          slug: string | null
          ust_kategori_id: string | null
        }
        Insert: {
          ad: Json
          created_at?: string
          id?: string
          slug?: string | null
          ust_kategori_id?: string | null
        }
        Update: {
          ad?: Json
          created_at?: string
          id?: string
          slug?: string | null
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
            referencedRelation: "urunler"
            referencedColumns: ["id"]
          },
        ]
      }
      siparisler: {
        Row: {
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
            referencedRelation: "profiller"
            referencedColumns: ["id"]
          },
        ]
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
      urunler: {
        Row: {
          aciklamalar: Json | null
          ad: Json
          aktif: boolean
          ana_resim_url: string | null
          ana_satis_birimi_id: string | null
          created_at: string
          distributor_alis_fiyati: number
          galeri_resim_urls: string[] | null
          id: string
          kategori_id: string
          satis_fiyati_alt_bayi: number
          satis_fiyati_musteri: number
          slug: string | null
          stok_esigi: number
          stok_kodu: string | null
          stok_miktari: number
          tedarikci_id: string | null
          teknik_ozellikler: Json | null
        }
        Insert: {
          aciklamalar?: Json | null
          ad: Json
          aktif?: boolean
          ana_resim_url?: string | null
          ana_satis_birimi_id?: string | null
          created_at?: string
          distributor_alis_fiyati?: number
          galeri_resim_urls?: string[] | null
          id?: string
          kategori_id: string
          satis_fiyati_alt_bayi?: number
          satis_fiyati_musteri?: number
          slug?: string | null
          stok_esigi?: number
          stok_kodu?: string | null
          stok_miktari?: number
          tedarikci_id?: string | null
          teknik_ozellikler?: Json | null
        }
        Update: {
          aciklamalar?: Json | null
          ad?: Json
          aktif?: boolean
          ana_resim_url?: string | null
          ana_satis_birimi_id?: string | null
          created_at?: string
          distributor_alis_fiyati?: number
          galeri_resim_urls?: string[] | null
          id?: string
          kategori_id?: string
          satis_fiyati_alt_bayi?: number
          satis_fiyati_musteri?: number
          slug?: string | null
          stok_esigi?: number
          stok_kodu?: string | null
          stok_miktari?: number
          tedarikci_id?: string | null
          teknik_ozellikler?: Json | null
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
            referencedRelation: "profiller"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      favori_urunler_istatistik: {
        Row: {
          urun_id: string
          fav_count: number
        }
        Relationships: []
      }
      kullanici_segment_bilgileri: {
        Row: {
          id: string
          rol: string
        }
        Relationships: []
      }
    }
    Functions: {
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
      get_my_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
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
      firma_status:
        | "Potansiyel"
        | "İlk Temas"
        | "Numune Sunuldu"
        | "Teklif Verildi"
        | "Anlaşma Sağlandı"
        | "Pasif"
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
      user_role: "Yönetici" | "Ekip Üyesi" | "Müşteri" | "Alt Bayi"
      yazi_durumu: "Taslak" | "Yayınlandı"
      zahlungshaeufigkeit: "Monatlich" | "Jährlich" | "Einmalig" | "Bedarf"
    }
    CompositeTypes: {
      order_item: {
        urun_id: string | null
        adet: number | null
        o_anki_satis_fiyati: number | null
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
      ],
      etkinlik_turu: [
        "Telefon Görüşmesi",
        "Müşteri Ziyareti",
        "E-posta",
        "Durum Değişikliği",
        "Diğer",
      ],
      fatura_durumu: ["pending", "paid", "overdue", "cancelled"],
      firma_kategori: ["Kafe", "Restoran", "Otel", "Alt Bayi", "Zincir Market"],
      firma_status: [
        "Potansiyel",
        "İlk Temas",
        "Numune Sunuldu",
        "Teklif Verildi",
        "Anlaşma Sağlandı",
        "Pasif",
      ],
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
      user_role: ["Yönetici", "Ekip Üyesi", "Müşteri", "Alt Bayi"],
      yazi_durumu: ["Taslak", "Yayınlandı"],
      zahlungshaeufigkeit: ["Monatlich", "Jährlich", "Einmalig", "Bedarf"],
    },
  },
} as const
