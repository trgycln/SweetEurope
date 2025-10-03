"use client";

import React, { useCallback, useEffect, useState, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';
import { dictionary } from '@/dictionaries/de';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Menu, MenuItem, IconButton } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import AdminOrderDetailModal from '@/components/AdminOrderDetailModal';
import { updateOrderStatus } from './actions';

interface Product {
  id: number;
  name_de: string;
  category_de: string;
  price: number;
  stock_quantity: number;
  image_url: string;
}

interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  price: number;
  products: Product;
}

interface Order {
  id: number;
  order_id: string;
  created_at: string;
  total: number;
  status: string;
  user_id: string;
  order_items?: OrderItem[];
  profiles: { company_name: string } | null;
}

export default function AdminOrdersPage() {
  const content = dictionary.adminDashboard.ordersPage;
  const supabase = createClient();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isPending, startTransition] = useTransition();
  
  const [actionsAnchorEl, setActionsAnchorEl] = useState<null | HTMLElement>(null);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  
  const [statusAnchorEl, setStatusAnchorEl] = useState<null | HTMLElement>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error("Siparişler çekilirken hata:", error);
      setOrders([]);
    } else {
      setOrders((data || []) as Order[]);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const channel = supabase.channel('realtime orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, 
        () => { fetchOrders(); }
      ).subscribe();
      
    fetchOrders();

    return () => { supabase.removeChannel(channel); };
  }, [supabase, fetchOrders]);
  
  const handleActionsMenuClick = (event: React.MouseEvent<HTMLElement>, order: Order) => {
    setActionsAnchorEl(event.currentTarget);
    setCurrentOrder(order);
  };
  
  const handleActionsMenuClose = () => {
    setActionsAnchorEl(null);
  };
  
  const handleStatusMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setStatusAnchorEl(event.currentTarget);
  };
  
  const handleStatusMenuClose = () => {
    setStatusAnchorEl(null);
    setActionsAnchorEl(null);
    setCurrentOrder(null);
  };

  const handleViewDetails = async (orderToView?: Order) => {
    const orderForDetails = orderToView || currentOrder;
    if (!orderForDetails) return;
    const { data: items, error } = await supabase.from('order_items').select('*, products(*)').eq('order_id', orderForDetails.id);
    if (error) {
      console.error("Sipariş detayları çekilirken hata:", error);
    } else {
      setSelectedOrder({ ...orderForDetails, order_items: items });
    }
    handleActionsMenuClose();
  };

  const handleStatusUpdate = (newStatus: string) => {
    if (!currentOrder) return;
    startTransition(async () => {
      await updateOrderStatus(currentOrder.id, newStatus);
    });
    handleStatusMenuClose();
  };

  const columns: GridColDef[] = [
    { field: 'order_id', headerName: content.orderId, width: 150 },
    { field: 'created_at', headerName: content.date, width: 180, type: 'dateTime', valueGetter: (value) => new Date(value) },
    { 
      field: 'customer', 
      headerName: content.customer, 
      flex: 1, 
      minWidth: 200,
      valueGetter: (value, row) => row.profiles?.company_name || row.user_id 
    },
    { field: 'total', headerName: content.total, type: 'number', width: 130, valueFormatter: (value: number | null) => { if (value == null) { return ''; } return `€${value.toFixed(2)}`; } },
    { field: 'status', headerName: content.status, width: 150 },
    {
      field: 'actions',
      headerName: content.actions,
      width: 150,
      sortable: false,
      renderCell: (params) => (
        <IconButton
          aria-label="eylemler"
          onClick={(e) => handleActionsMenuClick(e, params.row)}
          disabled={isPending}
        >
          <MoreVertIcon />
        </IconButton>
      ),
    },
  ];

  return (
    <>
      <div className="bg-white rounded-lg shadow-lg flex-1 flex flex-col min-h-0">
        <div className="flex justify-between items-center mb-6 flex-shrink-0">
          <h1 className="font-serif text-4xl text-primary">{content.title}</h1>
        </div>
          {/* Desktop DataGrid */}
          <div className="hidden md:block flex-1 min-h-0">
            <DataGrid
              rows={orders}
              columns={columns}
              loading={loading || isPending}
              getRowId={(row) => row.id}
            />
          </div>
          {/* Mobile Card List */}
          <div className="md:hidden flex-1 space-y-4 overflow-y-auto">
            {loading ? <p>Yükleniyor...</p> : orders.map(order => (
              <div key={order.id} className="border rounded-lg p-4 space-y-2 shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-bold text-primary">{order.order_id}</span>
                    <p className="text-sm font-medium text-gray-700">{order.profiles?.company_name || 'Unbekannt'}</p>
                  </div>
                  <span className="font-serif font-bold text-accent">€{order.total.toFixed(2)}</span>
                </div>
                <div className="text-sm text-gray-600 border-t pt-2">
                  <p>Datum: {new Date(order.created_at).toLocaleDateString('de-DE')}</p>
                  <p className="capitalize">Status: {order.status}</p>
                </div>
                <div className="flex justify-end pt-1">
                  <IconButton aria-label="eylemler" onClick={(e) => handleActionsMenuClick(e, order)} disabled={isPending}>
                    <MoreVertIcon />
                  </IconButton>
                </div>
              </div>
            ))}
          </div>
      </div>
      
      {selectedOrder && <AdminOrderDetailModal order={selectedOrder} dictionary={dictionary} onClose={() => setSelectedOrder(null)} />}
      
      <Menu anchorEl={actionsAnchorEl} open={Boolean(actionsAnchorEl)} onClose={handleActionsMenuClose}>
        <MenuItem onClick={() => handleViewDetails()}>{content.viewDetails}</MenuItem>
        <MenuItem onClick={handleStatusMenuClick}>{content.updateStatus}</MenuItem>
      </Menu>

      <Menu anchorEl={statusAnchorEl} open={Boolean(statusAnchorEl)} onClose={handleStatusMenuClose}>
        {content.statusOptions && Object.entries(content.statusOptions).map(([key, value]) => (
          <MenuItem key={key} onClick={() => handleStatusUpdate(value as string)}>
            {value as string}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}