"use client";

import React, { useEffect, useRef, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Modal, Box, TextField, Button, Typography } from '@mui/material';
import { saveProduct } from '@/app/admin/products/actions';

// Tipler
interface Product { id: number; name_de: string; category_de: string; price: number; stock_quantity: number; image_url: string; }
interface ProductFormModalProps { open: boolean; onClose: () => void; dictionary: any; productToEdit: Product | null; }
interface FormState { success: boolean; message: string; }

// Stil
const style = { position: 'absolute' as 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 400, bgcolor: 'background.paper', boxShadow: 24, p: 4, borderRadius: 2 };

// Buton bileşeni
function SubmitButton({ dictionary }: { dictionary: any }) {
  const { pending } = useFormStatus();
  return ( <Button type="submit" variant="contained" style={{ backgroundColor: '#C69F6B', color: '#2B2B2B' }} disabled={pending}>{pending ? 'Speichern...' : dictionary.save}</Button> );
}

const ProductFormModal: React.FC<ProductFormModalProps> = ({ open, onClose, dictionary, productToEdit }) => {
  const formRef = useRef<HTMLFormElement>(null);
  const initialState: FormState = { success: false, message: '' };
  const [state, formAction] = useActionState(saveProduct, initialState);

  useEffect(() => { if (state.success) onClose(); }, [state, onClose]);
  useEffect(() => { if (!open) formRef.current?.reset(); }, [open]);

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={style} component="form" action={formAction} ref={formRef}>
        <Typography id="product-modal-title" variant="h6" component="h2" sx={{ mb: 2, fontFamily: 'Playfair Display' }}>
          {productToEdit ? dictionary.modalTitleEdit : dictionary.modalTitleCreate}
        </Typography>

        {productToEdit && <input type="hidden" name="id" value={productToEdit.id} />}
        <input type="hidden" name="current_image_url" value={productToEdit?.image_url || ''} />
        
        <TextField margin="dense" required fullWidth name="name_de" label={dictionary.productName} defaultValue={productToEdit?.name_de || ''} />
        <TextField margin="dense" required fullWidth name="category_de" label={dictionary.category} defaultValue={productToEdit?.category_de || ''} />
        <TextField margin="dense" required fullWidth name="price" label={dictionary.price} type="number" defaultValue={productToEdit?.price || ''} />
        <TextField margin="dense" required fullWidth name="stock_quantity" label={dictionary.stock} type="number" defaultValue={productToEdit?.stock_quantity || ''} />
        
        {!state.success && state.message && <Typography color="error" variant="body2">{state.message}</Typography>}

        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Button onClick={onClose}>{dictionary.cancel}</Button>
          <SubmitButton dictionary={dictionary} />
        </Box>
      </Box>
    </Modal>
  );
};

export default ProductFormModal;