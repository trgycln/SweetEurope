export const ADMIN_PANEL_OPTIONS = [
  { key: 'dashboard', label: 'Dashboard', description: 'Genel yönetim ekranı ve özet metrikler' },
  { key: 'personnel', label: 'Personel Yönetimi', description: 'İç kullanıcıları görüntüleme ve yönetme' },
  { key: 'crm', label: 'Firmalar / CRM', description: 'Müşteri ve firma kayıtlarını takip etme' },
  { key: 'subdealers', label: 'Alt Bayiler', description: 'Alt bayi kayıtları ve ilişkileri' },
  { key: 'orders', label: 'Siparişler', description: 'Sipariş yönlendirme ve takip ekranları' },
  { key: 'samples', label: 'Numune Talepleri', description: 'Numune taleplerini inceleme' },
  { key: 'tasks', label: 'Görevler', description: 'Görev görüntüleme, atama ve takip' },
  { key: 'documents', label: 'Belgeler', description: 'Doküman yönetimi ve dosya erişimi' },
  { key: 'products', label: 'Ürünler', description: 'Ürün listesi ve stok/ürün yönetimi' },
  { key: 'pricing', label: 'Fiyatlandırma', description: 'Maliyet ve fiyatlandırma modülleri' },
  { key: 'reviews', label: 'Değerlendirmeler', description: 'Ürün yorumları ve onay süreçleri' },
  { key: 'marketing', label: 'Pazarlama', description: 'Duyuru ve materyal yönetimi' },
  { key: 'finances', label: 'Finans', description: 'Gider ve finans ekranları' },
  { key: 'reporting', label: 'Raporlama', description: 'Raporlama ve kârlılık ekranları' },
  { key: 'settings', label: 'Ayarlar', description: 'Sistem ayarları ve şablonlar' },
] as const;

export type AdminPanelKey = (typeof ADMIN_PANEL_OPTIONS)[number]['key'];
export type InternalUserRole = 'Yönetici' | 'Ekip Üyesi' | 'Personel';
export type AppUserRole = InternalUserRole | 'Müşteri' | 'Alt Bayi' | null | undefined | string;

export const INTERNAL_USER_ROLE_OPTIONS: InternalUserRole[] = ['Personel', 'Ekip Üyesi', 'Yönetici'];

export const INTERNAL_NOTIFICATION_OPTIONS = [
  {
    key: 'task_assignments',
    label: 'Görev görevlendirmeleri',
    description: 'Yeni görev ataması, görev güncellemesi ve durum değişikliği bildirimleri',
  },
  {
    key: 'order_updates',
    label: 'Sipariş operasyonları',
    description: 'İç ekip sipariş, iptal ve operasyon akışı bildirimleri',
  },
  {
    key: 'sample_updates',
    label: 'Numune süreçleri',
    description: 'Numune talebi ve ilgili operasyon bildirimleri',
  },
  {
    key: 'general_announcements',
    label: 'Genel iç duyurular',
    description: 'Ekip içi bilgilendirme ve toplu admin duyuruları',
  },
] as const;

export type InternalNotificationKey = (typeof INTERNAL_NOTIFICATION_OPTIONS)[number]['key'];
export type InternalNotificationPreferences = Record<InternalNotificationKey, boolean>;

const ALL_PANEL_KEYS = ADMIN_PANEL_OPTIONS.map((panel) => panel.key);
const INTERNAL_NOTIFICATION_KEYS = INTERNAL_NOTIFICATION_OPTIONS.map((option) => option.key);

export const DEFAULT_INTERNAL_NOTIFICATION_PREFERENCES: InternalNotificationPreferences = {
  task_assignments: true,
  order_updates: true,
  sample_updates: true,
  general_announcements: true,
};

const DEFAULT_ROLE_PANELS: Record<string, AdminPanelKey[]> = {
  'Yönetici': ALL_PANEL_KEYS,
  'Ekip Üyesi': [
    'dashboard',
    'personnel',
    'crm',
    'subdealers',
    'orders',
    'samples',
    'tasks',
    'documents',
    'pricing',
    'reviews',
    'marketing',
    'finances',
    'reporting',
    'settings',
  ],
  'Personel': ['dashboard', 'crm', 'orders', 'tasks', 'products'],
};

const PANEL_ROUTE_PREFIXES: Record<AdminPanelKey, string[]> = {
  dashboard: ['/admin', '/admin/dashboard'],
  personnel: ['/admin/idari/personel'],
  crm: ['/admin/crm/firmalar'],
  subdealers: ['/admin/crm/alt-bayiler'],
  orders: ['/admin/operasyon/siparisler'],
  samples: ['/admin/operasyon/numune-talepleri'],
  tasks: ['/admin/gorevler'],
  documents: ['/admin/belgeleri-yonet'],
  products: ['/admin/urun-yonetimi/urunler', '/admin/urun-yonetimi/kategoriler'],
  pricing: [
    '/admin/urun-yonetimi/fiyatlandirma-hub',
    '/admin/urun-yonetimi/fiyat-kurallari',
    '/admin/urun-yonetimi/fiyat-istisnalari',
    '/admin/urun-yonetimi/fiyat-matrisi',
  ],
  reviews: ['/admin/urun-yonetimi/degerlendirmeler'],
  marketing: ['/admin/pazarlama'],
  finances: ['/admin/idari/finans'],
  reporting: ['/admin/idari/finans/raporlama'],
  settings: ['/admin/ayarlar'],
};

export function isInternalUserRole(role: AppUserRole): role is InternalUserRole {
  return role === 'Yönetici' || role === 'Ekip Üyesi' || role === 'Personel';
}

export function normalizeAllowedAdminPanels(value: unknown): AdminPanelKey[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const validKeys = new Set<AdminPanelKey>(ALL_PANEL_KEYS);
  const normalized = value.filter((panel): panel is AdminPanelKey => typeof panel === 'string' && validKeys.has(panel as AdminPanelKey));

  if (normalized.length > 0 && !normalized.includes('dashboard')) {
    normalized.unshift('dashboard');
  }

  return Array.from(new Set(normalized));
}

export function normalizeInternalNotificationPreferences(value: unknown): InternalNotificationPreferences {
  const normalized: InternalNotificationPreferences = {
    ...DEFAULT_INTERNAL_NOTIFICATION_PREFERENCES,
  };

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return normalized;
  }

  const record = value as Record<string, unknown>;

  for (const key of INTERNAL_NOTIFICATION_KEYS) {
    if (typeof record[key] === 'boolean') {
      normalized[key] = record[key] as boolean;
    }
  }

  return normalized;
}

export function getDefaultRolePanels(role: AppUserRole): AdminPanelKey[] {
  if (!role) {
    return [];
  }

  return DEFAULT_ROLE_PANELS[role] || [];
}

export function getEffectiveAdminPanels(role: AppUserRole, configuredPanels: unknown): AdminPanelKey[] {
  if (role === 'Yönetici') {
    return ALL_PANEL_KEYS;
  }

  const defaults = getDefaultRolePanels(role);
  const selected = normalizeAllowedAdminPanels(configuredPanels);

  if (selected.length === 0) {
    return defaults;
  }

  return defaults.filter((panel) => selected.includes(panel));
}

export function canAccessAdminPath(role: AppUserRole, pathname: string, configuredPanels: unknown): boolean {
  if (!pathname.startsWith('/admin')) {
    return true;
  }

  if (pathname === '/admin' || pathname.startsWith('/admin/profil')) {
    return role === 'Yönetici' || role === 'Ekip Üyesi' || role === 'Personel';
  }

  if (role === 'Yönetici') {
    return true;
  }

  if (role !== 'Ekip Üyesi' && role !== 'Personel') {
    return false;
  }

  const effectivePanels = getEffectiveAdminPanels(role, configuredPanels);

  return effectivePanels.some((panel) => {
    const prefixes = PANEL_ROUTE_PREFIXES[panel] || [];
    return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  });
}
