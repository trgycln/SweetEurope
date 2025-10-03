"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { dictionary } from '@/dictionaries/de';
import { FaSearch, FaPlus, FaMinus, FaTrash } from 'react-icons/fa';
import Image from 'next/image';

interface Product {
  id: number;
  name_de: string;
  price: number;
  stock_quantity: number;
  image_url: string;
}

interface CartItem {
  product: Product;
  quantity: number;
}

export default function NewOrderPage() {
  const content = dictionary.newOrderPage;
  const supabase = createClient();
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      const { data, error } = await supabase.from('products').select('*');
      if (error) {
        console.error("Ürünler çekilirken hata oluştu:", error);
      } else {
        setProducts(data as Product[]);
      }
      setLoading(false);
    };
    fetchProducts();
  }, [supabase]);

  const filteredProducts = products.filter(p => 
    p.name_de.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const updateCartQuantity = (productId: number, amount: number) => {
    setCartItems(prevItems => {
      const existingItem = prevItems.find(item => item.product.id === productId);
      if (existingItem) {
        const newQuantity = existingItem.quantity + amount;
        if (newQuantity <= 0) {
          return prevItems.filter(item => item.product.id !== productId);
        }
        return prevItems.map(item =>
          item.product.id === productId ? { ...item, quantity: newQuantity } : item
        );
      }
      if (amount > 0) {
        const productToAdd = products.find(p => p.id === productId);
        if (productToAdd) {
            return [...prevItems, { product: productToAdd, quantity: 1 }];
        }
      }
      return prevItems;
    });
  };

  const removeFromCart = (productId: number) => {
    setCartItems(prevItems => prevItems.filter(item => item.product.id !== productId));
  };
  
  const cartTotal = cartItems.reduce((total, item) => total + (item.product.price * item.quantity), 0);

  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) return;
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Kullanıcı bulunamadı.");
      const { data: orderData, error: orderError } = await supabase.from('orders').insert({ order_id: `SD-${Math.floor(Math.random() * 90000) + 10000}`, total: cartTotal, status: 'In Bearbeitung', user_id: user.id }).select('id').single();
      if (orderError) throw orderError;
      const orderItemsData = cartItems.map(item => ({ order_id: orderData.id, product_id: item.product.id, quantity: item.quantity, price: item.product.price }));
      const { error: itemsError } = await supabase.from('order_items').insert(orderItemsData);
      if (itemsError) throw itemsError;
      alert('Bestellung erfolgreich aufgegeben!');
      setCartItems([]);
      router.push('/dashboard');
      router.refresh();
    } catch (error) {
      console.error('Sipariş oluşturulurken hata oluştu:', error);
      alert('Fehler bei der Bestellung.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-secondary min-h-screen">
      <header className="bg-white shadow-md sticky top-0 z-30">
        <div className="container mx-auto px-6 py-4">
          <h1 className="text-2xl font-serif font-bold text-primary">{content.title}</h1>
        </div>
      </header>
      <main className="container mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Sol Sütun: Ürün Listesi ve Arama */}
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-lg">
          <div className="relative mb-6">
            <input
              type="text"
              placeholder={content.searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md focus:ring-accent focus:border-accent"
            />
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
          {loading ? <p>Yükleniyor...</p> : (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {filteredProducts.map(product => (
                <div key={product.id} className="flex items-center justify-between p-3 border rounded-md gap-2">
                  <div className="flex items-center gap-4 min-w-0">
                    <Image src={product.image_url} alt={product.name_de} width={50} height={50} className="rounded-md object-cover flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-bold text-primary truncate">{product.name_de}</p>
                      <p className="text-sm text-gray-500">{content.stock} {product.stock_quantity}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                     <p className="font-semibold text-primary whitespace-nowrap">€ {product.price.toFixed(2)}</p>
                     <button onClick={() => updateCartQuantity(product.id, 1)} className="bg-accent/10 text-accent p-2 rounded-full hover:bg-accent/20 transition-colors">
                       <FaPlus />
                     </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sağ Sütun: Sipariş Özeti (Sepet) */}
        <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-lg lg:sticky top-24">
           <h2 className="font-serif text-xl font-bold text-primary mb-4 border-b pb-4">{content.orderSummary}</h2>
           {cartItems.length === 0 ? (
             <p className="text-center text-gray-500 py-10">{content.noItems}</p>
           ) : (
             <div className="space-y-4">
               {cartItems.map(item => (
                 <div key={item.product.id} className="flex justify-between items-center gap-2">
                   <div className="min-w-0 mr-2">
                     <p className="font-bold text-primary text-sm truncate">{item.product.name_de}</p>
                     <p className="text-xs text-gray-500 whitespace-nowrap">€ {item.product.price.toFixed(2)}</p>
                   </div>
                   <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => updateCartQuantity(item.product.id, -1)} className="p-1 rounded-full bg-gray-200 hover:bg-gray-300"><FaMinus size={10} /></button>
                      <span className="font-semibold w-6 text-center">{item.quantity}</span>
                      <button onClick={() => updateCartQuantity(item.product.id, 1)} className="p-1 rounded-full bg-gray-200 hover:bg-gray-300"><FaPlus size={10} /></button>
                      <button onClick={() => removeFromCart(item.product.id)} className="text-red-500 hover:text-red-700 ml-1"><FaTrash size={12} /></button>
                   </div>
                 </div>
               ))}
               <div className="border-t pt-4 mt-4 flex justify-between items-center">
                  <p className="font-bold uppercase">{content.total}</p>
                  <p className="font-serif text-2xl font-bold text-accent">€{cartTotal.toFixed(2)}</p>
               </div>
               <button 
                  onClick={handlePlaceOrder}
                  disabled={isSubmitting || cartItems.length === 0}
                  className="w-full bg-accent text-primary font-bold py-3 px-4 rounded-md hover:opacity-90 transition-opacity text-lg mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
               >
                  {isSubmitting ? 'Wird bearbeitet...' : content.placeOrder}
               </button>
             </div>
           )}
        </div>
      </main>
    </div>
  );
}