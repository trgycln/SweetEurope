import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { 
    flexDirection: 'column', 
    padding: 20, 
    paddingTop: 75,
    paddingBottom: 30,
    orientation: 'landscape', 
    fontSize: 9,
    fontFamily: 'Helvetica'
  },
  headerContainer: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    flexDirection: 'column'
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 10, 
    borderBottom: '1 solid #ccc', 
    paddingBottom: 5 
  },
  headerTitle: { fontSize: 16, fontWeight: 'bold' },
  headerDate: { fontSize: 9, color: '#666' },
  table: { display: 'flex', flexDirection: 'column', width: 'auto' },
  tableHeader: { 
    flexDirection: 'row', 
    backgroundColor: '#333', 
    color: '#fff', 
    padding: 6, 
    fontWeight: 'bold', 
    fontSize: 9 
  },
  categoryRow: { 
    backgroundColor: '#f0f0f0', 
    padding: 6, 
    marginTop: 4, 
    marginBottom: 2, 
    fontSize: 10, 
    fontWeight: 'bold' 
  },
  tableRow: { 
    flexDirection: 'row', 
    borderBottom: '1 solid #eee', 
    paddingVertical: 5, 
    paddingHorizontal: 4,
    alignItems: 'center' 
  },
  tableRowEven: { backgroundColor: '#fdfdfd' },
  tableRowOdd: { backgroundColor: '#ffffff' },
  colBild: { width: '8%', justifyContent: 'center', alignItems: 'center' },
  colProdukt: { width: '37%', paddingRight: 8 },
  colLogistik: { width: '19%', paddingRight: 8 },
  colPrice1: { width: '12%', textAlign: 'right' },
  colPrice2: { width: '12%', textAlign: 'right' },
  colPrice3: { width: '12%', textAlign: 'right', paddingRight: 4 },
  image: { width: 30, height: 30, objectFit: 'contain' },
  productName: { fontWeight: 'bold', marginBottom: 2 },
  details: { color: '#666', fontSize: 7 },
  preorderText: { color: '#e63946', fontSize: 8, fontWeight: 'bold', marginTop: 2 },
  pageNumber: {
    position: 'absolute',
    bottom: 10,
    left: 20,
    right: 20,
    textAlign: 'center',
    fontSize: 8,
    color: '#999'
  }
});

const formatPrice = (val: any) => {
  const num = Number(val);
  return isNaN(num) ? '-' : `€ ${num.toFixed(2)}`;
};

export const KatalogPdfDocument = ({ data, locale }: { data: any[], locale: 'de' | 'en' }) => (
  <Document>
    <Page size="A4" orientation="landscape" style={styles.page}>
      
      {/* Sabit Header - Her sayfada tekrar eder */}
      <View style={styles.headerContainer} fixed>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {locale === 'en' ? 'Elyson Sweets B2B Price List & Product Catalog' : 'Elyson Sweets B2B Preisliste & Produktkatalog'}
          </Text>
          <Text style={styles.headerDate}>
            {locale === 'en' ? 'Date:' : 'Stand:'} {new Date().toLocaleDateString(locale === 'en' ? 'en-GB' : 'de-DE')}
            {'  |  '}
            {locale === 'en' ? 'All prices are net, excl. VAT' : 'Alle Preise netto zzgl. MwSt.'}
          </Text>
        </View>

        <View style={styles.tableHeader}>
          <Text style={styles.colBild}>{locale === 'en' ? 'Image' : 'Bild'}</Text>
          <Text style={styles.colProdukt}>{locale === 'en' ? 'Product & Details' : 'Produkt & Details'}</Text>
          <Text style={styles.colLogistik}>{locale === 'en' ? 'Logistics' : 'Logistik'}</Text>
          <Text style={styles.colPrice1}>1-4 Kartons</Text>
          <Text style={styles.colPrice2}>5+ Kartons</Text>
          <Text style={styles.colPrice3}>Palette</Text>
        </View>
      </View>

      <View style={styles.table}>

        {data.map((cat, i) => (
          <React.Fragment key={i}>
            <View style={styles.categoryRow} wrap={false}>
              <Text>{cat.categoryName}</Text>
            </View>
            {cat.products.map((prod: any, j: number) => (
              <View style={[styles.tableRow, j % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd]} key={j} wrap={false}>
                <View style={styles.colBild}>
                  {prod.image ? (
                    <Image 
                      src={
                        prod.image.startsWith('/') 
                          ? `https://elysonsweets.de${prod.image}` 
                          : prod.image
                      } 
                      style={styles.image} 
                    />
                  ) : (
                    <View style={styles.image} />
                  )}
                </View>
                <View style={styles.colProdukt}>
                  <Text style={styles.productName}>{prod.name}</Text>
                  {!prod.inStock && (
                    <Text style={styles.preorderText}>
                      {locale === 'en' ? '(Pre-order)' : '(Vorbestellung)'}
                    </Text>
                  )}
                  <Text style={styles.details}>
                    Art-Nr: {prod.artNr || '-'} | EAN: {prod.ean || '-'}
                  </Text>
                </View>
                <View style={styles.colLogistik}>
                  <Text style={styles.details}>
                    {locale === 'en' ? 'Weight:' : 'Gewicht:'} {prod.weight || '-'} kg
                  </Text>
                  <Text style={styles.details}>VPE: {prod.boxQty || '-'} {locale === 'en' ? 'pcs' : 'Stk'}</Text>
                  <Text style={styles.details}>Palette: {prod.palletQty || '-'} {locale === 'en' ? 'boxes' : 'Kartons'}</Text>
                </View>
                <Text style={styles.colPrice1}>{formatPrice(prod.price1)}</Text>
                <Text style={styles.colPrice2}>{formatPrice(prod.price2)}</Text>
                <Text style={styles.colPrice3}>{formatPrice(prod.price3)}</Text>
              </View>
            ))}
          </React.Fragment>
        ))}
      </View>
      
      {/* Sayfa Numarası */}
      <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => (
        `${pageNumber} / ${totalPages}`
      )} fixed />
    </Page>
  </Document>
);

export default KatalogPdfDocument;
