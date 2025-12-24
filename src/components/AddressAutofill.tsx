'use client';

import React, { useState, useEffect } from 'react';
import { fetchLocationByPlz } from '@/lib/plzLookup';
import { FiLoader, FiMapPin } from 'react-icons/fi';

interface AddressAutofillProps {
    defaultCity?: string;
    defaultDistrict?: string;
    defaultNeighborhood?: string;
    defaultZipCode?: string;
    disabled?: boolean;
}

export default function AddressAutofill({
    defaultCity = '',
    defaultDistrict = '',
    defaultNeighborhood = '',
    defaultZipCode = '',
    disabled = false
}: AddressAutofillProps) {
    const [plz, setPlz] = useState(defaultZipCode);
    const [city, setCity] = useState(defaultCity);
    const [district, setDistrict] = useState(defaultDistrict);
    const [neighborhood, setNeighborhood] = useState(defaultNeighborhood);
    const [loading, setLoading] = useState(false);

    // Update state if defaults change (e.g. when data loads in edit mode)
    useEffect(() => {
        setPlz(defaultZipCode);
        setCity(defaultCity);
        setDistrict(defaultDistrict);
        setNeighborhood(defaultNeighborhood);
    }, [defaultCity, defaultDistrict, defaultNeighborhood, defaultZipCode]);

    const handlePlzChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const newPlz = e.target.value;
        setPlz(newPlz);

        // Only search if 5 digits
        if (newPlz.length === 5 && !isNaN(Number(newPlz))) {
            setLoading(true);
            try {
                const location = await fetchLocationByPlz(newPlz);
                if (location) {
                    setCity(location.city);
                    if (location.district) {
                        setDistrict(location.district);
                    }
                    // Neighborhood (Mahalle) is usually more granular than District (Ilce)
                    // In our context, we map District -> Ilce.
                }
            } catch (error) {
                console.error("Auto-fill error:", error);
            } finally {
                setLoading(false);
            }
        }
    };

    const inputBaseClasses = "w-full bg-gray-50 border border-gray-300 rounded-lg p-3 text-sm text-gray-700 focus:ring-2 focus:ring-accent focus:border-transparent transition-colors duration-200 placeholder:text-gray-400 disabled:opacity-60 disabled:cursor-not-allowed";
    const labelBaseClasses = "block text-sm font-bold text-gray-700 mb-2";

    return (
        <>
            {/* PLZ Input */}
            <div>
                <label htmlFor="posta_kodu" className={labelBaseClasses}>
                    PLZ (Zip Code)
                    {loading && <span className="ml-2 inline-block animate-spin text-accent"><FiLoader /></span>}
                </label>
                <div className="relative">
                    <input
                        type="text"
                        id="posta_kodu"
                        name="posta_kodu"
                        value={plz}
                        onChange={handlePlzChange}
                        disabled={disabled}
                        className={inputBaseClasses}
                        placeholder="50667"
                        maxLength={5}
                    />
                    {!loading && plz.length === 5 && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                            <FiMapPin />
                        </div>
                    )}
                </div>
            </div>

            {/* City Input */}
            <div>
                <label htmlFor="sehir" className={labelBaseClasses}>Stadt (City)</label>
                <input
                    type="text"
                    id="sehir"
                    name="sehir"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    disabled={disabled}
                    className={inputBaseClasses}
                    placeholder="Köln"
                />
            </div>

            {/* District Input */}
            <div>
                <label htmlFor="ilce" className={labelBaseClasses}>Bezirk (District)</label>
                <input
                    type="text"
                    id="ilce"
                    name="ilce"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    disabled={disabled}
                    className={inputBaseClasses}
                    placeholder="Innenstadt"
                />
            </div>

            {/* Neighborhood Input (Optional) */}
            <div>
                <label htmlFor="mahalle" className={labelBaseClasses}>Stadtteil (Neighborhood)</label>
                <input
                    type="text"
                    id="mahalle"
                    name="mahalle"
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    disabled={disabled}
                    className={inputBaseClasses}
                    placeholder="Altstadt-Nord"
                />
            </div>
        </>
    );
}