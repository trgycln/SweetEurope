"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  FiShoppingCart,
  FiPlus,
  FiMinus,
  FiCheck,
  FiX,
  FiZap,
  FiPackage,
  FiInfo,
} from "react-icons/fi";
import { LuBarcode, LuPackage } from "react-icons/lu";
import { Locale } from "@/i18n-config";
import { Dictionary } from "@/dictionaries";
import { ProduktMitPreis } from "@/app/[locale]/portal/katalog/types";
import { computeTedarikDurumu } from "@/lib/utils";
import {
  getLocalizedName,
  getBirimFiyatKatalog,
  getToplamAdetKatalog,
  formatCurrency,
  Birim,
} from "./KatalogProductCard";
import { ProductDietaryBadges } from "@/components/DietaryStickers";

interface FastReplenishmentSheetProps {
  produkte: ProduktMitPreis[];
  locale: Locale;
  dictionary?: Dictionary | null;
  onBulkAddToCart: (
    items: Array<{ produkt: ProduktMitPreis; menge: number; birim: Birim }>,
  ) => void;
}

export function FastReplenishmentSheet({
  produkte,
  locale,
  dictionary,
  onBulkAddToCart,
}: FastReplenishmentSheetProps) {
  // State: Her ürün için seçilen miktar ve birim
  const [selections, setSelections] = useState<
    Record<string, { menge: number; birim: Birim }>
  >({});

  const handleQuantityChange = (
    produktId: string,
    delta: number,
    currentBirim: Birim = "koli",
  ) => {
    setSelections((prev) => {
      const current = prev[produktId] || { menge: 0, birim: currentBirim };
      const newMenge = Math.max(0, current.menge + delta);
      return {
        ...prev,
        [produktId]: {
          ...current,
          menge: newMenge,
          birim: current.birim || currentBirim,
        },
      };
    });
  };

  const handleSetQuantity = (
    produktId: string,
    menge: number,
    currentBirim: Birim = "koli",
  ) => {
    setSelections((prev) => {
      const current = prev[produktId] || { menge: 0, birim: currentBirim };
      return {
        ...prev,
        [produktId]: {
          ...current,
          menge: Math.max(0, menge),
          birim: current.birim || currentBirim,
        },
      };
    });
  };

  const handleBirimChange = (produktId: string, birim: Birim) => {
    setSelections((prev) => {
      const current = prev[produktId] || { menge: 0, birim: "koli" };
      return {
        ...prev,
        [produktId]: { ...current, birim },
      };
    });
  };

  const handleSetAllToOne = () => {
    const next: Record<string, { menge: number; birim: Birim }> = {};
    produkte.forEach((p) => {
      next[p.id] = { menge: 1, birim: "koli" };
    });
    setSelections(next);
  };

  const handleClearAll = () => {
    setSelections({});
  };

  // Özet hesaplamaları
  const { selectedItems, totalUnits, totalPrice } = useMemo(() => {
    const items: Array<{
      produkt: ProduktMitPreis;
      menge: number;
      birim: Birim;
      itemTotal: number;
    }> = [];
    let totalUnitsCount = 0;
    let totalSum = 0;

    produkte.forEach((p) => {
      const sel = selections[p.id];
      if (sel && sel.menge > 0) {
        const totalAdet = getToplamAdetKatalog(p, sel.birim, sel.menge);
        const unitPrice = getBirimFiyatKatalog(p, sel.birim, sel.menge);
        const itemTotal = totalAdet * unitPrice;
        items.push({
          produkt: p,
          menge: sel.menge,
          birim: sel.birim,
          itemTotal,
        });
        totalUnitsCount += sel.menge;
        totalSum += itemTotal;
      }
    });

    return {
      selectedItems: items,
      totalUnits: totalUnitsCount,
      totalPrice: totalSum,
    };
  }, [produkte, selections]);

  const handleSubmit = () => {
    if (selectedItems.length === 0) return;
    onBulkAddToCart(
      selectedItems.map((item) => ({
        produkt: item.produkt,
        menge: item.menge,
        birim: item.birim,
      })),
    );
    setSelections({});
  };

  if (produkte.length === 0) {
    return (
      <div className="bg-white border border-stone-200 rounded-2xl p-12 text-center text-stone-500">
        <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <FiZap size={28} />
        </div>
        <h3 className="font-bold text-stone-800 text-lg">
          {locale === "de"
            ? "Noch keine Routine-Produkte vorhanden"
            : "Henüz rutin ürün listeniz oluşmadı"}
        </h3>
        <p className="text-sm text-stone-500 max-w-md mx-auto mt-2">
          {locale === "de"
            ? "Sobald Sie Bestellungen aufgeben oder Produkte zu Ihren Favoriten hinzufügen, erscheinen Ihre wichtigsten Artikel automatisch hier."
            : "Sipariş verdikçe veya ürünleri favorilerinize ekledikçe en sık kullandığınız ürünler otomatik olarak burada listelenecektir."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header & Quick Action Presets */}
      <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-amber-600 text-white flex items-center justify-center text-xs font-bold">
              ⚡
            </span>
            <h2 className="font-bold text-stone-900 text-base sm:text-lg">
              {locale === "de"
                ? "Häufig bestellte Routine-Artikel"
                : "Rutin Sipariş İkmal Listesi"}
            </h2>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            {locale === "de"
              ? "Tragen Sie einfach die gewünschten Mengen ein und fügen Sie alles mit einem Klick dem Warenkorb hinzu."
              : "Deponuzda azalan ürünlerin yanına miktarları girin ve tek tıkla topluca sepete aktarın."}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleSetAllToOne}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-amber-300 text-amber-900 hover:bg-amber-100/50 rounded-xl text-xs font-bold shadow-sm transition-colors"
          >
            <FiCheck size={14} className="text-amber-600" />
            <span>
              {locale === "de" ? "Alle +1 Karton" : "Hepsine +1 Koli"}
            </span>
          </button>
          {Object.keys(selections).some((k) => selections[k]?.menge > 0) && (
            <button
              onClick={handleClearAll}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-stone-200 text-stone-600 hover:text-red-600 hover:bg-red-50 rounded-xl text-xs font-semibold transition-colors"
            >
              <FiX size={14} />
              <span>{locale === "de" ? "Zurücksetzen" : "Temizle"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Replenishment List Table / Cards */}
      <div className="bg-white border border-stone-200/90 rounded-2xl shadow-sm overflow-hidden divide-y divide-stone-100">
        {produkte.map((produkt) => {
          const name = getLocalizedName(produkt.ad, locale);
          const sel = selections[produkt.id] || { menge: 0, birim: "koli" };
          const koliAdet = Number(produkt.koli_ici_adet ?? 1);
          const paletKoli = Number(
            produkt.palet_ici_koli_adet ?? produkt.palet_ici_adet ?? 0,
          );

          const unitPrice = getBirimFiyatKatalog(
            produkt,
            sel.birim,
            sel.menge || 1,
          );
          const totalAdet = getToplamAdetKatalog(produkt, sel.birim, sel.menge);
          const subtotal = totalAdet * unitPrice;

          // Stok durumu
          const stokMiktar = produkt.stok_miktari ?? 0;
          const durum = computeTedarikDurumu(
            stokMiktar,
            (produkt as any).stok_tukenme_tarihi,
          );
          const isOutOfStock = durum === "tukendi" || durum === "talep_uzerine";

          return (
            <div
              key={produkt.id}
              className={`p-3.5 sm:p-4 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                sel.menge > 0 ? "bg-amber-50/30" : "hover:bg-stone-50/50"
              }`}
            >
              {/* Left: Image + Info */}
              <div className="flex items-start gap-3.5 flex-1 min-w-0">
                <Link
                  href={`/${locale}/portal/katalog/${produkt.id}`}
                  className="relative w-14 h-14 sm:w-16 sm:h-16 bg-stone-50 border border-stone-100 rounded-xl overflow-hidden flex-shrink-0 p-1 block group"
                >
                  <Image
                    src={produkt.ana_resim_url || "/placeholder.png"}
                    alt={name}
                    fill
                    sizes="64px"
                    className="object-contain group-hover:scale-105 transition-transform"
                    loading="lazy"
                  />
                </Link>

                <div className="flex-1 min-w-0 space-y-1">
                  <Link
                    href={`/${locale}/portal/katalog/${produkt.id}`}
                    className="font-bold text-sm sm:text-base text-stone-900 hover:text-amber-600 transition-colors leading-snug line-clamp-2"
                  >
                    {name}
                  </Link>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md">
                      <LuBarcode size={11} className="text-stone-400" />
                      {produkt.stok_kodu || "—"}
                    </span>

                    {isOutOfStock ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200">
                        {locale === "de" ? "Nicht auf Lager" : "Stokta yok"}
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        ✓ {locale === "de" ? "Auf Lager" : "Stokta"}
                      </span>
                    )}

                    {koliAdet > 0 && (
                      <span className="text-[10px] text-stone-500 flex items-center gap-1">
                        <LuPackage size={11} /> {koliAdet}{" "}
                        {locale === "de" ? "Stk./Ktn." : "adet/koli"}
                      </span>
                    )}
                  </div>

                  {/* Dietary Badges */}
                  <ProductDietaryBadges
                    teknikOzellikler={produkt.teknik_ozellikler as any}
                    zertifikate={produkt.zertifikate}
                    size="xs"
                  />
                </div>
              </div>

              {/* Right: Pricing + Unit Selector + Stepper */}
              <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 lg:gap-4 flex-shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-stone-100">
                {/* Unit Price */}
                <div className="flex flex-col items-start sm:items-end">
                  <span className="text-xs font-bold text-stone-900">
                    {formatCurrency(unitPrice)}
                    <span className="text-[10px] text-stone-400 font-normal ml-1">
                      /
                      {sel.birim === "koli"
                        ? locale === "de"
                          ? "Ktn."
                          : "Koli"
                        : sel.birim === "palet"
                          ? locale === "de"
                            ? "Pal."
                            : "Palet"
                          : locale === "de"
                            ? "Stk."
                            : "Adet"}
                    </span>
                  </span>
                  {produkt.partnerPreis && (
                    <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.2 rounded">
                      {locale === "de" ? "Partner-Preis" : "Özel Fiyat"}
                    </span>
                  )}
                </div>

                {/* Unit Selector */}
                <div className="flex items-center p-0.5 bg-stone-100 rounded-xl border border-stone-200/60 text-xs">
                  <button
                    type="button"
                    onClick={() => handleBirimChange(produkt.id, "koli")}
                    className={`px-2 py-1 rounded-lg font-bold transition-all ${
                      sel.birim === "koli"
                        ? "bg-white text-stone-900 shadow-sm"
                        : "text-stone-500 hover:text-stone-800"
                    }`}
                  >
                    {locale === "de" ? "Karton" : "Koli"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBirimChange(produkt.id, "adet")}
                    className={`px-2 py-1 rounded-lg font-bold transition-all ${
                      sel.birim === "adet"
                        ? "bg-white text-stone-900 shadow-sm"
                        : "text-stone-500 hover:text-stone-800"
                    }`}
                  >
                    {locale === "de" ? "Stück" : "Adet"}
                  </button>
                  {paletKoli > 0 && (
                    <button
                      type="button"
                      onClick={() => handleBirimChange(produkt.id, "palet")}
                      className={`px-2 py-1 rounded-lg font-bold transition-all ${
                        sel.birim === "palet"
                          ? "bg-white text-stone-900 shadow-sm"
                          : "text-stone-500 hover:text-stone-800"
                      }`}
                    >
                      {locale === "de" ? "Palette" : "Palet"}
                    </button>
                  )}
                </div>

                {/* Stepper */}
                <div className="flex items-center border-2 border-stone-200 rounded-xl bg-white overflow-hidden shadow-sm">
                  <button
                    type="button"
                    onClick={() =>
                      handleQuantityChange(produkt.id, -1, sel.birim)
                    }
                    disabled={sel.menge <= 0}
                    className="w-8 h-8 flex items-center justify-center text-stone-600 hover:bg-stone-100 active:bg-stone-200 disabled:opacity-30 disabled:hover:bg-transparent font-bold transition-colors"
                  >
                    <FiMinus size={13} />
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={sel.menge === 0 ? "" : sel.menge}
                    placeholder="0"
                    onChange={(e) =>
                      handleSetQuantity(
                        produkt.id,
                        parseInt(e.target.value) || 0,
                        sel.birim,
                      )
                    }
                    className="w-12 text-center text-sm font-bold text-stone-900 focus:outline-none py-1"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      handleQuantityChange(produkt.id, 1, sel.birim)
                    }
                    className="w-8 h-8 flex items-center justify-center text-stone-600 hover:bg-stone-100 active:bg-stone-200 font-bold transition-colors"
                  >
                    <FiPlus size={13} />
                  </button>
                </div>

                {/* Subtotal preview if > 0 */}
                {sel.menge > 0 && (
                  <div className="w-24 text-right">
                    <span className="font-extrabold text-sm text-amber-900 block">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating / Sticky Bottom Bar when items are selected */}
      {selectedItems.length > 0 && (
        <div className="sticky bottom-4 z-40 bg-stone-900/95 backdrop-blur-md text-white border border-stone-700/80 rounded-2xl p-4 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-bold">
              <FiShoppingCart size={18} />
            </div>
            <div>
              <p className="font-bold text-sm sm:text-base">
                {selectedItems.length}{" "}
                {locale === "de"
                  ? "verschiedene Artikel ausgewählt"
                  : "farklı ürün seçildi"}
              </p>
              <p className="text-xs text-stone-400">
                {locale === "de" ? "Gesamt:" : "Toplam:"} {totalUnits}{" "}
                {locale === "de" ? "Einheiten" : "Birim"} •{" "}
                <span className="text-amber-400 font-bold text-sm">
                  {formatCurrency(totalPrice)}
                </span>
              </p>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 rounded-xl font-bold text-sm shadow-lg shadow-amber-500/25 transition-all"
          >
            <FiShoppingCart size={16} />
            <span>
              {locale === "de"
                ? `In den Warenkorb (${selectedItems.length})`
                : `Seçilenleri Sepete Ekle (${selectedItems.length})`}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
