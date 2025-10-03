"use client";

import React from 'react';
import { CgClose } from 'react-icons/cg';
import { Modal, Box, Typography, Divider } from '@mui/material';

const style = {
  position: 'absolute' as 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '90%',
  maxWidth: 600,
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 0, // Padding'i iç kısımlarda yöneteceğiz
  borderRadius: 2,
  maxHeight: '90vh',
  display: 'flex',
  flexDirection: 'column',
};

const AdminOrderDetailModal: React.FC<{ order: any; dictionary: any; onClose: () => void }> = ({ order, dictionary, onClose }) => {
  if (!order) return null;
  const content = dictionary.adminDashboard.ordersPage.orderDetailModal;

  return (
    <Modal open={true} onClose={onClose}>
      <Box sx={style}>
        <Box sx={{ p: 3, borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" component="h2" sx={{ fontFamily: 'Playfair Display' }}>
            {content.title} #{order.order_id}
          </Typography>
          <button onClick={onClose} className="text-gray-500 hover:text-primary transition-colors">
            <CgClose size={24} />
          </button>
        </Box>
        <Box sx={{ p: 3, overflowY: 'auto' }}>
          <Typography variant="overline" sx={{ fontWeight: 'bold' }}>{content.products}</Typography>
          <table className="w-full text-left font-sans my-4">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="py-2">{content.products}</th>
                <th className="py-2 text-center">{content.quantity}</th>
                <th className="py-2 text-right">{content.price}</th>
              </tr>
            </thead>
            <tbody>
              {order.order_items?.map((item: any) => (
                <tr key={item.id} className="border-b border-gray-100">
                  <td className="py-3 font-medium text-primary">{item.products?.name_de || 'Produkt nicht gefunden'}</td>
                  <td className="py-3 text-center">{item.quantity}</td>
                  <td className="py-3 text-right">€{item.price.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', textAlign: 'right' }}>
            <div>
              <Typography variant="caption">{content.subtotal}</Typography>
              <Typography variant="h5" sx={{ fontFamily: 'Playfair Display', fontWeight: 'bold' }}>
                €{order.total.toFixed(2)}
              </Typography>
            </div>
          </Box>
        </Box>
      </Box>
    </Modal>
  );
};

export default AdminOrderDetailModal;