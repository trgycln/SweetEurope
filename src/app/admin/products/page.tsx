"use client";

import React, { useCallback, useEffect, useState, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';
import { dictionary } from '@/dictionaries/de';
import { DataGrid, GridColDef, GridToolbar } from '@mui/x-data-grid';
import { Button, IconButton } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import ProductFormModal from '@/components/ProductFormModal';
import { deleteProduct } from './actions';

interface Product {
  id: number;
  name_de: string;
  category_de: string;
  price: number;
  stock_quantity: number;
  image_url: string;
}

export default function AdminProductsPage() {
  const content = dictionary.adminDashboard.productsPage;
  const supabase = createClient();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isPending, startTransition] = useTransition();

  const fetchProducts = useCallback(async () => {
    const { data, error } = await supabase.from('products').select('*').order('id', { ascending: true });
    if (error) {
      console.error("Ürünler çekilirken hata:", error);
    } else {
      setProducts(data as Product[]);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const channel = supabase.channel('realtime products').on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => { fetchProducts(); }).subscribe();
    fetchProducts();
    return () => { supabase.removeChannel(channel); };
  }, [supabase, fetchProducts]);

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleDelete = (id: number, name: string) => {
    const confirmationMessage = content.deleteConfirmation.replace('{productName}', name);
    if (window.confirm(confirmationMessage)) {
      startTransition(async () => {
        const result = await deleteProduct(id);
        if (!result.success) {
          alert(`Hata: ${result.message}`);
        }
      });
    }
  };

  const handleOpenModalForCreate = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const columns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 90 },
    { field: 'name_de', headerName: content.productName, flex: 1, minWidth: 200 },
    { field: 'category_de', headerName: content.category, width: 180 },
    { field: 'price', headerName: content.price, type: 'number', width: 120, valueFormatter: (value: number | null) => { if (value == null) { return ''; } return `€${value.toFixed(2)}`; } },
    { field: 'stock_quantity', headerName: content.stock, type: 'number', width: 150 },
    {
      field: 'actions',
      headerName: content.actions,
      width: 150,
      sortable: false,
      renderCell: (params) => (
        <div className="flex gap-2">
          <IconButton onClick={() => handleEdit(params.row)} color="primary" aria-label={content.edit} disabled={isPending}>
            <EditIcon />
          </IconButton>
          <IconButton onClick={() => handleDelete(params.row.id, params.row.name_de)} color="error" aria-label={content.delete} disabled={isPending}>
            <DeleteIcon />
          </IconButton>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="bg-white rounded-lg shadow-lg flex-1 flex flex-col min-h-0">
        <div className="flex justify-between items-center mb-6 flex-shrink-0">
          <h1 className="font-serif text-4xl text-primary">{content.title}</h1>
          <div className="hidden md:block">
            <Button 
              variant="contained" 
              style={{ backgroundColor: '#C69F6B', color: '#2B2B2B' }}
              onClick={handleOpenModalForCreate}
              startIcon={<AddIcon />}
            >
              {content.addProduct}
            </Button>
          </div>
          <div className="md:hidden">
            <IconButton 
              style={{ backgroundColor: '#C69F6B', color: '#2B2B2B' }}
              onClick={handleOpenModalForCreate}
              aria-label={content.addProduct}
            >
              <AddIcon />
            </IconButton>
          </div>
        </div>
        
          <div className="hidden md:block flex-1 min-h-0">
            <DataGrid
              rows={products}
              columns={columns}
              loading={loading || isPending}
              getRowId={(row) => row.id}
              slots={{ toolbar: GridToolbar }}
              slotProps={{ toolbar: { showQuickFilter: true } }}
            />
          </div>
          <div className="md:hidden flex-1 space-y-4 overflow-y-auto">
            {loading ? <p>Yükleniyor...</p> : products.map(product => (
              <div key={product.id} className="border rounded-lg p-4 space-y-2 shadow">
                <div className="flex justify-between items-start">
                  <span className="font-bold text-primary pr-2">{product.name_de}</span>
                  <span className="font-serif font-bold text-accent whitespace-nowrap">€{product.price.toFixed(2)}</span>
                </div>
                <div className="text-sm text-gray-600">
                  <p>Kategorie: {product.category_de}</p>
                  <p>Lager: {product.stock_quantity}</p>
                </div>
                <div className="flex gap-2 pt-2 border-t">
                    <IconButton onClick={() => handleEdit(product)} color="primary" size="small" aria-label={content.edit} disabled={isPending}><EditIcon /></IconButton>
                    <IconButton onClick={() => handleDelete(product.id, product.name_de)} color="error" size="small" aria-label={content.delete} disabled={isPending}><DeleteIcon /></IconButton>
                </div>
              </div>
            ))}
          </div>
      </div>
      <ProductFormModal 
        open={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        dictionary={content}
        productToEdit={editingProduct} 
      />
    </>
  );
}