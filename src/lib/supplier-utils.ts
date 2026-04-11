export type SupplierOption = {
  id: string;
  unvan: string | null;
};

function normalizeRawSupplierName(value: string | null | undefined): string {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .toLowerCase()
    .trim();
}

function stripCompanySuffixes(value: string): string {
  return value
    .replace(/\b(a\.?\s*s\.?|gmbh|ltd\.?|limited|inc\.?|llc|corp\.?|co\.?|kg|ag|bv|sa|sas|sarl|holding|group|grup)\b/gi, ' ')
    .replace(/[^a-z0-9]/gi, '')
    .trim();
}

function supplierNameScore(value: string | null | undefined): number {
  const label = String(value || '').trim();
  if (!label) return 0;

  let score = label.length;
  if (/\b(a\.?ş\.?|as|gmbh|ltd|inc|llc)\b/i.test(label)) score += 25;
  if (/[A-ZÇĞİÖŞÜ]/.test(label)) score += 5;
  return score;
}

export function normalizeSupplierGroupKey(value: string | null | undefined): string {
  const normalized = normalizeRawSupplierName(value);
  if (!normalized) return '';

  return stripCompanySuffixes(normalized);
}

export function getCanonicalSupplierLabel(value: string | null | undefined): string {
  const trimmed = String(value || '').trim();
  return trimmed || 'Kaynak belirtilmedi';
}

export function dedupeSuppliers<T extends SupplierOption>(suppliers: T[]): T[] {
  const grouped = new Map<string, T>();

  for (const supplier of suppliers) {
    const key = normalizeSupplierGroupKey(supplier.unvan) || `id:${supplier.id}`;
    const existing = grouped.get(key);

    if (!existing || supplierNameScore(supplier.unvan) > supplierNameScore(existing.unvan)) {
      grouped.set(key, supplier);
    }
  }

  return [...grouped.values()].sort((left, right) =>
    getCanonicalSupplierLabel(left.unvan).localeCompare(getCanonicalSupplierLabel(right.unvan), 'tr')
  );
}
