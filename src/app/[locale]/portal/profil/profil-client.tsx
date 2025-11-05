'use client';

import { useState, useTransition } from 'react';
import { updateUserLanguage, updateUserPassword } from '@/app/actions/profil-actions';
import { toast } from 'sonner';
import { Locale } from '@/lib/utils';

type ProfileData = {
  tam_ad: string;
  email: string;
  telefon: string | null;
  tercih_edilen_dil: string | null;
  rol: string;
};

type Props = {
  profile: ProfileData;
  locale: Locale;
};

const languages = [
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
];

export default function ProfilClient({ profile, locale }: Props) {
  const [isPending, startTransition] = useTransition();
  const [selectedLanguage, setSelectedLanguage] = useState(
    profile.tercih_edilen_dil || 'de'
  );
  
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const t = {
    de: {
      personalInfo: 'Persönliche Informationen',
      name: 'Name',
      email: 'E-Mail',
      phone: 'Telefon',
      role: 'Rolle',
      languagePreference: 'Spracheinstellung',
      languageDesc: 'Wählen Sie Ihre bevorzugte Sprache für Benachrichtigungen und die Benutzeroberfläche',
      save: 'Speichern',
      changePassword: 'Passwort ändern',
      currentPassword: 'Aktuelles Passwort',
      newPassword: 'Neues Passwort',
      confirmPassword: 'Passwort bestätigen',
      updatePassword: 'Passwort aktualisieren',
      languageUpdated: 'Spracheinstellung erfolgreich aktualisiert',
      passwordUpdated: 'Passwort erfolgreich geändert',
      passwordMismatch: 'Passwörter stimmen nicht überein',
      passwordTooShort: 'Passwort muss mindestens 6 Zeichen lang sein',
    },
    tr: {
      personalInfo: 'Kişisel Bilgiler',
      name: 'Ad Soyad',
      email: 'E-posta',
      phone: 'Telefon',
      role: 'Rol',
      languagePreference: 'Dil Tercihi',
      languageDesc: 'Bildirimler ve arayüz için tercih ettiğiniz dili seçin',
      save: 'Kaydet',
      changePassword: 'Şifre Değiştir',
      currentPassword: 'Mevcut Şifre',
      newPassword: 'Yeni Şifre',
      confirmPassword: 'Şifre Tekrar',
      updatePassword: 'Şifreyi Güncelle',
      languageUpdated: 'Dil tercihi başarıyla güncellendi',
      passwordUpdated: 'Şifre başarıyla değiştirildi',
      passwordMismatch: 'Şifreler eşleşmiyor',
      passwordTooShort: 'Şifre en az 6 karakter olmalıdır',
    },
    en: {
      personalInfo: 'Personal Information',
      name: 'Name',
      email: 'Email',
      phone: 'Phone',
      role: 'Role',
      languagePreference: 'Language Preference',
      languageDesc: 'Choose your preferred language for notifications and interface',
      save: 'Save',
      changePassword: 'Change Password',
      currentPassword: 'Current Password',
      newPassword: 'New Password',
      confirmPassword: 'Confirm Password',
      updatePassword: 'Update Password',
      languageUpdated: 'Language preference updated successfully',
      passwordUpdated: 'Password changed successfully',
      passwordMismatch: 'Passwords do not match',
      passwordTooShort: 'Password must be at least 6 characters',
    },
    ar: {
      personalInfo: 'المعلومات الشخصية',
      name: 'الاسم',
      email: 'البريد الإلكتروني',
      phone: 'الهاتف',
      role: 'الدور',
      languagePreference: 'تفضيل اللغة',
      languageDesc: 'اختر لغتك المفضلة للإشعارات والواجهة',
      save: 'حفظ',
      changePassword: 'تغيير كلمة المرور',
      currentPassword: 'كلمة المرور الحالية',
      newPassword: 'كلمة المرور الجديدة',
      confirmPassword: 'تأكيد كلمة المرور',
      updatePassword: 'تحديث كلمة المرور',
      languageUpdated: 'تم تحديث تفضيل اللغة بنجاح',
      passwordUpdated: 'تم تغيير كلمة المرور بنجاح',
      passwordMismatch: 'كلمات المرور غير متطابقة',
      passwordTooShort: 'يجب أن تكون كلمة المرور 6 أحرف على الأقل',
    },
  }[locale];

  const handleLanguageUpdate = () => {
    startTransition(async () => {
      const result = await updateUserLanguage(selectedLanguage as 'de' | 'tr' | 'en' | 'ar');
      if (result.success) {
        toast.success(t.languageUpdated);
        // Sayfayı seçilen dilde yeniden yükle
        window.location.href = `/${selectedLanguage}/portal/profil`;
      } else {
        toast.error(result.error);
      }
    });
  };

  const handlePasswordUpdate = () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error(t.passwordMismatch);
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error(t.passwordTooShort);
      return;
    }

    startTransition(async () => {
      const result = await updateUserPassword(
        passwordForm.currentPassword,
        passwordForm.newPassword
      );
      
      if (result.success) {
        toast.success(t.passwordUpdated);
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="max-w-4xl space-y-8">
      {/* Kişisel Bilgiler */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">{t.personalInfo}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.name}
            </label>
            <input
              type="text"
              value={profile.tam_ad || '-'}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.email}
            </label>
            <input
              type="email"
              value={profile.email}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.phone}
            </label>
            <input
              type="text"
              value={profile.telefon || '-'}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.role}
            </label>
            <input
              type="text"
              value={profile.rol}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
            />
          </div>
        </div>
      </div>

      {/* Dil Tercihi */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-2">{t.languagePreference}</h2>
        <p className="text-sm text-gray-600 mb-4">{t.languageDesc}</p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {languages.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => setSelectedLanguage(lang.code)}
              className={`p-4 border-2 rounded-lg transition-all ${
                selectedLanguage === lang.code
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-3xl mb-2">{lang.flag}</div>
              <div className="text-sm font-medium">{lang.name}</div>
            </button>
          ))}
        </div>
        
        <button
          onClick={handleLanguageUpdate}
          disabled={isPending || selectedLanguage === profile.tercih_edilen_dil}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {t.save}
        </button>
      </div>

      {/* Şifre Değiştir */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">{t.changePassword}</h2>
        
        <div className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.currentPassword}
            </label>
            <input
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) =>
                setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.newPassword}
            </label>
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) =>
                setPasswordForm({ ...passwordForm, newPassword: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.confirmPassword}
            </label>
            <input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) =>
                setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <button
            onClick={handlePasswordUpdate}
            disabled={
              isPending ||
              !passwordForm.currentPassword ||
              !passwordForm.newPassword ||
              !passwordForm.confirmPassword
            }
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {t.updatePassword}
          </button>
        </div>
      </div>
    </div>
  );
}
