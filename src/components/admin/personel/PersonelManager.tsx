'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiBell, FiBriefcase, FiClipboard, FiEdit2, FiMail, FiSave, FiShield, FiTrash2, FiUserPlus, FiXCircle } from 'react-icons/fi';
import { toast } from 'sonner';

import { DEFAULT_INTERNAL_NOTIFICATION_PREFERENCES, INTERNAL_NOTIFICATION_OPTIONS } from '@/lib/admin/panel-access';

type UserRole = 'Yönetici' | 'Ekip Üyesi' | 'Personel' | 'Müşteri' | 'Alt Bayi' | string;

type ManagedUser = {
  id: string;
  tam_ad: string | null;
  rol: UserRole;
  email: string | null;
  firma_id: string | null;
  firma_unvan: string | null;
  tercih_edilen_dil: string | null;
  gorev_sayisi: number;
  acik_gorev_sayisi: number;
  gorevler: string[];
  allowed_admin_panels: string[];
  notification_preferences: Record<string, boolean>;
};

type PanelOption = {
  key: string;
  label: string;
  description: string;
};

type FirmaOption = {
  id: string;
  unvan: string;
  ticari_tip: string | null;
  kategori: string | null;
  sahip_id: string | null;
};

interface PersonelManagerProps {
  initialUsers: ManagedUser[];
  panelOptions: PanelOption[];
  firmaOptions: FirmaOption[];
  locale: string;
  canManage: boolean;
  currentUserId: string;
}

const INTERNAL_ROLES = ['Yönetici', 'Ekip Üyesi', 'Personel'];
const CREATE_ROLE_OPTIONS = ['Personel', 'Ekip Üyesi', 'Yönetici'];
const MANAGED_ROLE_OPTIONS = ['Personel', 'Ekip Üyesi', 'Yönetici'];
const PORTAL_ROLE_OPTIONS = ['Müşteri', 'Alt Bayi'];

type NotificationPreferenceKey = keyof typeof DEFAULT_INTERNAL_NOTIFICATION_PREFERENCES;

function getDefaultNotificationPreferences() {
  return { ...DEFAULT_INTERNAL_NOTIFICATION_PREFERENCES };
}

const ROLE_BADGE_CLASSES: Record<string, string> = {
  'Yönetici': 'bg-red-100 text-red-700',
  'Ekip Üyesi': 'bg-blue-100 text-blue-700',
  'Personel': 'bg-amber-100 text-amber-700',
  'Müşteri': 'bg-green-100 text-green-700',
  'Alt Bayi': 'bg-purple-100 text-purple-700',
  'Tanımsız': 'bg-slate-100 text-slate-700',
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Beklenmeyen bir hata oluştu.';
}

function getFirmaRoleType(firma: FirmaOption): 'Müşteri' | 'Alt Bayi' {
  const normalized = `${firma.ticari_tip || ''} ${firma.kategori || ''}`.toLowerCase();
  return normalized.includes('alt') && normalized.includes('bayi') ? 'Alt Bayi' : 'Müşteri';
}

function getFirmsForRole(role: string, firmalar: FirmaOption[]) {
  return firmalar.filter((firma) => getFirmaRoleType(firma) === role);
}

export default function PersonelManager({
  initialUsers,
  panelOptions,
  firmaOptions,
  locale,
  canManage,
  currentUserId,
}: PersonelManagerProps) {
  const router = useRouter();
  const [users, setUsers] = useState<ManagedUser[]>(initialUsers);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingUserIds, setEditingUserIds] = useState<string[]>([]);
  const [pendingApprovalIds, setPendingApprovalIds] = useState<string[]>(
    initialUsers.filter((user) => user.rol === 'Tanımsız').map((user) => user.id)
  );
  const [newUser, setNewUser] = useState({
    tamAd: '',
    email: '',
    password: '',
    rol: 'Personel',
    allowedPanels: ['dashboard', 'orders', 'tasks'],
    notificationPreferences: getDefaultNotificationPreferences(),
    sendInviteEmail: true,
  });
  const [newPortalUser, setNewPortalUser] = useState({
    tamAd: '',
    email: '',
    password: '',
    rol: 'Müşteri',
    firmaId: '',
    sendInviteEmail: true,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'Tümü' | 'Yönetici' | 'Ekip Üyesi' | 'Personel' | 'Müşteri' | 'Alt Bayi' | 'Tanımsız'>('Tümü');

  const initialUserMap = useMemo(
    () => new Map(initialUsers.map((user) => [user.id, user] as const)),
    [initialUsers]
  );

  useEffect(() => {
    setUsers(initialUsers);
    setEditingUserIds([]);
    setPendingApprovalIds(initialUsers.filter((user) => user.rol === 'Tanımsız').map((user) => user.id));
  }, [initialUsers]);

  const isEditingUser = (userId: string) => pendingApprovalIds.includes(userId) || editingUserIds.includes(userId);

  const matchesFilters = useCallback((user: ManagedUser) => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase('tr');
    const haystack = [user.tam_ad, user.email, user.firma_unvan, user.rol].filter(Boolean).join(' ').toLocaleLowerCase('tr');
    const searchMatches = normalizedSearch.length === 0 || haystack.includes(normalizedSearch);
    const roleMatches = roleFilter === 'Tümü' || user.rol === roleFilter;
    return searchMatches && roleMatches;
  }, [roleFilter, searchTerm]);

  const internalUsers = useMemo(
    () => users.filter((user) => INTERNAL_ROLES.includes(user.rol) && !pendingApprovalIds.includes(user.id) && matchesFilters(user)),
    [matchesFilters, pendingApprovalIds, users]
  );

  const pendingUsers = useMemo(
    () => users.filter((user) => pendingApprovalIds.includes(user.id) && matchesFilters(user)),
    [matchesFilters, pendingApprovalIds, users]
  );

  const partnerUsers = useMemo(
    () => users.filter((user) => !INTERNAL_ROLES.includes(user.rol) && user.rol !== 'Tanımsız' && !pendingApprovalIds.includes(user.id) && matchesFilters(user)),
    [matchesFilters, pendingApprovalIds, users]
  );

  const summary = useMemo(() => {
    const countByRole = (role: string) =>
      users.filter((user) => user.rol === role && !pendingApprovalIds.includes(user.id)).length;
    return {
      yonetici: countByRole('Yönetici'),
      ekip: countByRole('Ekip Üyesi'),
      personel: countByRole('Personel'),
      musteri: countByRole('Müşteri'),
      altBayi: countByRole('Alt Bayi'),
    };
  }, [pendingApprovalIds, users]);

  const firmUserCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const user of partnerUsers) {
      if (!user.firma_id) continue;
      counts.set(user.firma_id, (counts.get(user.firma_id) || 0) + 1);
    }
    return counts;
  }, [partnerUsers]);

  const portalFirmOptions = useMemo(
    () => getFirmsForRole(newPortalUser.rol, firmaOptions),
    [newPortalUser.rol, firmaOptions]
  );

  const updateUserState = (userId: string, patch: Partial<ManagedUser>) => {
    setUsers((currentUsers) =>
      currentUsers.map((user) => (user.id === userId ? { ...user, ...patch } : user))
    );
  };

  const startEditingUser = (userId: string) => {
    setEditingUserIds((current) => (current.includes(userId) ? current : [...current, userId]));
  };

  const cancelEditingUser = (userId: string) => {
    const originalUser = initialUserMap.get(userId);
    if (originalUser) {
      setUsers((currentUsers) =>
        currentUsers.map((user) => (user.id === userId ? { ...originalUser } : user))
      );
    }
    setEditingUserIds((current) => current.filter((id) => id !== userId));
  };

  const toggleExistingPanel = (userId: string, panelKey: string) => {
    if (panelKey === 'dashboard') {
      return;
    }

    setUsers((currentUsers) =>
      currentUsers.map((user) => {
        if (user.id !== userId) return user;

        const nextPanels = user.allowed_admin_panels.includes(panelKey)
          ? user.allowed_admin_panels.filter((key) => key !== panelKey)
          : [...user.allowed_admin_panels, panelKey];

        return {
          ...user,
          allowed_admin_panels: Array.from(new Set(['dashboard', ...nextPanels])),
        };
      })
    );
  };

  const toggleNewPanel = (panelKey: string) => {
    if (panelKey === 'dashboard') {
      return;
    }

    setNewUser((current) => {
      const nextPanels = current.allowedPanels.includes(panelKey)
        ? current.allowedPanels.filter((key) => key !== panelKey)
        : [...current.allowedPanels, panelKey];

      return {
        ...current,
        allowedPanels: Array.from(new Set(['dashboard', ...nextPanels])),
      };
    });
  };

  const toggleExistingNotificationPreference = (userId: string, preferenceKey: NotificationPreferenceKey) => {
    setUsers((currentUsers) =>
      currentUsers.map((user) => {
        if (user.id !== userId) {
          return user;
        }

        return {
          ...user,
          notification_preferences: {
            ...getDefaultNotificationPreferences(),
            ...user.notification_preferences,
            [preferenceKey]: !user.notification_preferences?.[preferenceKey],
          },
        };
      })
    );
  };

  const toggleNewNotificationPreference = (preferenceKey: NotificationPreferenceKey) => {
    setNewUser((current) => ({
      ...current,
      notificationPreferences: {
        ...getDefaultNotificationPreferences(),
        ...current.notificationPreferences,
        [preferenceKey]: !current.notificationPreferences[preferenceKey],
      },
    }));
  };

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canManage) return;

    setLoadingKey('create');
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/admin/create-personel-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newUser.email,
          password: newUser.password || undefined,
          tam_ad: newUser.tamAd || null,
          rol: newUser.rol,
          allowedPanels: newUser.allowedPanels,
          notificationPreferences: newUser.notificationPreferences,
          sendInviteEmail: newUser.sendInviteEmail,
          locale,
        }),
      });

      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        const message = data?.error || 'Kullanıcı oluşturulamadı.';
        setError(message);
        toast.error(message);
        return;
      }

      const message = newUser.sendInviteEmail ? 'Yeni iç kullanıcı oluşturuldu ve davet maili gönderildi.' : 'Yeni iç kullanıcı oluşturuldu.';
      setSuccess(message);
      toast.success(message);
      setNewUser({
        tamAd: '',
        email: '',
        password: '',
        rol: 'Personel',
        allowedPanels: ['dashboard', 'orders', 'tasks'],
        notificationPreferences: getDefaultNotificationPreferences(),
        sendInviteEmail: true,
      });
      router.refresh();
    } catch (createError) {
      setError(getErrorMessage(createError));
    } finally {
      setLoadingKey(null);
    }
  };

  const handlePortalCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canManage) return;

    if (!newPortalUser.firmaId) {
      setError('Lütfen mevcut firma listesinden bir kayıt seçin.');
      return;
    }

    setLoadingKey('create-portal');
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/admin/create-personel-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newPortalUser.email,
          password: newPortalUser.password || undefined,
          tam_ad: newPortalUser.tamAd || null,
          rol: newPortalUser.rol,
          firma_id: newPortalUser.firmaId,
          sendInviteEmail: newPortalUser.sendInviteEmail,
          locale,
        }),
      });

      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        const message = data?.error || 'Portal kullanıcısı oluşturulamadı.';
        setError(message);
        toast.error(message);
        return;
      }

      const message = newPortalUser.sendInviteEmail ? 'Portal kullanıcısı oluşturuldu, firmaya bağlandı ve davet e-postası gönderildi.' : 'Portal kullanıcısı oluşturuldu ve firma kaydına bağlandı.';
      setSuccess(message);
      toast.success(message);
      setNewPortalUser({
        tamAd: '',
        email: '',
        password: '',
        rol: 'Müşteri',
        firmaId: '',
        sendInviteEmail: true,
      });
      router.refresh();
    } catch (createError) {
      setError(getErrorMessage(createError));
    } finally {
      setLoadingKey(null);
    }
  };

  const handleSaveUser = async (user: ManagedUser) => {
    if (!canManage) {
      return;
    }

    const isInternalUser = INTERNAL_ROLES.includes(user.rol);
    const isPortalUser = user.rol === 'Müşteri' || user.rol === 'Alt Bayi';

    if (user.rol === 'Tanımsız') {
      const message = 'Lütfen kaydetmeden önce kullanıcı için bir rol seçin.';
      setError(message);
      toast.error(message);
      return;
    }

    if (isPortalUser && !user.firma_id) {
      const message = 'Portal kullanıcıları mevcut bir firmaya bağlanmalıdır.';
      setError(message);
      toast.error(message);
      return;
    }

    setLoadingKey(user.id);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/admin/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          tam_ad: user.tam_ad || null,
          rol: user.rol,
          firma_id: isInternalUser ? null : isPortalUser ? user.firma_id : null,
          allowedPanels: isInternalUser ? user.allowed_admin_panels : [],
          notificationPreferences: isInternalUser ? user.notification_preferences : null,
        }),
      });

      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        const message = data?.error || 'Güncelleme yapılamadı.';
        setError(message);
        toast.error(message);
        return;
      }

      const message = `${user.tam_ad || user.email || 'Kullanıcı'} güncellendi.`;
      setSuccess(message);
      toast.success(message);
      setPendingApprovalIds((current) => (user.rol === 'Tanımsız' ? current : current.filter((id) => id !== user.id)));
      setEditingUserIds((current) => current.filter((id) => id !== user.id));
      router.refresh();
    } catch (saveError) {
      const message = getErrorMessage(saveError);
      setError(message);
      toast.error(message);
    } finally {
      setLoadingKey(null);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!canManage) return;

    const user = users.find((item) => item.id === userId);
    const label = user?.tam_ad || user?.email || 'Bu kullanıcı';
    const warnings: string[] = [];

    if ((user?.gorev_sayisi || 0) > 0) {
      warnings.push(`• ${user?.acik_gorev_sayisi || 0}/${user?.gorev_sayisi || 0} açık görev bağlantısı var.`);
    }

    if (user?.firma_unvan) {
      warnings.push(`• Bağlı firma: ${user.firma_unvan}`);
    }

    const confirmMessage = [
      `${label} kullanıcısını silmek istediğinizden emin misiniz?`,
      warnings.length > 0 ? '' : null,
      warnings.length > 0 ? 'Silmeden önce dikkat edin:' : null,
      ...warnings,
      '',
      'Bu işlem geri alınamaz.',
    ]
      .filter(Boolean)
      .join('\n');

    if (!window.confirm(confirmMessage)) return;

    setLoadingKey(`delete-${userId}`);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIdToDelete: userId }),
      });

      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        const message = data?.error || 'Silme işlemi başarısız oldu.';
        setError(message);
        toast.error(message);
        return;
      }

      setSuccess('Kullanıcı silindi.');
      toast.success('Kullanıcı silindi.');
      router.refresh();
    } catch (deleteError) {
      const message = getErrorMessage(deleteError);
      setError(message);
      toast.error(message);
    } finally {
      setLoadingKey(null);
    }
  };

  const handleSendPasswordReset = async (email: string | null, label: string) => {
    if (!canManage || !email) return;

    setLoadingKey(`reset-${email}`);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/admin/send-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, locale }),
      });

      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        const message = data?.error || 'Şifre kurulum e-postası gönderilemedi.';
        setError(message);
        toast.error(message);
        return;
      }

      const message = `${label} için şifre kurulum / sıfırlama e-postası gönderildi.`;
      setSuccess(message);
      toast.success(message);
    } catch (resetError) {
      const message = getErrorMessage(resetError);
      setError(message);
      toast.error(message);
    } finally {
      setLoadingKey(null);
    }
  };

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-2 gap-4 xl:grid-cols-5">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="text-2xl font-bold text-red-700">{summary.yonetici}</div>
          <div className="text-sm text-red-800">Yönetici</div>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="text-2xl font-bold text-blue-700">{summary.ekip}</div>
          <div className="text-sm text-blue-800">Ekip Üyesi</div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="text-2xl font-bold text-amber-700">{summary.personel}</div>
          <div className="text-sm text-amber-800">Personel</div>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <div className="text-2xl font-bold text-green-700">{summary.musteri}</div>
          <div className="text-sm text-green-800">Müşteri Kullanıcısı</div>
        </div>
        <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
          <div className="text-2xl font-bold text-purple-700">{summary.altBayi}</div>
          <div className="text-sm text-purple-800">Alt Bayi Kullanıcısı</div>
        </div>
      </section>

      {!canManage && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          Bu ekranı görüntüleyebilirsiniz; kullanıcı oluşturma ve yetki düzenleme sadece yönetici hesabı ile yapılabilir.
        </div>
      )}

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-primary">Kullanıcı Arama ve Filtre</h2>
            <p className="text-sm text-gray-600">İsim, e-posta, firma veya role göre hızlıca filtreleyin.</p>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="İsim, e-posta veya firma ara..."
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value as typeof roleFilter)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              {['Tümü', 'Yönetici', 'Ekip Üyesi', 'Personel', 'Müşteri', 'Alt Bayi', 'Tanımsız'].map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <FiUserPlus className="text-accent" />
          <h2 className="text-lg font-semibold text-primary">Yeni İç Kullanıcı Oluştur</h2>
        </div>
        <p className="mb-4 text-sm text-gray-600">
          Buradan yeni personel veya ekip üyesi açabilir, hangi admin panellerini görebileceğini ve iç görevlendirme bildirimlerini daha en baştan belirleyebilirsiniz.
        </p>

        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <input
              type="text"
              placeholder="Ad Soyad"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={newUser.tamAd}
              onChange={(event) => setNewUser((current) => ({ ...current, tamAd: event.target.value }))}
              disabled={!canManage}
            />
            <input
              type="email"
              placeholder="E-posta"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={newUser.email}
              onChange={(event) => setNewUser((current) => ({ ...current, email: event.target.value }))}
              required
              disabled={!canManage}
            />
            <input
              type="password"
              placeholder={newUser.sendInviteEmail ? 'İsteğe bağlı geçici şifre' : 'Geçici şifre'}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={newUser.password}
              onChange={(event) => setNewUser((current) => ({ ...current, password: event.target.value }))}
              required={!newUser.sendInviteEmail}
              disabled={!canManage}
            />
            <select
              value={newUser.rol}
              onChange={(event) => setNewUser((current) => ({ ...current, rol: event.target.value }))}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              disabled={!canManage}
            >
              {CREATE_ROLE_OPTIONS.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={newUser.sendInviteEmail}
              onChange={(event) => setNewUser((current) => ({ ...current, sendInviteEmail: event.target.checked }))}
              className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent"
              disabled={!canManage}
            />
            Davet e-postası gönder ve şifreyi kullanıcının belirlemesine izin ver
          </label>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
              <FiShield className="text-accent" />
              Görebileceği admin panelleri
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {panelOptions.map((panel) => {
                const checked = newUser.allowedPanels.includes(panel.key);
                const disabled = !canManage || panel.key === 'dashboard';

                return (
                  <label key={panel.key} className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-3 text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleNewPanel(panel.key)}
                      disabled={disabled}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent"
                    />
                    <span>
                      <span className="block font-semibold text-gray-800">{panel.label}</span>
                      <span className="block text-xs text-gray-500">{panel.description}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
              <FiBell className="text-accent" />
              İç görevlendirme bildirimleri
            </div>
            <p className="mb-3 text-xs text-gray-500">
              Bu tercihler sadece iç ekip için geçerlidir; müşteri ve alt bayi hesaplarına uygulanmaz.
            </p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {INTERNAL_NOTIFICATION_OPTIONS.map((option) => (
                <label key={option.key} className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-3 text-sm">
                  <input
                    type="checkbox"
                    checked={Boolean(newUser.notificationPreferences[option.key])}
                    onChange={() => toggleNewNotificationPreference(option.key)}
                    disabled={!canManage}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent"
                  />
                  <span>
                    <span className="block font-semibold text-gray-800">{option.label}</span>
                    <span className="block text-xs text-gray-500">{option.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={!canManage || loadingKey === 'create'}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FiUserPlus />
            {loadingKey === 'create'
              ? 'Oluşturuluyor...'
              : newUser.sendInviteEmail
                ? 'Kullanıcı Oluştur ve Davet Gönder'
                : 'Kullanıcı Oluştur'}
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <FiUserPlus className="text-accent" />
          <h2 className="text-lg font-semibold text-primary">Mevcut Firmaya Portal Girişi Bağla</h2>
        </div>
        <p className="mb-4 text-sm text-gray-600">
          Müşteri ve alt bayi kullanıcılarını mevcut firma listenizden seçerek oluşturabilirsiniz. Böylece portal hesabı doğrudan mevcut firma kaydına bağlanır.
        </p>

        <form onSubmit={handlePortalCreate} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <input
              type="text"
              placeholder="Ad Soyad"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={newPortalUser.tamAd}
              onChange={(event) => setNewPortalUser((current) => ({ ...current, tamAd: event.target.value }))}
              disabled={!canManage}
            />
            <input
              type="email"
              placeholder="Portal e-postası"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={newPortalUser.email}
              onChange={(event) => setNewPortalUser((current) => ({ ...current, email: event.target.value }))}
              required
              disabled={!canManage}
            />
            <input
              type="password"
              placeholder={newPortalUser.sendInviteEmail ? 'İsteğe bağlı geçici şifre' : 'Geçici şifre'}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={newPortalUser.password}
              onChange={(event) => setNewPortalUser((current) => ({ ...current, password: event.target.value }))}
              required={!newPortalUser.sendInviteEmail}
              disabled={!canManage}
            />
            <select
              value={newPortalUser.rol}
              onChange={(event) => setNewPortalUser((current) => ({ ...current, rol: event.target.value, firmaId: '' }))}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              disabled={!canManage}
            >
              {PORTAL_ROLE_OPTIONS.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={newPortalUser.sendInviteEmail}
              onChange={(event) => setNewPortalUser((current) => ({ ...current, sendInviteEmail: event.target.checked }))}
              className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent"
              disabled={!canManage}
            />
            Seçilen firma kullanıcısına davet e-postası gönder ve şifre kurulumunu kullanıcıya bırak
          </label>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <label className="mb-2 block text-sm font-semibold text-gray-700">Bağlanacak firma kaydı</label>
            <select
              value={newPortalUser.firmaId}
              onChange={(event) => setNewPortalUser((current) => ({ ...current, firmaId: event.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              disabled={!canManage || portalFirmOptions.length === 0}
              required
            >
              <option value="">-- Mevcut firma seçin --</option>
              {portalFirmOptions.map((firma) => {
                const linkedCount = firmUserCounts.get(firma.id) || 0;
                const roleType = getFirmaRoleType(firma);
                return (
                  <option key={firma.id} value={firma.id}>
                    {firma.unvan} · {roleType}
                    {linkedCount > 0 ? ` · ${linkedCount} kullanıcı bağlı` : ''}
                  </option>
                );
              })}
            </select>
            {portalFirmOptions.length === 0 && (
              <p className="mt-2 text-xs text-amber-700">
                Seçtiğiniz role uygun firma bulunamadı. Önce CRM listesinde ilgili firma kaydını oluşturun veya tipini düzeltin.
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={!canManage || loadingKey === 'create-portal' || portalFirmOptions.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FiUserPlus />
            {loadingKey === 'create-portal'
              ? 'Portal hesabı oluşturuluyor...'
              : newPortalUser.sendInviteEmail
                ? 'Portal Kullanıcısı Oluştur ve Davet Gönder'
                : 'Portal Kullanıcısı Oluştur'}
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-primary">İç Ekip Kullanıcıları</h2>
          <p className="text-sm text-gray-600">
            Personelinizin rolünü, görev yükünü, erişebileceği panelleri ve iç görevlendirme bildirimlerini buradan yönetebilirsiniz.
          </p>
        </div>

        <div className="space-y-4">
          {internalUsers.length === 0 && <div className="text-sm text-gray-500">Filtreye uygun iç ekip kullanıcısı bulunmuyor.</div>}

          {internalUsers.map((user) => {
            const roleBadgeClass = ROLE_BADGE_CLASSES[user.rol] || 'bg-gray-100 text-gray-700';
            const isCurrentUser = user.id === currentUserId;
            const isAdminUser = user.rol === 'Yönetici';
            const isEditing = isEditingUser(user.id);

            return (
              <div key={user.id} className="rounded-xl border border-gray-200 p-4">
                <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-primary">{user.tam_ad || user.email || 'İsimsiz kullanıcı'}</h3>
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${roleBadgeClass}`}>
                        {user.rol}
                      </span>
                      {isCurrentUser && (
                        <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                          Siz
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                      <span className="inline-flex items-center gap-1.5">
                        <FiMail size={14} /> {user.email || 'E-posta bulunamadı'}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <FiBriefcase size={14} /> {user.firma_unvan || 'Bağlı firma yok'}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <FiClipboard size={14} /> {user.acik_gorev_sayisi}/{user.gorev_sayisi} açık görev
                      </span>
                    </div>
                    {(user.gorev_sayisi > 0 || user.firma_unvan) && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        {user.gorev_sayisi > 0 && <div>Bu kullanıcıya bağlı görevler bulunuyor.</div>}
                        {user.firma_unvan && <div>Firma bağlantısı: {user.firma_unvan}</div>}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {user.gorevler.length > 0 ? (
                        user.gorevler.map((gorev) => (
                          <span key={`${user.id}-${gorev}`} className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700">
                            {gorev}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-500">Atanmış görev bulunmuyor.</span>
                      )}
                    </div>
                    <Link
                      href={`/${locale}/admin/gorevler?atanan=${user.id}`}
                      className="inline-flex text-sm font-medium text-accent hover:underline"
                    >
                      Görevlerini filtreli görüntüle
                    </Link>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Ad Soyad</label>
                    <input
                      value={user.tam_ad || ''}
                      onChange={(event) => updateUserState(user.id, { tam_ad: event.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      disabled={!canManage || !isEditing}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Rol</label>
                    <select
                      value={user.rol}
                      onChange={(event) => updateUserState(user.id, { rol: event.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      disabled={!canManage || !isEditing || isCurrentUser}
                    >
                      {MANAGED_ROLE_OPTIONS.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Tercih edilen dil</label>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                      {user.tercih_edilen_dil || 'Belirlenmedi'}
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <FiShield className="text-accent" />
                    Panel erişimleri
                  </div>

                  {isAdminUser ? (
                    <div className="text-sm text-gray-600">Yönetici kullanıcılar tüm panellere tam erişimle çalışır.</div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {panelOptions.map((panel) => {
                        const checked = user.allowed_admin_panels.includes(panel.key);
                        const disabled = !canManage || !isEditing || panel.key === 'dashboard';

                        return (
                          <label key={`${user.id}-${panel.key}`} className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-3 text-sm">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleExistingPanel(user.id, panel.key)}
                              disabled={disabled}
                              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent"
                            />
                            <span>
                              <span className="block font-semibold text-gray-800">{panel.label}</span>
                              <span className="block text-xs text-gray-500">{panel.description}</span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <FiBell className="text-accent" />
                    İç görevlendirme bildirimleri
                  </div>
                  <p className="mb-3 text-xs text-gray-500">
                    Bu ayarlar sadece iç personel için kullanılır; müşteri ve alt bayi hesaplarında uygulanmaz.
                  </p>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {INTERNAL_NOTIFICATION_OPTIONS.map((option) => (
                      <label key={`${user.id}-${option.key}`} className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-3 text-sm">
                        <input
                          type="checkbox"
                          checked={Boolean(user.notification_preferences?.[option.key])}
                          onChange={() => toggleExistingNotificationPreference(user.id, option.key)}
                          disabled={!canManage || !isEditing}
                          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent"
                        />
                        <span>
                          <span className="block font-semibold text-gray-800">{option.label}</span>
                          <span className="block text-xs text-gray-500">{option.description}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {canManage && !isEditing && (
                    <button
                      type="button"
                      onClick={() => startEditingUser(user.id)}
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      <FiEdit2 />
                      Düzenle
                    </button>
                  )}

                  {canManage && isEditing && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleSaveUser(user)}
                        disabled={loadingKey === user.id}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <FiSave />
                        {loadingKey === user.id ? 'Kaydediliyor...' : 'Kaydet'}
                      </button>

                      <button
                        type="button"
                        onClick={() => cancelEditingUser(user.id)}
                        disabled={loadingKey === user.id}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700"
                      >
                        <FiXCircle />
                        Vazgeç
                      </button>
                    </>
                  )}

                  {user.email && (
                    <button
                      type="button"
                      onClick={() => handleSendPasswordReset(user.email, user.tam_ad || user.email || 'Kullanıcı')}
                      disabled={!canManage || loadingKey === `reset-${user.email}`}
                      className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <FiMail />
                      {loadingKey === `reset-${user.email}` ? 'Gönderiliyor...' : 'Şifre Maili Gönder'}
                    </button>
                  )}

                  {!isCurrentUser && !isAdminUser && (
                    <button
                      type="button"
                      onClick={() => handleDelete(user.id)}
                      disabled={!canManage || loadingKey === `delete-${user.id}`}
                      className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <FiTrash2 />
                      Sil
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-amber-900">Onay Bekleyen Kullanıcılar</h2>
          <p className="text-sm text-amber-800">
            Veritabanında bulunan ama henüz rol veya firma ataması tamamlanmamış kullanıcılar burada görünür. İsterseniz bu kayıtlara iç ekip rolü ya da portal rolü verip kaydedebilirsiniz.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-amber-200 text-sm">
            <thead className="bg-amber-100/70">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-amber-900">Kullanıcı</th>
                <th className="px-4 py-3 text-left font-semibold text-amber-900">Rol Ataması</th>
                <th className="px-4 py-3 text-left font-semibold text-amber-900">Firma</th>
                <th className="px-4 py-3 text-left font-semibold text-amber-900">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-200 bg-white">
              {pendingUsers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                    Filtreye uygun onay bekleyen kullanıcı bulunmuyor.
                  </td>
                </tr>
              )}

              {pendingUsers.map((user) => {
                const roleBadgeClass = ROLE_BADGE_CLASSES[user.rol] || 'bg-gray-100 text-gray-700';
                const partnerFirmOptions = getFirmsForRole(user.rol, firmaOptions);

                return (
                  <tr key={user.id}>
                    <td className="px-4 py-3 align-top">
                      <div className="space-y-2">
                        <input
                          value={user.tam_ad || ''}
                          onChange={(event) => updateUserState(user.id, { tam_ad: event.target.value })}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                          disabled={!canManage}
                        />
                        <div className="text-xs text-gray-500">{user.email || user.id}</div>
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${roleBadgeClass}`}>
                          {user.rol}
                        </span>
                        {(user.gorev_sayisi > 0 || user.firma_unvan) && (
                          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                            {user.gorev_sayisi > 0 && <div>{user.acik_gorev_sayisi}/{user.gorev_sayisi} açık görev bağlı.</div>}
                            {user.firma_unvan && <div>Firma bağlantısı: {user.firma_unvan}</div>}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <select
                        value={user.rol}
                        onChange={(event) => updateUserState(user.id, { rol: event.target.value, firma_id: null, firma_unvan: null })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        disabled={!canManage}
                      >
                        <option value="Tanımsız">Tanımsız</option>
                        {[...MANAGED_ROLE_OPTIONS, ...PORTAL_ROLE_OPTIONS].map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 align-top text-gray-700">
                      {user.rol === 'Müşteri' || user.rol === 'Alt Bayi' ? (
                        <select
                          value={user.firma_id || ''}
                          onChange={(event) => {
                            const selectedFirma = firmaOptions.find((firma) => firma.id === event.target.value);
                            updateUserState(user.id, {
                              firma_id: event.target.value || null,
                              firma_unvan: selectedFirma?.unvan || null,
                            });
                          }}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                          disabled={!canManage}
                        >
                          <option value="">-- Firma seçin --</option>
                          {partnerFirmOptions.map((firma) => (
                            <option key={firma.id} value={firma.id}>
                              {firma.unvan}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500">
                          İç ekip kullanıcılarında firma bağlantısı gerekmez.
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      {canManage && (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleSaveUser(user)}
                            disabled={loadingKey === user.id}
                            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <FiSave />
                            {loadingKey === user.id ? 'Kaydediliyor...' : 'Kullanıcıyı Onayla'}
                          </button>
                          {user.email && (
                            <button
                              type="button"
                              onClick={() => handleSendPasswordReset(user.email, user.tam_ad || user.email || 'Kullanıcı')}
                              disabled={loadingKey === `reset-${user.email}`}
                              className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <FiMail />
                              {loadingKey === `reset-${user.email}` ? 'Gönderiliyor...' : 'Şifre Maili'}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDelete(user.id)}
                            disabled={loadingKey === `delete-${user.id}`}
                            className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <FiTrash2 />
                            {loadingKey === `delete-${user.id}` ? 'Siliniyor...' : 'Sil'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-primary">Partner Portal Kullanıcıları</h2>
          <p className="text-sm text-gray-600">
            Standart müşteri ve alt bayi kullanıcıları burada listelenir. İç görevlendirme bildirim ayarları bu hesaplara uygulanmaz.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Kullanıcı</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Rol</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Firma</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Görevler</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {partnerUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                    Filtreye uygun portal kullanıcısı bulunamadı.
                  </td>
                </tr>
              )}

              {partnerUsers.map((user) => {
                const roleBadgeClass = ROLE_BADGE_CLASSES[user.rol] || 'bg-gray-100 text-gray-700';
                const partnerFirmOptions = getFirmsForRole(user.rol, firmaOptions);
                const roleLabel = user.rol || 'Tanımsız';
                const isEditing = isEditingUser(user.id);

                return (
                  <tr key={user.id}>
                    <td className="px-4 py-3 align-top">
                      {canManage ? (
                        <div className="space-y-2">
                          <input
                            value={user.tam_ad || ''}
                            onChange={(event) => updateUserState(user.id, { tam_ad: event.target.value })}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                            disabled={!isEditing}
                          />
                          <div className="text-xs text-gray-500">{user.email || user.id}</div>
                        </div>
                      ) : (
                        <>
                          <div className="font-medium text-gray-900">{user.tam_ad || user.email || 'İsimsiz kullanıcı'}</div>
                          <div className="text-xs text-gray-500">{user.email || user.id}</div>
                        </>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      {canManage ? (
                        <select
                          value={user.rol}
                          onChange={(event) => updateUserState(user.id, { rol: event.target.value, firma_id: null })}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                          disabled={!isEditing}
                        >
                          <option value="Tanımsız">Tanımsız</option>
                          {[...PORTAL_ROLE_OPTIONS, ...MANAGED_ROLE_OPTIONS].map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${roleBadgeClass}`}>
                          {roleLabel}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top text-gray-700">
                      {canManage ? (
                        <div className="space-y-2">
                          <select
                            value={user.firma_id || ''}
                            onChange={(event) => {
                              const selectedFirma = firmaOptions.find((firma) => firma.id === event.target.value);
                              updateUserState(user.id, {
                                firma_id: event.target.value || null,
                                firma_unvan: selectedFirma?.unvan || null,
                              });
                            }}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                            disabled={!isEditing || (user.rol !== 'Müşteri' && user.rol !== 'Alt Bayi')}
                          >
                            <option value="">-- Firma seçin --</option>
                            {partnerFirmOptions.map((firma) => {
                              const linkedCount = firmUserCounts.get(firma.id) || 0;
                              return (
                                <option key={firma.id} value={firma.id}>
                                  {firma.unvan}{linkedCount > 0 ? ` · ${linkedCount} kullanıcı` : ''}
                                </option>
                              );
                            })}
                          </select>
                          {user.firma_id && (
                            <Link href={`/${locale}/admin/crm/firmalar/${user.firma_id}`} className="inline-flex text-xs text-accent hover:underline">
                              Firma kaydını aç
                            </Link>
                          )}
                        </div>
                      ) : (
                        user.firma_unvan || 'Bağlı firma yok'
                      )}
                    </td>
                    <td className="px-4 py-3 align-top text-gray-700">
                      <Link href={`/${locale}/admin/gorevler?atanan=${user.id}`} className="text-accent hover:underline">
                        {user.acik_gorev_sayisi}/{user.gorev_sayisi} açık görev
                      </Link>
                    </td>
                    <td className="px-4 py-3 align-top">
                      {canManage && (
                        <div className="flex flex-wrap gap-2">
                          {!isEditing && (
                            <button
                              type="button"
                              onClick={() => startEditingUser(user.id)}
                              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                            >
                              <FiEdit2 />
                              Düzenle
                            </button>
                          )}

                          {isEditing && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleSaveUser(user)}
                                disabled={loadingKey === user.id}
                                className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <FiSave />
                                {loadingKey === user.id ? 'Kaydediliyor...' : 'Kaydet'}
                              </button>
                              <button
                                type="button"
                                onClick={() => cancelEditingUser(user.id)}
                                disabled={loadingKey === user.id}
                                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700"
                              >
                                <FiXCircle />
                                Vazgeç
                              </button>
                            </>
                          )}
                          {user.email && (
                            <button
                              type="button"
                              onClick={() => handleSendPasswordReset(user.email, user.tam_ad || user.email || 'Kullanıcı')}
                              disabled={loadingKey === `reset-${user.email}`}
                              className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <FiMail />
                              {loadingKey === `reset-${user.email}` ? 'Gönderiliyor...' : 'Şifre Maili'}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDelete(user.id)}
                            disabled={loadingKey === `delete-${user.id}`}
                            className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <FiTrash2 />
                            Sil
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>}
    </div>
  );
}
