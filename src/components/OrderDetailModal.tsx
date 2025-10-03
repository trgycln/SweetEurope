"use client";

import React from 'react';
import { CgClose } from 'react-icons/cg';

const OrderDetailModal: React.FC<{ order: any; dictionary: any; onClose: () => void }> = ({ order, dictionary, onClose }) => {
  if (!order) return null;
  const content = dictionary.dashboard.orderDetailModal;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white p-6 border-b flex justify-between items-center">
          <h2 className="font-serif text-2xl font-bold text-primary">{content.title} #{order.order_id}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-primary transition-colors">
            <CgClose size={24} />
          </button>
        </div>
        <div className="p-6">
          <h3 className="font-bold font-sans tracking-wider uppercase mb-4 text-primary">{content.products}</h3>
          <table className="w-full text-left font-sans mb-8">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="py-2">{content.products}</th>
                <th className="py-2 text-center">{content.quantity}</th>
                <th className="py-2 text-right">{content.price}</th>
              </tr>
            </thead>
            <tbody>
              {/* Veri yapısı Supabase'den gelene göre güncellendi */}
              {order.order_items?.map((item: any) => (
                <tr key={item.id} className="border-b border-gray-100">
                  <td className="py-3 font-medium text-primary">{item.products?.name_de || 'Produkt nicht gefunden'}</td>
                  <td className="py-3 text-center">{item.quantity}</td>
                  <td className="py-3 text-right">€{item.price.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end items-center mb-8">
            <div className="text-right">
              <p className="text-sm text-gray-500">{content.subtotal}</p>
              <p className="font-serif text-2xl font-bold text-primary">€{order.total.toFixed(2)}</p>
            </div>
          </div>
          
          {/* Teslimat adresi ileride eklenebilir */}
        </div>
      </div>
    </div>
  );
};

export default OrderDetailModal;