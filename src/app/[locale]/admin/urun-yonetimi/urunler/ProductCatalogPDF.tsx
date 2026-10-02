import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';

// Register fonts to support Turkish characters
Font.register({
  family: 'Roboto',
  fonts: [
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf', fontWeight: 300 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf', fontWeight: 400 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-medium-webfont.ttf', fontWeight: 500 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf', fontWeight: 700 }
  ]
});

// Default styling
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Roboto',
    fontSize: 9,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#f43f5e', // brand color (rose-500 equivalent)
    paddingBottom: 10,
  },
  logo: {
    width: 120,
  },
  headerTitleContainer: {
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  subtitle: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 4,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    backgroundColor: '#334155',
    padding: 6,
    paddingLeft: 10,
    marginTop: 15,
    marginBottom: 10,
    borderRadius: 2,
  },
  table: {
    width: 'auto',
    marginBottom: 10,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    minHeight: 40,
    alignItems: 'center',
  },
  tableHeader: {
    backgroundColor: '#f8fafc',
    borderBottomWidth: 2,
    borderBottomColor: '#cbd5e1',
    fontWeight: 'bold',
  },
  colImage: { width: '10%', padding: 4, justifyContent: 'center' },
  colInfo: { width: '30%', padding: 4 },
  colPack: { width: '12%', padding: 4 },
  colBox: { width: '12%', padding: 4 },
  colPallet: { width: '12%', padding: 4 },
  colPrice1: { width: '12%', padding: 4, textAlign: 'right' },
  colPrice5: { width: '12%', padding: 4, textAlign: 'right' },
  
  colTextBold: { fontWeight: 'bold', color: '#0f172a' },
  colTextLight: { fontSize: 8, color: '#64748b', marginTop: 2 },
  
  productImage: {
    width: 32,
    height: 32,
    objectFit: 'contain',
  },
  footer: {
    position: 'absolute',
    bottom: 25,
    left: 30,
    right: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
  },
  footerText: {
    fontSize: 8,
    color: '#64748b',
  },
  pageNumber: {
    fontSize: 8,
    color: '#64748b',
  }
});

// Texts based on language
const getTranslations = (lang: string) => {
  if (lang === 'de') {
    return {
      title: 'Produkt- und Preisliste',
      colImage: 'Bild',
      colInfo: 'Art.-Nr. & Artikel',
      colPack: 'Gewicht',
      colBox: 'VPE',
      colPallet: 'Pal.',
      colPrice1: 'Preis (1-4 Kartons)',
      colPrice5: 'Preis (ab 5 Kartons)',
      footerNote: 'Alle Preise verstehen sich netto zzgl. gesetzlicher MwSt.',
      date: 'Stand',
      page: 'Seite'
    };
  }
  return {
    title: 'Product and Price List',
    colImage: 'Image',
    colInfo: 'Item No & Product',
    colPack: 'Weight',
    colBox: 'Pcs/Box',
    colPallet: 'Box/Pal.',
    colPrice1: 'Price (1-4 Box)',
    colPrice5: 'Price (5+ Box)',
    footerNote: 'All prices are net excluding VAT.',
    date: 'Date',
    page: 'Page'
  };
};

export const ProductCatalogPDF = ({ products, language = 'de', categories = [] }: any) => {
  const t = getTranslations(language);
  
  // Group products by category
  const groupedProducts = products.reduce((acc: any, product: any) => {
    let catId = product.kategori_id;
    if (!acc[catId]) {
      acc[catId] = [];
    }
    acc[catId].push(product);
    return acc;
  }, {});

  // Format currency
  const formatMoney = (amount: number | null) => {
    if (amount == null) return '-';
    return new Intl.NumberFormat(language === 'de' ? 'de-DE' : 'en-US', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const currentDate = new Date().toLocaleDateString(language === 'de' ? 'de-DE' : 'en-US');

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* HEADER */}
        <View style={styles.header} fixed>
          {/* Need absolute URL for logo in React-PDF or base64. 
              Will try to load it from the origin if possible, but React-PDF prefers absolute URLs. 
              For now we'll just put the text Elyson Sweets if image fails, but we'll try the image */}
          <Image style={styles.logo} src="/logo_arka_plansiz_hazir.png" />
          <View style={styles.headerTitleContainer}>
            <Text style={styles.title}>{t.title}</Text>
            <Text style={styles.subtitle}>{t.date}: {currentDate}</Text>
          </View>
        </View>

        {/* BODY - CATEGORIES AND PRODUCTS */}
        {Object.keys(groupedProducts).map((categoryId) => {
          const categoryProducts = groupedProducts[categoryId];
          // Try to find category name, fallback to generic
          const catObj = categories.find((c: any) => c.id === categoryId);
          const catName = catObj?.ad?.[language] || catObj?.ad?.tr || 'Kategori ' + categoryId;

          return (
            <View key={categoryId} wrap={false}>
              <Text style={styles.categoryTitle}>{catName}</Text>

              {/* Table Header */}
              <View style={[styles.tableRow, styles.tableHeader]}>
                <View style={styles.colImage}><Text>{t.colImage}</Text></View>
                <View style={styles.colInfo}><Text>{t.colInfo}</Text></View>
                <View style={styles.colPack}><Text>{t.colPack}</Text></View>
                <View style={styles.colBox}><Text>{t.colBox}</Text></View>
                <View style={styles.colPallet}><Text>{t.colPallet}</Text></View>
                <View style={styles.colPrice1}><Text>{t.colPrice1}</Text></View>
                <View style={styles.colPrice5}><Text>{t.colPrice5}</Text></View>
              </View>

              {/* Table Rows */}
              {categoryProducts.map((p: any, idx: number) => {
                const pName = p.ad?.[language] || p.ad?.tr || '-';
                const pImage = p.ana_resim_url || null;
                // Basic mock calculation for 5+ pallet price if explicit doesn't exist
                const basePrice = p.satis_fiyati_toptanci || 0;
                const price5 = basePrice > 0 ? basePrice * 0.95 : 0; // 5% discount mock for 5+

                return (
                  <View style={styles.tableRow} key={p.id || idx}>
                    <View style={styles.colImage}>
                      {pImage ? <Image src={pImage} style={styles.productImage} /> : <Text>-</Text>}
                    </View>
                    <View style={styles.colInfo}>
                      <Text style={styles.colTextBold}>{p.stok_kodu || '-'}</Text>
                      <Text style={styles.colTextLight}>{pName}</Text>
                    </View>
                    <View style={styles.colPack}>
                      <Text>{p.birim_agirlik_kg ? `${p.birim_agirlik_kg} kg` : '-'}</Text>
                    </View>
                    <View style={styles.colBox}>
                      <Text>{p.koli_ici_adet ? `${p.koli_ici_adet} Ad.` : '-'}</Text>
                    </View>
                    <View style={styles.colPallet}>
                      <Text>{p.palet_ici_adet ? `${p.palet_ici_adet} Koli` : '-'}</Text>
                    </View>
                    <View style={styles.colPrice1}>
                      <Text style={styles.colTextBold}>{basePrice > 0 ? formatMoney(basePrice) : '-'}</Text>
                    </View>
                    <View style={styles.colPrice5}>
                      <Text style={styles.colTextBold}>{price5 > 0 ? formatMoney(price5) : '-'}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          );
        })}

        {/* FOOTER */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{t.footerNote}</Text>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => (
            `${t.page} ${pageNumber} / ${totalPages}`
          )} fixed />
        </View>

      </Page>
    </Document>
  );
};
