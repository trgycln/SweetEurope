'use client';

import React from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { ProductCatalogPDF } from './ProductCatalogPDF';

export default function PDFDownloadLinkWrapper({ products, categories, language, fileName, renderContent }: any) {
  return (
    <PDFDownloadLink
      document={<ProductCatalogPDF products={products} categories={categories} language={language} />}
      fileName={fileName}
      className="w-full flex items-center outline-none"
    >
      {renderContent}
    </PDFDownloadLink>
  );
}
