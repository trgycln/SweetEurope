"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { FaSave, FaTimes, FaSpinner, FaTrashAlt } from 'react-icons/fa';
import { Product, saveProduct, SaveProductState } from './actions'; 

interface ProductFormProps {
    product: Product | null;
    onActionComplete: (result: SaveProductState) => void; // Callback für die Hauptseite
    onClose: () => void;
}

// Interne Komponente für den Sende-Status
function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <button 
            type="submit" 
            className="flex items-center gap-2 px-4 py-2 bg-primary text-secondary rounded-md hover:opacity-90 transition-opacity"
            disabled={pending}
        >
            {pending ? <FaSpinner className="animate-spin" /> : <FaSave />}
            Speichern
        </button>
    );
}

// ---------------------------------------------
// FORMULAR KOMPONENTE
// ---------------------------------------------
export default function ProductForm({ product, onActionComplete, onClose }: ProductFormProps) {
    const initialState: SaveProductState = { success: false, message: '' };
    // useFormState Hook: Verwendet die saveProduct Action für den Formular-Submit
    const [state, formAction] = useFormState(saveProduct, initialState);
    
    const formRef = useRef<HTMLFormElement>(null);
    const [previewImage, setPreviewImage] = useState<string | null>(product?.image_url || null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [deleteImage, setDeleteImage] = useState(false);

    const isEditing = !!product;

    // Effekt, um den Zustand zurückzusetzen oder Feedback zu senden
    useEffect(() => {
        if (state.message) {
            onActionComplete(state);
            // Bei Erfolg das Formular zurücksetzen, falls es ein Hinzufügen-Vorgang war
            if (state.success && !isEditing) {
                formRef.current?.reset();
                setPreviewImage(null);
                setImageFile(null);
            }
        }
    }, [state, onActionComplete, isEditing]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files ? e.target.files[0] : null;
        setImageFile(file);

        if (file) {
            setPreviewImage(URL.createObjectURL(file));
            setDeleteImage(false); // Wenn neues Bild hochgeladen wird, altes nicht löschen
        }
    };
    
    // Formular-Action muss manuell übergeben werden, da wir FormData manipulieren
    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(formRef.current!);
        
        // Füge das File-Objekt hinzu
        if (imageFile) {
             formData.set('image_file', imageFile);
        } else {
             // Wichtig: Falls kein neues File ausgewählt wurde, aber das Feld existiert, muss es gelöscht werden
             formData.delete('image_file'); 
        }

        // Füge den Lösch-Status hinzu
        if (deleteImage) {
            formData.set('delete_image', 'on');
        } else {
            formData.delete('delete_image');
        }

        // Führe die Server Action aus
        formAction(formData);
    };

    return (
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4" encType="multipart/form-data">
            
            {/* Produkt ID (für Update) */}
            {isEditing && (
                <input type="hidden" name="id" defaultValue={product.id} />
            )}
            
            {/* Verstecktes Feld für aktuelle Bild-URL */}
            <input type="hidden" name="current_image_url" defaultValue={product?.image_url || ''} />

            {/* Name und Kategorie */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor="name_de" className="block text-sm font-medium text-gray-700">Name (DE)</label>
                    <input type="text" id="name_de" name="name_de" defaultValue={product?.name_de || ''} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                </div>
                <div>
                    <label htmlFor="category_de" className="block text-sm font-medium text-gray-700">Kategorie (DE)</label>
                    <input type="text" id="category_de" name="category_de" defaultValue={product?.category_de || ''} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                </div>
            </div>

            {/* Beschreibung */}
            <div>
                <label htmlFor="description_de" className="block text-sm font-medium text-gray-700">Beschreibung (DE)</label>
                <textarea id="description_de" name="description_de" defaultValue={product?.description_de || ''} rows={3} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
            </div>

            {/* Preis und Lagerbestand */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor="price" className="block text-sm font-medium text-gray-700">Preis (€)</label>
                    <input type="number" step="0.01" id="price" name="price" defaultValue={product?.price || 0} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                </div>
                <div>
                    <label htmlFor="stock_quantity" className="block text-sm font-medium text-gray-700">Lagerbestand</label>
                    <input type="number" id="stock_quantity" name="stock_quantity" defaultValue={product?.stock_quantity || 0} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                </div>
            </div>

            {/* Bild-Upload und Vorschau */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Produktbild</label>
                <div className="flex items-center space-x-4">
                    {/* Bild Vorschau */}
                    <div className="w-20 h-20 bg-gray-100 border rounded-lg flex-shrink-0 relative overflow-hidden">
                        {previewImage ? (
                             <Image 
                                src={previewImage} 
                                alt="Vorschau" 
                                fill 
                                style={{objectFit: 'cover'}} 
                                sizes="80px"
                            />
                        ) : (
                            <div className="flex items-center justify-center h-full text-xs text-gray-500">
                                Kein Bild
                            </div>
                        )}
                    </div>
                    
                    {/* Datei-Input */}
                    <input 
                        type="file" 
                        id="image_file" 
                        name="image_file" 
                        accept="image/*"
                        onChange={handleFileChange}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-accent file:text-primary hover:file:bg-opacity-80"
                    />
                </div>
                
                {/* Bild Löschen Checkbox */}
                {previewImage && isEditing && (
                    <div className="mt-2 flex items-center">
                        <input 
                            id="delete_image" 
                            type="checkbox" 
                            checked={deleteImage} 
                            onChange={() => setDeleteImage(!deleteImage)}
                            className="h-4 w-4 text-red-600 border-gray-300 rounded"
                        />
                        <label htmlFor="delete_image" className="ml-2 flex items-center text-sm font-medium text-red-600">
                            <FaTrashAlt className="mr-1" /> Vorhandenes Bild löschen
                        </label>
                    </div>
                )}
            </div>
            
            {/* Aktiv Status (Checkbox) */}
            <div className="pt-2">
                <div className="flex items-center">
                    <input 
                        id="is_active" 
                        name="is_active" 
                        type="checkbox" 
                        defaultChecked={product?.is_active ?? true} // Standardmäßig aktiv bei neu
                        className="h-4 w-4 text-accent border-gray-300 rounded"
                    />
                    <label htmlFor="is_active" className="ml-2 block text-sm font-medium text-gray-700">
                        Aktiv (Im Partnerportal anzeigen)
                    </label>
                </div>
            </div>

            {/* Fehlermeldung anzeigen, falls vorhanden */}
            {state.message && !state.success && (
                <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">
                    {state.message}
                </div>
            )}
            
            {/* Aktions-Buttons */}
            <div className="pt-4 flex justify-end space-x-3">
                <button 
                    type="button" 
                    onClick={onClose} 
                    className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                    disabled={useFormStatus().pending}
                >
                    <FaTimes /> Abbrechen
                </button>
                <SubmitButton />
            </div>
        </form>
    );
}