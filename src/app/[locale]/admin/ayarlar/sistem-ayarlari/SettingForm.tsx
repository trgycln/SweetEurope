'use client';

import { useState } from 'react';
import { updateSystemSettingAction } from '@/app/actions/system-settings-actions';

type Setting = {
  id: string;
  setting_key: string;
  setting_value: string;
  setting_type: string;
  description?: string;
};

type SettingFormProps = {
  setting: Setting;
  label: string;
  locale: string;
};

export default function SettingForm({ setting, label, locale }: SettingFormProps) {
  const [value, setValue] = useState(setting.setting_value);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;

    setIsLoading(true);
    setMessage(null);

    try {
      const result = await updateSystemSettingAction(setting.setting_key, value, locale);
      
      if (result.success) {
        setMessage({ type: 'success', text: result.message || 'Başarıyla güncellendi' });
        // Clear message after 3 seconds
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: result.error || 'Güncelleme başarısız' });
        setTimeout(() => setMessage(null), 5000);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Beklenmeyen bir hata oluştu' });
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border p-4">
      <form onSubmit={handleSubmit} className="flex items-center gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
          <input
            type={setting.setting_type === 'number' ? 'number' : 'text'}
            step={setting.setting_type === 'number' ? '0.01' : undefined}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            required
          />
          {setting.description && (
            <p className="text-xs text-gray-500 mt-1">{setting.description}</p>
          )}
        </div>
        <button 
          type="submit"
          disabled={isLoading || value === setting.setting_value}
          className="px-4 py-2 bg-primary text-secondary rounded-md hover:bg-black/80 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Güncelleniyor...' : 'Güncelle'}
        </button>
      </form>
      
      {/* Toast Notification */}
      {message && (
        <div 
          className={`mt-3 p-3 rounded-md text-sm ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            )}
            {message.text}
          </div>
        </div>
      )}
    </div>
  );
}