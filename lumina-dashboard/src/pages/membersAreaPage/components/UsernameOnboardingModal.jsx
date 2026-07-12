import { useState, useEffect, useCallback } from 'react';
import { useUser } from '../../../contexts/UserContext';
import { XMarkIcon, CheckCircleIcon, ExclamationTriangleIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { useT } from '../../../i18n/LanguageContext.jsx';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/';

/**
 * Modal de onboarding mostrado para usuários que ainda não têm username.
 * Pede username (4-16 chars) e displayName (1-32 chars).
 */
export default function UsernameOnboardingModal({ onClose, onSuccess }) {
  const t = useT();
  const { user, refreshUser } = useUser();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [usernameStatus, setUsernameStatus] = useState(null); // null | 'available' | 'taken' | 'invalid' | 'checking'
  const [usernameMessage, setUsernameMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Pré-preenche displayName com o nome do Discord se disponível
  useEffect(() => {
    if (user) {
      const candidate = user.displayName
        || `${user.firstName || ''} ${user.lastName || ''}`.trim()
        || user.email?.split('@')[0]
        || '';
      setDisplayName(candidate.slice(0, 32));
    }
  }, [user]);

  // Debounce para checar disponibilidade do username
  useEffect(() => {
    if (!username || username.length < 4) {
      setUsernameStatus(null);
      setUsernameMessage('');
      return;
    }
    setUsernameStatus('checking');
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}expapi/v1/user/check-username?username=${encodeURIComponent(username)}`, {
          headers: {},
          credentials: 'include',
        });
        const data = await res.json();
        setUsernameStatus(data.available ? 'available' : (data.reason === 'invalid' ? 'invalid' : 'taken'));
        setUsernameMessage(data.message || '');
      } catch {
        setUsernameStatus(null);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [username]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (usernameStatus !== 'available') {
      setError(t('membersArea.onboarding.usernameAvailable'));
      return;
    }
    if (!displayName.trim()) {
      setError(t('membersArea.onboarding.displayNameRequired'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const csrfRes = await fetch(`${API_BASE}expapi/v1/csrf-token`, { credentials: 'include' });
      const { csrfToken } = await csrfRes.json();

      const res = await fetch(`${API_BASE}expapi/v1/user/identity`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfToken,
            },
            credentials: 'include',
            body: JSON.stringify({ username: username.trim(), displayName: displayName.trim() }),
        })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      await refreshUser();
      onSuccess?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const canSubmit = usernameStatus === 'available' && displayName.trim().length > 0 && !saving;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header com gradiente */}
        <div className="bg-gradient-to-br from-purple-600 to-purple-800 px-6 py-5 rounded-t-2xl relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-white/80 hover:text-white p-1"
            aria-label={t("common.close")}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 text-white">
            <SparklesIcon className="h-6 w-6" />
            <h2 className="text-lg font-bold">{t("membersArea.onboarding.title")}</h2>
          </div>
          <p className="text-sm text-purple-100 mt-1">
            {t("membersArea.onboarding.subtitle")}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Novidade explicativa */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-xs text-purple-800">
            {t("membersArea.onboarding.descFull")}
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              {t('common.username')} <span className="text-purple-600">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">@</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/[^A-Za-z0-9_]/g, '').slice(0, 16))}
                className={`w-full pl-7 pr-10 py-2 text-sm border rounded-md focus:ring-2 focus:outline-none ${
                  usernameStatus === 'available' ? 'border-green-400 focus:ring-green-500' :
                  usernameStatus === 'taken' || usernameStatus === 'invalid' ? 'border-red-400 focus:ring-red-500' :
                  'border-gray-300 focus:ring-purple-500'
                }`}
                placeholder={t('membersArea.onboarding.usernamePlaceholder')}
                minLength={4}
                maxLength={16}
                required
                autoFocus
              />
              {usernameStatus === 'available' && (
                <CheckCircleIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
              )}
              {usernameStatus === 'checking' && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              )}
              {(usernameStatus === 'taken' || usernameStatus === 'invalid') && (
                <ExclamationTriangleIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {t("settings.account.usernameHint")}
            </p>
            {usernameMessage && (
              <p className={`text-xs mt-1 ${usernameStatus === 'available' ? 'text-green-600' : 'text-red-600'}`}>
                {usernameMessage}
              </p>
            )}
          </div>

          {/* DisplayName */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              {t("settings.account.displayName")} <span className="text-purple-600">*</span>
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value.slice(0, 32))}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder={t('membersArea.onboarding.displayNamePlaceholder')}
              maxLength={32}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              {t('membersArea.onboarding.displayNameHint')}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-2 text-xs text-red-700 flex items-start gap-2">
              <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              {t('membersArea.onboarding.later')}
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? t('membersArea.onboarding.saving') : t('membersArea.onboarding.confirm')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
