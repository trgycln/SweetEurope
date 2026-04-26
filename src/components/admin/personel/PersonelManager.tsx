'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    FiBell, FiBriefcase, FiChevronDown, FiClipboard, FiEdit2, FiMail,
    FiSave, FiShield, FiTrash2, FiUserPlus, FiX, FiRefreshCw, FiSearch,
    FiLock, FiCheck, FiAlertTriangle, FiUser,
} from 'react-icons/fi';
import { toast } from 'sonner';
import { DEFAULT_INTERNAL_NOTIFICATION_PREFERENCES, INTERNAL_NOTIFICATION_OPTIONS } from '@/lib/admin/panel-access';

// ── Types ─────────────────────────────────────────────────────────────────────

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

type PanelOption  = { key: string; label: string; description: string };
type FirmaOption  = { id: string; unvan: string; ticari_tip: string | null; kategori: string | null; sahip_id: string | null };
type NotifKey     = keyof typeof DEFAULT_INTERNAL_NOTIFICATION_PREFERENCES;

interface PersonelManagerProps {
    initialUsers: ManagedUser[];
    panelOptions: PanelOption[];
    firmaOptions: FirmaOption[];
    locale: string;
    canManage: boolean;
    currentUserId: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const INTERNAL_ROLES = ['Yönetici', 'Personel'];
const CREATE_ROLE_OPTIONS = ['Personel', 'Yönetici'];
const PORTAL_ROLE_OPTIONS = ['Müşteri', 'Alt Bayi'];

const ROLE_STYLES: Record<string, { badge: string; dot: string }> = {
    'Yönetici':  { badge: 'bg-red-100 text-red-700 border-red-200',     dot: 'bg-red-500' },
    'Personel':  { badge: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
    'Ekip Üyesi':{ badge: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-400' },
    'Müşteri':   { badge: 'bg-green-100 text-green-700 border-green-200', dot: 'bg-green-500' },
    'Alt Bayi':  { badge: 'bg-purple-100 text-purple-700 border-purple-200', dot: 'bg-purple-500' },
    'Tanımsız':  { badge: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
};

function initials(name: string | null, email: string | null) {
    const text = name || email || '?';
    return text.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function getDefaultNotifPrefs() { return { ...DEFAULT_INTERNAL_NOTIFICATION_PREFERENCES }; }
function getErrMsg(e: unknown): string { return e instanceof Error ? e.message : 'Beklenmeyen bir hata oluştu.'; }
function getFirmaRoleType(f: FirmaOption): 'Müşteri' | 'Alt Bayi' {
    const s = `${f.ticari_tip || ''} ${f.kategori || ''}`.toLowerCase();
    return s.includes('alt') && s.includes('bayi') ? 'Alt Bayi' : 'Müşteri';
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Avatar({ name, email, size = 'md' }: { name: string | null; email: string | null; size?: 'sm' | 'md' | 'lg' }) {
    const sz = size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-14 h-14 text-lg' : 'w-10 h-10 text-sm';
    return (
        <div className={`${sz} rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center flex-shrink-0 select-none`}>
            {initials(name, email)}
        </div>
    );
}

function RoleBadge({ rol }: { rol: string }) {
    const s = ROLE_STYLES[rol] ?? ROLE_STYLES['Tanımsız'];
    return (
        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${s.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{rol}
        </span>
    );
}

function StatMini({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
    return (
        <div className="text-center">
            <p className={`text-xl font-bold ${warn && value > 0 ? 'text-red-600' : 'text-slate-800'}`}>{value}</p>
            <p className="text-[11px] text-slate-500">{label}</p>
        </div>
    );
}

// ── Kullanıcı Kartı ───────────────────────────────────────────────────────────

function UserCard({
    user, isEditing, panelOptions, firmaOptions, loadingKey, canManage, locale, isCurrentUser,
    onEdit, onCancelEdit, onSave, onDelete, onPasswordReset, onUpdateUser, onTogglePanel, onToggleNotif,
}: {
    user: ManagedUser;
    isEditing: boolean;
    panelOptions: PanelOption[];
    firmaOptions: FirmaOption[];
    loadingKey: string | null;
    canManage: boolean;
    locale: string;
    isCurrentUser: boolean;
    onEdit: () => void;
    onCancelEdit: () => void;
    onSave: (u: ManagedUser) => void;
    onDelete: (id: string) => void;
    onPasswordReset: (email: string | null, label: string) => void;
    onUpdateUser: (id: string, patch: Partial<ManagedUser>) => void;
    onTogglePanel: (id: string, key: string) => void;
    onToggleNotif: (id: string, key: NotifKey) => void;
}) {
    const isInternal = INTERNAL_ROLES.includes(user.rol) || user.rol === 'Tanımsız';
    const saving  = loadingKey === user.id;
    const deleting = loadingKey === `delete-${user.id}`;
    const resetting = loadingKey === `reset-${user.email}`;
    const label = user.tam_ad || user.email || 'Kullanıcı';
    const isPending = user.rol === 'Tanımsız';

    return (
        <div className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all ${isPending ? 'border-amber-200 ring-1 ring-amber-100' : 'border-slate-200'}`}>
            {isPending && (
                <div className="flex items-center gap-2 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-800 border-b border-amber-200">
                    <FiAlertTriangle size={12} /> Bekleyen kayıt — rol atanmadı
                </div>
            )}

            {/* Kart başlığı */}
            <div className="flex items-start gap-3 p-4">
                <Avatar name={user.tam_ad} email={user.email} />
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                        <p className="text-sm font-semibold text-slate-800 truncate">{label}</p>
                        <RoleBadge rol={user.rol} />
                        {isCurrentUser && (
                            <span className="text-[10px] font-semibold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full border border-blue-200">Sen</span>
                        )}
                    </div>
                    {user.email && <p className="text-[12px] text-slate-400 flex items-center gap-1"><FiMail size={10} />{user.email}</p>}
                    {user.firma_unvan && <p className="text-[12px] text-slate-400 flex items-center gap-1 mt-0.5"><FiBriefcase size={10} />{user.firma_unvan}</p>}
                </div>

                {/* Sağ meta */}
                {isInternal && (
                    <div className="flex gap-3 flex-shrink-0 text-center pr-1">
                        <div>
                            <p className={`text-sm font-bold ${user.acik_gorev_sayisi > 0 ? 'text-amber-600' : 'text-slate-700'}`}>{user.acik_gorev_sayisi}<span className="text-slate-400">/{user.gorev_sayisi}</span></p>
                            <p className="text-[10px] text-slate-400">görev</p>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-700">{user.allowed_admin_panels.length}</p>
                            <p className="text-[10px] text-slate-400">panel</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Görevler önizleme */}
            {isInternal && user.gorevler.length > 0 && !isEditing && (
                <div className="px-4 pb-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Açık Görevler</p>
                    <div className="flex flex-wrap gap-1">
                        {user.gorevler.slice(0, 3).map((g, i) => (
                            <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full truncate max-w-[150px]">{g}</span>
                        ))}
                    </div>
                </div>
            )}

            {/* Action butonları */}
            {!isEditing && (
                <div className="flex items-center gap-1.5 px-4 py-3 border-t border-slate-100 bg-slate-50/50">
                    {canManage && (
                        <button onClick={onEdit}
                            className="flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:border-slate-300 px-2.5 py-1.5 rounded-lg transition-colors min-h-[32px]">
                            <FiEdit2 size={12} /> Düzenle
                        </button>
                    )}
                    {canManage && user.email && (
                        <button onClick={() => onPasswordReset(user.email, label)} disabled={resetting}
                            className="flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-blue-700 bg-white border border-slate-200 hover:border-blue-300 px-2.5 py-1.5 rounded-lg transition-colors min-h-[32px] disabled:opacity-50">
                            {resetting ? <FiRefreshCw size={12} className="animate-spin" /> : <FiLock size={12} />}
                            Şifre Linki
                        </button>
                    )}
                    {canManage && !isCurrentUser && (
                        <button onClick={() => onDelete(user.id)} disabled={deleting}
                            className="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-700 bg-white border border-red-200 hover:border-red-300 px-2.5 py-1.5 rounded-lg transition-colors min-h-[32px] disabled:opacity-50 ml-auto">
                            {deleting ? <FiRefreshCw size={12} className="animate-spin" /> : <FiTrash2 size={12} />}
                            Sil
                        </button>
                    )}
                </div>
            )}

            {/* Düzenleme paneli */}
            {isEditing && (
                <div className="border-t border-slate-200 p-4 bg-slate-50/50 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1 block">Ad Soyad</label>
                            <input type="text" value={user.tam_ad ?? ''} onChange={e => onUpdateUser(user.id, { tam_ad: e.target.value })}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-slate-300 focus:outline-none" />
                        </div>
                        <div>
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1 block">Rol</label>
                            <select value={user.rol} onChange={e => onUpdateUser(user.id, { rol: e.target.value })}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-slate-300 focus:outline-none">
                                {[...INTERNAL_ROLES, ...PORTAL_ROLE_OPTIONS, 'Tanımsız'].map(r => (
                                    <option key={r} value={r}>{r}</option>
                                ))}
                            </select>
                        </div>
                        {(user.rol === 'Müşteri' || user.rol === 'Alt Bayi') && (
                            <div className="sm:col-span-2">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1 block">Bağlı Firma</label>
                                <select value={user.firma_id ?? ''} onChange={e => onUpdateUser(user.id, { firma_id: e.target.value || null })}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-slate-300 focus:outline-none">
                                    <option value="">— Firma seçin —</option>
                                    {firmaOptions.map(f => <option key={f.id} value={f.id}>{f.unvan}</option>)}
                                </select>
                            </div>
                        )}
                    </div>

                    {INTERNAL_ROLES.includes(user.rol) && (
                        <>
                            <div>
                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                    <FiShield size={11} /> Panel Erişimleri
                                </p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {panelOptions.map(p => {
                                        const checked = user.allowed_admin_panels.includes(p.key);
                                        const locked = p.key === 'dashboard';
                                        return (
                                            <label key={p.key} className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer text-xs transition-colors ${checked ? 'border-slate-400 bg-slate-50' : 'border-slate-200 bg-white'} ${locked ? 'opacity-60 cursor-default' : 'hover:border-slate-300'}`}>
                                                <input type="checkbox" checked={checked} disabled={locked} onChange={() => onTogglePanel(user.id, p.key)}
                                                    className="h-3.5 w-3.5 rounded border-slate-300 text-slate-700 flex-shrink-0" />
                                                <span className="font-medium text-slate-700 truncate">{p.label}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            <div>
                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                    <FiBell size={11} /> Bildirimler
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {INTERNAL_NOTIFICATION_OPTIONS.map(opt => {
                                        const checked = Boolean(user.notification_preferences?.[opt.key]);
                                        return (
                                            <label key={opt.key} className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 bg-white cursor-pointer text-xs hover:border-slate-300">
                                                <input type="checkbox" checked={checked} onChange={() => onToggleNotif(user.id, opt.key as NotifKey)}
                                                    className="h-3.5 w-3.5 rounded border-slate-300 text-slate-700 flex-shrink-0" />
                                                <span className="text-slate-700">{opt.label}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        </>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                        <button onClick={() => onSave(user)} disabled={saving}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700 disabled:opacity-50 transition-colors min-h-[40px]">
                            {saving ? <FiRefreshCw size={14} className="animate-spin" /> : <FiSave size={14} />} Kaydet
                        </button>
                        <button onClick={onCancelEdit}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 text-slate-600 text-sm font-medium hover:bg-slate-100 transition-colors min-h-[40px]">
                            <FiX size={14} /> İptal
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Yeni İç Kullanıcı Formu ───────────────────────────────────────────────────

function CreateInternalForm({ panelOptions, locale, canManage, loading, onSubmit }: {
    panelOptions: PanelOption[];
    locale: string;
    canManage: boolean;
    loading: boolean;
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}) {
    const [form, setForm] = useState({
        tamAd: '', email: '', password: '', rol: 'Personel',
        allowedPanels: ['dashboard', 'orders', 'tasks'],
        notificationPreferences: getDefaultNotifPrefs(),
        sendInviteEmail: false,
    });

    // expose form state to parent via hidden inputs doesn't work — we pass the form ref
    // Actually, we'll use a different approach: the form is controlled and we pass it up via onSubmit

    const togglePanel = (key: string) => {
        if (key === 'dashboard') return;
        setForm(p => {
            const next = p.allowedPanels.includes(key) ? p.allowedPanels.filter(k => k !== key) : [...p.allowedPanels, key];
            return { ...p, allowedPanels: Array.from(new Set(['dashboard', ...next])) };
        });
    };

    const toggleNotif = (key: NotifKey) => {
        setForm(p => ({ ...p, notificationPreferences: { ...getDefaultNotifPrefs(), ...p.notificationPreferences, [key]: !p.notificationPreferences[key] } }));
    };

    return (
        <form onSubmit={onSubmit} className="space-y-5">
            {/* Hidden fields to pass form state */}
            <input type="hidden" name="_tamAd" value={form.tamAd} />
            <input type="hidden" name="_email" value={form.email} />
            <input type="hidden" name="_password" value={form.password} />
            <input type="hidden" name="_rol" value={form.rol} />
            <input type="hidden" name="_allowedPanels" value={form.allowedPanels.join(',')} />
            <input type="hidden" name="_notifPrefs" value={JSON.stringify(form.notificationPreferences)} />
            <input type="hidden" name="_sendInvite" value={String(form.sendInviteEmail)} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1 block">Ad Soyad</label>
                    <input type="text" placeholder="Tam adı girin" value={form.tamAd} onChange={e => setForm(p => ({ ...p, tamAd: e.target.value }))} disabled={!canManage}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-slate-300 focus:outline-none" />
                </div>
                <div>
                    <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1 block">E-posta *</label>
                    <input type="email" placeholder="ornek@sirket.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required disabled={!canManage}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-slate-300 focus:outline-none" />
                </div>
                <div>
                    <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1 block">
                        Geçici Şifre {form.sendInviteEmail ? '(isteğe bağlı)' : '*'}
                    </label>
                    <input type="password" placeholder={form.sendInviteEmail ? 'Boş bırakabilirsiniz' : 'Geçici şifre'} value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required={!form.sendInviteEmail} disabled={!canManage}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-slate-300 focus:outline-none" />
                </div>
                <div>
                    <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1 block">Rol</label>
                    <select value={form.rol} onChange={e => setForm(p => ({ ...p, rol: e.target.value }))} disabled={!canManage}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-slate-300 focus:outline-none">
                        {CREATE_ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                </div>
            </div>

            <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors text-sm">
                <input type="checkbox" checked={form.sendInviteEmail} onChange={e => setForm(p => ({ ...p, sendInviteEmail: e.target.checked }))} disabled={!canManage}
                    className="h-4 w-4 rounded border-slate-300" />
                <span className="text-slate-700">Davet e-postası gönder — kullanıcı şifresini kendisi belirlesin</span>
            </label>

            {/* Panel erişimleri */}
            <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-3 flex items-center gap-1.5"><FiShield size={11} /> Panel Erişimleri</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {panelOptions.map(p => {
                        const checked = form.allowedPanels.includes(p.key);
                        const locked = p.key === 'dashboard';
                        return (
                            <label key={p.key} className={`flex items-start gap-2 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${checked ? 'border-slate-400 bg-slate-50' : 'border-slate-200 bg-white hover:border-slate-300'} ${locked ? 'opacity-60 cursor-default' : ''}`}>
                                <input type="checkbox" checked={checked} disabled={locked || !canManage} onChange={() => togglePanel(p.key)}
                                    className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 flex-shrink-0" />
                                <span>
                                    <span className="block font-semibold text-slate-700">{p.label}</span>
                                    <span className="text-slate-400 leading-snug">{p.description}</span>
                                </span>
                            </label>
                        );
                    })}
                </div>
            </div>

            {/* Bildirimler */}
            <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-3 flex items-center gap-1.5"><FiBell size={11} /> Bildirim Tercihleri</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {INTERNAL_NOTIFICATION_OPTIONS.map(opt => (
                        <label key={opt.key} className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 bg-white cursor-pointer text-xs hover:border-slate-300">
                            <input type="checkbox" checked={Boolean(form.notificationPreferences[opt.key])} disabled={!canManage} onChange={() => toggleNotif(opt.key as NotifKey)}
                                className="h-3.5 w-3.5 rounded border-slate-300 flex-shrink-0" />
                            <span className="text-slate-700">{opt.label}</span>
                        </label>
                    ))}
                </div>
            </div>

            <button type="submit" disabled={loading || !canManage}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700 disabled:opacity-50 transition-colors min-h-[44px]">
                {loading ? <FiRefreshCw size={15} className="animate-spin" /> : <FiUserPlus size={15} />}
                İç Kullanıcı Oluştur
            </button>
        </form>
    );
}

// ── Yeni Portal Kullanıcısı Formu ─────────────────────────────────────────────

function CreatePortalForm({ firmaOptions, locale, canManage, loading, onSubmit }: {
    firmaOptions: FirmaOption[];
    locale: string;
    canManage: boolean;
    loading: boolean;
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}) {
    const [form, setForm] = useState({ tamAd: '', email: '', password: '', rol: 'Müşteri', firmaId: '', sendInviteEmail: false });
    const filteredFirmas = firmaOptions.filter(f => getFirmaRoleType(f) === form.rol);

    return (
        <form onSubmit={onSubmit} className="space-y-4">
            <input type="hidden" name="_tamAd" value={form.tamAd} />
            <input type="hidden" name="_email" value={form.email} />
            <input type="hidden" name="_password" value={form.password} />
            <input type="hidden" name="_rol" value={form.rol} />
            <input type="hidden" name="_firmaId" value={form.firmaId} />
            <input type="hidden" name="_sendInvite" value={String(form.sendInviteEmail)} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1 block">Ad Soyad</label>
                    <input type="text" placeholder="Tam adı girin" value={form.tamAd} onChange={e => setForm(p => ({ ...p, tamAd: e.target.value }))} disabled={!canManage}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
                </div>
                <div>
                    <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1 block">E-posta *</label>
                    <input type="email" placeholder="ornek@musteri.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required disabled={!canManage}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
                </div>
                <div>
                    <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1 block">Şifre {form.sendInviteEmail ? '(isteğe bağlı)' : '*'}</label>
                    <input type="password" placeholder={form.sendInviteEmail ? 'Boş bırakabilirsiniz' : 'Geçici şifre'} value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required={!form.sendInviteEmail} disabled={!canManage}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
                </div>
                <div>
                    <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1 block">Kullanıcı Tipi</label>
                    <select value={form.rol} onChange={e => setForm(p => ({ ...p, rol: e.target.value, firmaId: '' }))} disabled={!canManage}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300">
                        {PORTAL_ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                </div>
                <div className="sm:col-span-2">
                    <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1 block">Bağlı Firma *</label>
                    <select value={form.firmaId} onChange={e => setForm(p => ({ ...p, firmaId: e.target.value }))} required disabled={!canManage}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300">
                        <option value="">— Firma seçin —</option>
                        {filteredFirmas.map(f => <option key={f.id} value={f.id}>{f.unvan}</option>)}
                    </select>
                    {filteredFirmas.length === 0 && (
                        <p className="text-xs text-amber-600 mt-1">Bu tipe uygun firma bulunamadı. Önce CRM'de firma oluşturun.</p>
                    )}
                </div>
            </div>

            <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer text-sm">
                <input type="checkbox" checked={form.sendInviteEmail} onChange={e => setForm(p => ({ ...p, sendInviteEmail: e.target.checked }))} disabled={!canManage}
                    className="h-4 w-4 rounded border-slate-300" />
                <span className="text-slate-700">Davet e-postası gönder</span>
            </label>

            <button type="submit" disabled={loading || !canManage}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700 disabled:opacity-50 transition-colors min-h-[44px]">
                {loading ? <FiRefreshCw size={15} className="animate-spin" /> : <FiUserPlus size={15} />}
                Portal Kullanıcısı Oluştur
            </button>
        </form>
    );
}

// ── Ana Bileşen ───────────────────────────────────────────────────────────────

export default function PersonelManager({ initialUsers, panelOptions, firmaOptions, locale, canManage, currentUserId }: PersonelManagerProps) {
    const router = useRouter();
    const [users, setUsers] = useState<ManagedUser[]>(initialUsers);
    const [loadingKey, setLoadingKey] = useState<string | null>(null);
    const [editingIds, setEditingIds] = useState<string[]>([]);
    const [pendingIds, setPendingIds] = useState<string[]>(initialUsers.filter(u => u.rol === 'Tanımsız').map(u => u.id));
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'ic-ekip' | 'portal' | 'yeni-kullanici'>('ic-ekip');
    const [createSubTab, setCreateSubTab] = useState<'ic' | 'portal'>('ic');

    const initialUserMap = useMemo(() => new Map(initialUsers.map(u => [u.id, u])), [initialUsers]);

    useEffect(() => {
        setUsers(initialUsers);
        setEditingIds([]);
        setPendingIds(initialUsers.filter(u => u.rol === 'Tanımsız').map(u => u.id));
    }, [initialUsers]);

    const matchSearch = useCallback((u: ManagedUser) => {
        if (!searchTerm.trim()) return true;
        const q = searchTerm.trim().toLowerCase();
        return [u.tam_ad, u.email, u.firma_unvan, u.rol].filter(Boolean).join(' ').toLowerCase().includes(q);
    }, [searchTerm]);

    const internalUsers = useMemo(() => users.filter(u => INTERNAL_ROLES.includes(u.rol) && !pendingIds.includes(u.id) && matchSearch(u)), [users, pendingIds, matchSearch]);
    const pendingUsers  = useMemo(() => users.filter(u => pendingIds.includes(u.id) && matchSearch(u)), [users, pendingIds, matchSearch]);
    const portalUsers   = useMemo(() => users.filter(u => !INTERNAL_ROLES.includes(u.rol) && u.rol !== 'Tanımsız' && !pendingIds.includes(u.id) && matchSearch(u)), [users, pendingIds, matchSearch]);

    const summary = useMemo(() => ({
        yonetici: users.filter(u => u.rol === 'Yönetici' && !pendingIds.includes(u.id)).length,
        personel: users.filter(u => u.rol === 'Personel' && !pendingIds.includes(u.id)).length,
        musteri:  users.filter(u => u.rol === 'Müşteri' && !pendingIds.includes(u.id)).length,
        altBayi:  users.filter(u => u.rol === 'Alt Bayi' && !pendingIds.includes(u.id)).length,
    }), [users, pendingIds]);

    const updateUser = (id: string, patch: Partial<ManagedUser>) => setUsers(u => u.map(x => x.id === id ? { ...x, ...patch } : x));
    const togglePanel = (id: string, key: string) => { if (key === 'dashboard') return; setUsers(u => u.map(x => x.id !== id ? x : { ...x, allowed_admin_panels: x.allowed_admin_panels.includes(key) ? x.allowed_admin_panels.filter(k => k !== key) : Array.from(new Set(['dashboard', ...x.allowed_admin_panels, key])) })); };
    const toggleNotif = (id: string, key: NotifKey) => setUsers(u => u.map(x => x.id !== id ? x : { ...x, notification_preferences: { ...getDefaultNotifPrefs(), ...x.notification_preferences, [key]: !x.notification_preferences?.[key] } }));
    const startEdit = (id: string) => setEditingIds(p => p.includes(id) ? p : [...p, id]);
    const cancelEdit = (id: string) => { const orig = initialUserMap.get(id); if (orig) setUsers(u => u.map(x => x.id === id ? { ...orig } : x)); setEditingIds(p => p.filter(i => i !== id)); };

    // ── Handlers ──────────────────────────────────────────────────────────────

    // Internal user create — reads from hidden form fields via FormData
    const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!canManage) return;
        const fd = new FormData(e.currentTarget);
        const panels = (fd.get('_allowedPanels') as string)?.split(',').filter(Boolean) ?? [];
        const notifRaw = fd.get('_notifPrefs') as string;
        let notifs = getDefaultNotifPrefs();
        try { notifs = JSON.parse(notifRaw); } catch {}
        setLoadingKey('create');
        try {
            const res = await fetch('/api/admin/create-personel-user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: fd.get('_email'), password: fd.get('_password') || undefined, tam_ad: fd.get('_tamAd') || null, rol: fd.get('_rol'), allowedPanels: panels, notificationPreferences: notifs, sendInviteEmail: fd.get('_sendInvite') === 'true', locale }) });
            const data = await res.json().catch(() => null);
            if (!res.ok) { toast.error(data?.error || 'Kullanıcı oluşturulamadı.'); return; }
            toast.success(data?.message || 'Yeni kullanıcı oluşturuldu.');
            router.refresh();
        } catch (err) { toast.error(getErrMsg(err)); } finally { setLoadingKey(null); }
    };

    const handlePortalCreate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!canManage) return;
        const fd = new FormData(e.currentTarget);
        const firmaId = fd.get('_firmaId') as string;
        if (!firmaId) { toast.error('Lütfen firma seçin.'); return; }
        setLoadingKey('create-portal');
        try {
            const res = await fetch('/api/admin/create-personel-user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: fd.get('_email'), password: fd.get('_password') || undefined, tam_ad: fd.get('_tamAd') || null, rol: fd.get('_rol'), firma_id: firmaId, sendInviteEmail: fd.get('_sendInvite') === 'true', locale }) });
            const data = await res.json().catch(() => null);
            if (!res.ok) { toast.error(data?.error || 'Portal kullanıcısı oluşturulamadı.'); return; }
            toast.success(data?.message || 'Portal kullanıcısı oluşturuldu.');
            router.refresh();
        } catch (err) { toast.error(getErrMsg(err)); } finally { setLoadingKey(null); }
    };

    const handleSaveUser = async (user: ManagedUser) => {
        if (!canManage) return;
        if (user.rol === 'Tanımsız') { toast.error('Lütfen önce rol seçin.'); return; }
        if ((user.rol === 'Müşteri' || user.rol === 'Alt Bayi') && !user.firma_id) { toast.error('Portal kullanıcıları bir firmaya bağlanmalıdır.'); return; }
        setLoadingKey(user.id);
        const isInternal = INTERNAL_ROLES.includes(user.rol);
        try {
            const res = await fetch('/api/admin/update-profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id, tam_ad: user.tam_ad || null, rol: user.rol, firma_id: isInternal ? null : user.firma_id, allowedPanels: isInternal ? user.allowed_admin_panels : [], notificationPreferences: isInternal ? user.notification_preferences : null }) });
            const data = await res.json().catch(() => null);
            if (!res.ok) { toast.error(data?.error || 'Güncelleme yapılamadı.'); return; }
            toast.success(`${user.tam_ad || user.email || 'Kullanıcı'} güncellendi.`);
            setPendingIds(p => user.rol !== 'Tanımsız' ? p.filter(i => i !== user.id) : p);
            setEditingIds(p => p.filter(i => i !== user.id));
            router.refresh();
        } catch (err) { toast.error(getErrMsg(err)); } finally { setLoadingKey(null); }
    };

    const handleDelete = async (userId: string) => {
        if (!canManage) return;
        const u = users.find(x => x.id === userId);
        const label = u?.tam_ad || u?.email || 'Bu kullanıcı';
        const warn = [u?.acik_gorev_sayisi ? `• ${u.acik_gorev_sayisi} açık görevi var` : null, u?.firma_unvan ? `• Bağlı firma: ${u.firma_unvan}` : null, u?.rol === 'Yönetici' ? '• Yönetici yetkisine sahip' : null].filter(Boolean).join('\n');
        if (!window.confirm(`${label} silinsin mi?\n${warn ? '\n' + warn : ''}\n\nBu işlem geri alınamaz.`)) return;
        setLoadingKey(`delete-${userId}`);
        try {
            const res = await fetch('/api/admin/delete-user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userIdToDelete: userId }) });
            const data = await res.json().catch(() => null);
            if (!res.ok) { toast.error(data?.error || 'Silme başarısız.'); return; }
            setUsers(p => p.filter(x => x.id !== userId));
            setPendingIds(p => p.filter(i => i !== userId));
            setEditingIds(p => p.filter(i => i !== userId));
            toast.success('Kullanıcı silindi.');
            router.refresh();
        } catch (err) { toast.error(getErrMsg(err)); } finally { setLoadingKey(null); }
    };

    const handlePasswordReset = async (email: string | null, label: string) => {
        if (!canManage || !email) return;
        setLoadingKey(`reset-${email}`);
        try {
            const res = await fetch('/api/admin/send-password-reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, locale }) });
            const data = await res.json().catch(() => null);
            if (!res.ok) { toast.error(data?.error || 'Şifre maili gönderilemedi.'); return; }
            toast.success(`${label} için şifre kurulum e-postası gönderildi.`);
        } catch (err) { toast.error(getErrMsg(err)); } finally { setLoadingKey(null); }
    };

    // ── Render ────────────────────────────────────────────────────────────────

    const TAB_BTN = 'px-4 py-2 text-sm font-semibold rounded-lg transition-all';
    const activeTab_ = `${TAB_BTN} bg-white shadow-sm text-slate-900`;
    const inactiveTab = `${TAB_BTN} text-slate-500 hover:text-slate-700`;

    return (
        <div className="space-y-6">
            {/* ── Özet sayaçları ─────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: 'Yönetici',   count: summary.yonetici, bg: 'bg-red-50 border-red-200',     text: 'text-red-700' },
                    { label: 'Personel',   count: summary.personel, bg: 'bg-amber-50 border-amber-200',  text: 'text-amber-700' },
                    { label: 'Müşteri',    count: summary.musteri,  bg: 'bg-green-50 border-green-200',  text: 'text-green-700' },
                    { label: 'Alt Bayi',   count: summary.altBayi,  bg: 'bg-purple-50 border-purple-200', text: 'text-purple-700' },
                ].map(s => (
                    <div key={s.label} className={`rounded-xl border p-4 flex items-center justify-between ${s.bg}`}>
                        <div>
                            <p className={`text-2xl font-bold ${s.text}`}>{s.count}</p>
                            <p className={`text-sm font-medium ${s.text} opacity-80`}>{s.label}</p>
                        </div>
                        <FiUser size={20} className={`${s.text} opacity-40`} />
                    </div>
                ))}
            </div>

            {/* Yönetici değil uyarısı */}
            {!canManage && (
                <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                    <FiAlertTriangle size={15} className="flex-shrink-0" />
                    Sadece görüntüleme — kullanıcı oluşturma ve yetki düzenleme yönetici hesabı gerektirir.
                </div>
            )}

            {/* Bekleyen kayıtlar */}
            {pendingUsers.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-sm font-semibold text-amber-900 mb-3 flex items-center gap-2">
                        <FiAlertTriangle size={14} /> {pendingUsers.length} bekleyen kayıt — rol atanmamış
                    </p>
                    <div className="space-y-2">
                        {pendingUsers.map(u => (
                            <UserCard key={u.id} user={u} isEditing={editingIds.includes(u.id)} panelOptions={panelOptions} firmaOptions={firmaOptions}
                                loadingKey={loadingKey} canManage={canManage} locale={locale} isCurrentUser={u.id === currentUserId}
                                onEdit={() => startEdit(u.id)} onCancelEdit={() => cancelEdit(u.id)} onSave={handleSaveUser} onDelete={handleDelete}
                                onPasswordReset={handlePasswordReset} onUpdateUser={updateUser} onTogglePanel={togglePanel} onToggleNotif={toggleNotif} />
                        ))}
                    </div>
                </div>
            )}

            {/* ── Toolbar: Arama + Sekmeler ──────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* Arama */}
                <div className="relative flex-1 max-w-sm">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                    <input type="search" placeholder="İsim, e-posta veya firma ara…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300" />
                </div>

                {/* Sekmeler */}
                <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
                    <button type="button" onClick={() => setActiveTab('ic-ekip')} className={activeTab === 'ic-ekip' ? activeTab_ : inactiveTab}>
                        İç Ekip <span className="ml-1 text-[11px] font-normal opacity-70">({internalUsers.length})</span>
                    </button>
                    <button type="button" onClick={() => setActiveTab('portal')} className={activeTab === 'portal' ? activeTab_ : inactiveTab}>
                        Portal <span className="ml-1 text-[11px] font-normal opacity-70">({portalUsers.length})</span>
                    </button>
                    {canManage && (
                        <button type="button" onClick={() => setActiveTab('yeni-kullanici')} className={`${activeTab === 'yeni-kullanici' ? activeTab_ : inactiveTab} flex items-center gap-1`}>
                            <FiUserPlus size={13} /> Yeni
                        </button>
                    )}
                </div>
            </div>

            {/* ── İç Ekip Sekmesi ───────────────────────────────────────────── */}
            {activeTab === 'ic-ekip' && (
                <div>
                    {internalUsers.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                            <FiUser size={32} className="mx-auto text-slate-300 mb-2" />
                            <p className="text-slate-500 text-sm">{searchTerm ? 'Aramaya uyan iç ekip üyesi bulunamadı.' : 'Henüz iç ekip üyesi yok.'}</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {internalUsers.map(u => (
                                <UserCard key={u.id} user={u} isEditing={editingIds.includes(u.id)} panelOptions={panelOptions} firmaOptions={firmaOptions}
                                    loadingKey={loadingKey} canManage={canManage} locale={locale} isCurrentUser={u.id === currentUserId}
                                    onEdit={() => startEdit(u.id)} onCancelEdit={() => cancelEdit(u.id)} onSave={handleSaveUser} onDelete={handleDelete}
                                    onPasswordReset={handlePasswordReset} onUpdateUser={updateUser} onTogglePanel={togglePanel} onToggleNotif={toggleNotif} />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── Portal Kullanıcıları Sekmesi ───────────────────────────────── */}
            {activeTab === 'portal' && (
                <div>
                    {portalUsers.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                            <FiBriefcase size={32} className="mx-auto text-slate-300 mb-2" />
                            <p className="text-slate-500 text-sm">{searchTerm ? 'Aramaya uyan portal kullanıcısı bulunamadı.' : 'Henüz portal kullanıcısı yok.'}</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {portalUsers.map(u => (
                                <UserCard key={u.id} user={u} isEditing={editingIds.includes(u.id)} panelOptions={panelOptions} firmaOptions={firmaOptions}
                                    loadingKey={loadingKey} canManage={canManage} locale={locale} isCurrentUser={u.id === currentUserId}
                                    onEdit={() => startEdit(u.id)} onCancelEdit={() => cancelEdit(u.id)} onSave={handleSaveUser} onDelete={handleDelete}
                                    onPasswordReset={handlePasswordReset} onUpdateUser={updateUser} onTogglePanel={togglePanel} onToggleNotif={toggleNotif} />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── Yeni Kullanıcı Sekmesi ─────────────────────────────────────── */}
            {activeTab === 'yeni-kullanici' && canManage && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                    {/* Alt sekmeler: İç / Portal */}
                    <div className="flex gap-2 mb-6">
                        {[
                            { key: 'ic' as const,     label: 'İç Ekip Kullanıcısı',   icon: <FiShield size={14} /> },
                            { key: 'portal' as const, label: 'Portal Kullanıcısı',     icon: <FiBriefcase size={14} /> },
                        ].map(t => (
                            <button key={t.key} type="button" onClick={() => setCreateSubTab(t.key)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${createSubTab === t.key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                                {t.icon} {t.label}
                            </button>
                        ))}
                    </div>

                    {createSubTab === 'ic' && (
                        <CreateInternalForm panelOptions={panelOptions} locale={locale} canManage={canManage} loading={loadingKey === 'create'} onSubmit={handleCreate} />
                    )}
                    {createSubTab === 'portal' && (
                        <CreatePortalForm firmaOptions={firmaOptions} locale={locale} canManage={canManage} loading={loadingKey === 'create-portal'} onSubmit={handlePortalCreate} />
                    )}
                </div>
            )}
        </div>
    );
}
