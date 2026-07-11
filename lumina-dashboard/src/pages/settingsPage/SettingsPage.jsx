import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  BellIcon, ShieldCheckIcon, GlobeAltIcon, KeyIcon,
  EyeIcon, EyeSlashIcon, ArrowPathIcon, ExclamationTriangleIcon,
  CheckIcon, ClipboardDocumentIcon, LinkIcon, NoSymbolIcon,
  UserIcon, ShieldCheckIcon as ShieldIcon, IdentificationIcon,
  TrashIcon, XMarkIcon,
} from '@heroicons/react/24/outline';
import { useUser } from '../../contexts/UserContext';
import { useT, useI18n } from '../../i18n/LanguageContext.jsx';
import { translateApiError } from '../../i18n/apiErrors.js';
import AppShell from '../../components/AppShell';
import SetPasswordModal from '../dashboardPage/components/SetPasswordModal';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

const TABS = [
  { id: 'profile',       labelKey: 'settings.tabs.profile',       icon: UserIcon },
  { id: 'identity',      labelKey: 'settings.tabs.identity',      icon: IdentificationIcon },
  { id: 'notifications', labelKey: 'settings.tabs.notifications', icon: BellIcon },
  { id: 'privacy',       labelKey: 'settings.tabs.privacy',       icon: ShieldCheckIcon },
  { id: 'regional',      labelKey: 'settings.tabs.regional',      icon: GlobeAltIcon },
  { id: 'security',      labelKey: 'settings.tabs.security',      icon: KeyIcon },
  { id: 'discord',       labelKey: 'settings.tabs.discord',       icon: LinkIcon },
  { id: 'danger',        labelKey: 'settings.tabs.account',       icon: TrashIcon },
];

function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-10 w-full bg-gray-100 rounded-lg animate-pulse" />
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4 animate-pulse">
        <div className="h-5 w-32 bg-gray-200 rounded" />
        <div className="h-10 w-full bg-gray-100 rounded" />
        <div className="h-10 w-full bg-gray-100 rounded" />
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const t = useT();
  const { setLocale } = useI18n();
  const { user, refreshUser, loading, error: userError, isAdmin } = useUser();
  const [activeTab, setActiveTab] = useState('profile');
  const [settings, setSettings] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  const [showAccountId, setShowAccountId] = useState(false);
  const [copiedAccountId, setCopiedAccountId] = useState(false);
  const [showSetPassword, setShowSetPassword] = useState(false);
  const [discordLinking, setDiscordLinking] = useState(false);
  const [discordUnlinking, setDiscordUnlinking] = useState(false);

  // Identity
  const [identityForm, setIdentityForm] = useState({ username: '', displayName: '' });
  const [usernameStatus, setUsernameStatus] = useState(null);
  const [savingIdentity, setSavingIdentity] = useState(false);

  // Account closure
  const [closureConfirmOpen, setClosureConfirmOpen] = useState(false);
  const [closureConfirmText, setClosureConfirmText] = useState('');
  const [closureLoading, setClosureLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setSettings({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      emailNotifications: user.emailNotifications ?? true,
      discordNotifications: user.discordNotifications ?? true,
      botActivityAlerts: user.botActivityAlerts ?? false,
      publicProfile: user.publicProfile ?? false,
      showOnlineStatus: user.showOnlineStatus ?? true,
      language: user.language || 'pt-BR',
      timezone: user.timezone || 'America/Sao_Paulo',
    });
    setIdentityForm({
      username: user.username || '',
      displayName: user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
    });
    const params = new URLSearchParams(window.location.search);
    if (!user.hasPassword || params.get('setupPassword') === '1') {
      setShowSetPassword(true);
      if (params.get('setupPassword') === '1') {
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [user]);

  const handleSettingChange = (key, value) => setSettings(prev => ({ ...prev, [key]: value }));

  // Language change is special: save immediately to API + update UI instantly.
  // Other settings (name, notifications, etc.) require clicking "Save".
  const handleLanguageChange = async (newLang) => {
    handleSettingChange('language', newLang);
    // Instant preview — UI switches language before the API call completes
    setLocale(newLang);
    try {
      const csrfRes = await fetch(`${API_BASE}expapi/v1/csrf-token`, { credentials: 'include' });
      const { csrfToken } = await csrfRes.json();
      const res = await fetch(`${API_BASE}expapi/v1/user/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
        credentials: 'include',
        body: JSON.stringify({ language: newLang }),
      });
      if (res.ok) {
        setSaveMsg({ type: 'success', text: t('common.saveSuccess') });
        await refreshUser();
      } else {
        const err = await res.json().catch(() => ({}));
        setSaveMsg({ type: 'error', text: err?.code ? translateApiError(err, t) : (err?.error || t('common.saveError')) });
        // Revert locale on failure
        setLocale(user?.language || 'pt-BR');
        handleSettingChange('language', user?.language || 'pt-BR');
      }
    } catch {
      setSaveMsg({ type: 'error', text: t('apiError.generic') });
      setLocale(user?.language || 'pt-BR');
      handleSettingChange('language', user?.language || 'pt-BR');
    } finally {
      setTimeout(() => setSaveMsg(null), 4000);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const csrfRes = await fetch(`${API_BASE}expapi/v1/csrf-token`, { credentials: 'include' });
      const { csrfToken } = await csrfRes.json();
      const res = await fetch(`${API_BASE}expapi/v1/user/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setSaveMsg({ type: 'success', text: t('common.saveSuccess') });
        await refreshUser();
      } else {
        const err = await res.json().catch(() => ({}));
        setSaveMsg({ type: 'error', text: err?.code ? translateApiError(err, t) : (err?.error || t('common.saveError')) });
      }
    } catch {
      setSaveMsg({ type: 'error', text: t('apiError.generic') });
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 4000);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setSaveMsg({ type: 'error', text: t('settings.security.passwordsDontMatch') });
      return;
    }
    if (passwordData.newPassword.length < 8) {
      setSaveMsg({ type: 'error', text: t('settings.security.passwordTooShort') });
      return;
    }
    try {
      const csrfRes = await fetch(`${API_BASE}expapi/v1/csrf-token`, { credentials: 'include' });
      const { csrfToken } = await csrfRes.json();
      const res = await fetch(`${API_BASE}expapi/v1/user/set-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });
      if (res.ok) {
        setSaveMsg({ type: 'success', text: t('settings.security.passwordChanged') });
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        const err = await res.json().catch(() => ({}));
        setSaveMsg({ type: 'error', text: err.error || t('settings.security.passwordChangeError') });
      }
    } catch {
      setSaveMsg({ type: 'error', text: t('common.connectionError') });
    }
  };

  // ─── Identity (username + displayName) ────────────────────────────────────
  // Username availability check (debounced)
  useEffect(() => {
    if (!identityForm.username || identityForm.username.length < 4 || identityForm.username === user?.username) {
      setUsernameStatus(null);
      return;
    }
    setUsernameStatus('checking');
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}expapi/v1/user/check-username?username=${encodeURIComponent(identityForm.username)}`, {
          headers: {},
          credentials: 'include',
        });
        const data = await res.json();
        setUsernameStatus(data.available ? 'available' : (data.reason === 'invalid' ? 'invalid' : 'taken'));
      } catch {
        setUsernameStatus(null);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [identityForm.username, user?.username]);

  const handleSaveIdentity = async () => {
    setSavingIdentity(true);
    setSaveMsg(null);
    try {
      const csrfRes = await fetch(`${API_BASE}expapi/v1/csrf-token`, { credentials: 'include' });
      const { csrfToken } = await csrfRes.json();
      const body = {};
      if (identityForm.username !== user.username) body.username = identityForm.username;
      if (identityForm.displayName !== (user.displayName || '')) body.displayName = identityForm.displayName;

      if (Object.keys(body).length === 0) {
        setSaveMsg({ type: 'info', text: t('settings.identity.noChanges') });
        return;
      }

      const res = await fetch(`${API_BASE}expapi/v1/user/identity`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setSaveMsg({ type: 'success', text: t('settings.identity.identityUpdated') });
        await refreshUser();
      } else {
        const err = await res.json().catch(() => ({}));
        setSaveMsg({ type: 'error', text: err.error || `HTTP ${res.status}` });
      }
    } catch {
      setSaveMsg({ type: 'error', text: t('common.connectionError') });
    } finally {
      setSavingIdentity(false);
      setTimeout(() => setSaveMsg(null), 4000);
    }
  };

  // ─── Discord link/unlink ──────────────────────────────────────────────────
  const handleLinkDiscord = () => {
    setDiscordLinking(true);
    const origin = window.location.origin;
    // O linkToken agora é lido do cookie httpOnly pelo backend (authStart.js já suporta)
    // então não precisamos passar token na URL.
    const params = new URLSearchParams({ origin, intent: 'link' });
    window.location.href = `${API_BASE}expapi/oauth2/discord/auth/start?${params}`;
  };

  const handleUnlinkDiscord = async () => {
    if (!confirm(t('settings.discord.unlinkConfirm'))) return;
    setDiscordUnlinking(true);
    try {
      const csrfRes = await fetch(`${API_BASE}expapi/v1/csrf-token`, { credentials: 'include' });
      const { csrfToken } = await csrfRes.json();
      const res = await fetch(`${API_BASE}expapi/v1/unlink-discord`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
      });
      if (res.ok) {
        await refreshUser();
        setSaveMsg({ type: 'success', text: t('settings.discord.unlinked') });
      } else {
        const err = await res.json().catch(() => ({}));
        setSaveMsg({ type: 'error', text: err.error || t('settings.discord.unlinkError') });
      }
    } catch {
      setSaveMsg({ type: 'error', text: t('common.connectionError') });
    } finally {
      setDiscordUnlinking(false);
    }
  };

  // ─── Account closure ──────────────────────────────────────────────────────
  const handleRequestClosure = async () => {
    if (closureConfirmText !== t('settings.account.deletePlaceholder')) {
      setSaveMsg({ type: 'error', text: t('settings.account.typeDeleteError') });
      return;
    }
    setClosureLoading(true);
    try {
      const csrfRes = await fetch(`${API_BASE}expapi/v1/csrf-token`, { credentials: 'include' });
      const { csrfToken } = await csrfRes.json();
      const res = await fetch(`${API_BASE}expapi/v1/user/close-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({ confirm: true }),
      });
      if (res.ok) {
        const data = await res.json();
        setSaveMsg({ type: 'success', text: data.message });
        setClosureConfirmOpen(false);
        setClosureConfirmText('');
        await refreshUser();
      } else {
        const err = await res.json().catch(() => ({}));
        setSaveMsg({ type: 'error', text: err.error || t('settings.account.scheduleCloseError') });
      }
    } catch {
      setSaveMsg({ type: 'error', text: t('common.connectionError') });
    } finally {
      setClosureLoading(false);
    }
  };

  const handleCancelClosure = async () => {
    setClosureLoading(true);
    try {
      const csrfRes = await fetch(`${API_BASE}expapi/v1/csrf-token`, { credentials: 'include' });
      const { csrfToken } = await csrfRes.json();
      const res = await fetch(`${API_BASE}expapi/v1/user/cancel-close-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
      });
      if (res.ok) {
        setSaveMsg({ type: 'success', text: t('settings.account.cancelCloseSuccess') });
        await refreshUser();
      } else {
        const err = await res.json().catch(() => ({}));
        setSaveMsg({ type: 'error', text: err.error || t('settings.account.cancelCloseError') });
      }
    } catch {
      setSaveMsg({ type: 'error', text: t('common.connectionError') });
    } finally {
      setClosureLoading(false);
    }
  };

  const copyAccountId = async () => {
    try {
      await navigator.clipboard.writeText(user.accountId);
      setCopiedAccountId(true);
      setTimeout(() => setCopiedAccountId(false), 2000);
    } catch {}
  };

  if (loading) return <AppShell><SettingsSkeleton /></AppShell>;
  if (userError || !user) {
    return (
      <AppShell>
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center max-w-md mx-auto">
          <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
          </div>
          <h3 className="text-base font-semibold text-gray-900">{t("common.loadingError")}</h3>
          <p className="text-sm text-gray-600 mt-1">{userError || t('common.loadingError')}</p>
          <button
            onClick={() => refreshUser()}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            <ArrowPathIcon className="h-4 w-4" />
            {t('common.tryAgain')}
          </button>
        </div>
      </AppShell>
    );
  }

  // Username cooldown info
  const usernameCooldown = user.usernameChangedAt
    ? new Date(new Date(user.usernameChangedAt).getTime() + 30 * 24 * 60 * 60 * 1000)
    : null;
  const usernameOnCooldown = usernameCooldown && new Date() < usernameCooldown;

  const displayNameCooldown = user.displayNameChangedAt
    ? new Date(new Date(user.displayNameChangedAt).getTime() + 24 * 60 * 60 * 1000)
    : null;
  const displayNameOnCooldown = displayNameCooldown && new Date() < displayNameCooldown;

  return (
    <AppShell maxWidth="max-w-5xl" title={t("settings.title")} subtitle={t("settings.subtitle")}>
      <div className="space-y-6">
        {/* Mensagem de save */}
        {saveMsg && (
          <div className={`px-4 py-2.5 rounded-md text-sm flex items-center gap-2 ${
            saveMsg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
            saveMsg.type === 'info' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
            'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {saveMsg.type === 'success' ? <CheckIcon className="h-4 w-4" /> : <ExclamationTriangleIcon className="h-4 w-4" />}
            {saveMsg.text}
          </div>
        )}

        {/* Aviso de exclusão agendada */}
        {user.deletionScheduledFor && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start justify-between gap-3">
            <div className="text-sm text-red-800">
              <strong>{t('settings.account.scheduledDeletion')}.</strong> {t('settings.account.permanentDeletion')}{' '}
              <strong>{new Date(user.deletionScheduledFor).toLocaleDateString(undefined)}</strong>.
              {t('settings.account.cancelByLogin')}
            </div>
            <button
              onClick={handleCancelClosure}
              disabled={closureLoading}
              className="flex-shrink-0 px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              {t('settings.account.cancelDeletion')}
            </button>
          </div>
        )}

        {/* Escudo admin (se aplicável) */}
        {isAdmin() && (
          <Link
            to="/admin"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-purple-700 bg-purple-100 rounded-md hover:bg-purple-200 transition-colors"
          >
            <ShieldIcon className="h-4 w-4" />
            {t('settings.account.adminPanel')}
          </Link>
        )}

        {/* Tabs internas (subheader) */}
        <div className="bg-white border border-gray-200 rounded-xl p-1 flex gap-1 overflow-x-auto">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                  active ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="h-4 w-4" />
                {t(tab.labelKey)}
              </button>
            );
          })}
        </div>

        {/* ── Tab: Perfil ───────────────────────────────────────── */}
        {activeTab === 'profile' && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
            <div>
              <h3 className="text-base font-semibold text-gray-900">{t("settings.profile.title")}</h3>
              <p className="text-sm text-gray-500 mt-0.5">{t("settings.account.nameEmail")}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t("auth.register.firstName")}</label>
                <input
                  type="text"
                  value={settings.firstName}
                  onChange={(e) => handleSettingChange('firstName', e.target.value)}
                  className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t("auth.register.firstName")}</label>
                <input
                  type="text"
                  value={settings.lastName}
                  onChange={(e) => handleSettingChange('lastName', e.target.value)}
                  className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">{t("auth.register.email")}</label>
                <input
                  type="email"
                  value={settings.email}
                  disabled
                  className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                />
                <p className="text-[10px] text-gray-400 mt-1">{t("settings.account.emailCannotChange")}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <h4 className="text-sm font-medium text-gray-900 mb-2">{t("settings.account.accountId")}</h4>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs font-mono text-gray-600 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                  {showAccountId ? user.accountId : '••••••••-••••-••••-••••-••••••••••••'}
                </code>
                <button
                  onClick={() => setShowAccountId(!showAccountId)}
                  className="p-2 text-gray-500 hover:text-gray-700"
                  title={showAccountId ? t('common.hide') : t('common.show')}
                >
                  {showAccountId ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                </button>
                <button onClick={copyAccountId} className="p-2 text-gray-500 hover:text-gray-700" title={t("common.copy")}>
                  {copiedAccountId ? <CheckIcon className="h-4 w-4 text-green-600" /> : <ClipboardDocumentIcon className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">{t("settings.account.accountIdHint")}</p>
            </div>

            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
            >
              {saving ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <CheckIcon className="h-4 w-4" />}
              {t("settings.account.saveChanges")}
            </button>
          </div>
        )}

        {/* ── Tab: Identidade ───────────────────────────────────── */}
        {activeTab === 'identity' && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
            <div>
              <h3 className="text-base font-semibold text-gray-900">{t("settings.tabs.identity")}</h3>
              <p className="text-sm text-gray-500 mt-0.5">{t("settings.account.usernameDesc")}</p>
            </div>

            {/* Preview do perfil público */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 flex items-center gap-2 text-xs text-purple-800">
              <span>{t("settings.account.yourPublicProfile")}</span>
              <code className="bg-purple-100 px-2 py-0.5 rounded font-mono">
                /u/{identityForm.username || t('settings.account.usernamePlaceholder')}
              </code>
              {identityForm.username && (
                <Link to={`/u/${identityForm.username}`} className="ml-auto text-purple-600 hover:text-purple-700 underline">
                  {t("common.viewProfile")}
                </Link>
              )}
            </div>

            {/* Username */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {t('common.username')}
                {usernameOnCooldown && (
                  <span className="ml-2 text-[10px] text-yellow-700 bg-yellow-100 px-1.5 py-0.5 rounded">
                    {t('settings.account.usernameBlocked', { date: usernameCooldown.toLocaleDateString(undefined) })}
                  </span>
                )}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">@</span>
                <input
                  type="text"
                  value={identityForm.username}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^A-Za-z0-9_]/g, '').slice(0, 16);
                    setIdentityForm(prev => ({ ...prev, username: v }));
                  }}
                  disabled={usernameOnCooldown}
                  className={`w-full pl-7 pr-10 py-2 text-sm border rounded-md focus:ring-2 focus:outline-none disabled:bg-gray-50 disabled:cursor-not-allowed ${
                    usernameStatus === 'available' ? 'border-green-400 focus:ring-green-500' :
                    usernameStatus === 'taken' || usernameStatus === 'invalid' ? 'border-red-400 focus:ring-red-500' :
                    'border-gray-300 focus:ring-purple-500'
                  }`}
                  placeholder={t("settings.account.usernamePlaceholder")}
                  minLength={4}
                  maxLength={16}
                />
                {usernameStatus === 'available' && <CheckIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />}
                {usernameStatus === 'checking' && <div className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {t("settings.account.usernameHint")}
              </p>
            </div>

            {/* DisplayName */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {t('settings.identity.displayName')}
                {displayNameOnCooldown && (
                  <span className="ml-2 text-[10px] text-yellow-700 bg-yellow-100 px-1.5 py-0.5 rounded">
                    {t('settings.identity.blockedUntil', { date: displayNameCooldown.toLocaleString(undefined, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) })}
                  </span>
                )}
              </label>
              <input
                type="text"
                value={identityForm.displayName}
                onChange={(e) => setIdentityForm(prev => ({ ...prev, displayName: e.target.value.slice(0, 32) }))}
                disabled={displayNameOnCooldown}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                placeholder={t("settings.account.displayNamePlaceholder")}
                maxLength={32}
              />
              <p className="text-xs text-gray-500 mt-1">{t("settings.account.displayNameHint")}</p>
            </div>

            <button
              onClick={handleSaveIdentity}
              disabled={savingIdentity}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
            >
              {savingIdentity ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <CheckIcon className="h-4 w-4" />}
              {t('settings.identity.saveIdentity')}
            </button>
          </div>
        )}

        {/* ── Tab: Notificações ─────────────────────────────────── */}
        {activeTab === 'notifications' && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
            <div>
              <h3 className="text-base font-semibold text-gray-900">{t("settings.tabs.notifications")}</h3>
              <p className="text-sm text-gray-500 mt-0.5">{t("settings.account.notificationsDesc")}</p>
            </div>
            <ToggleRow label={t('settings.account.emailNotif')} desc={t('settings.account.emailNotifDesc')} checked={settings.emailNotifications} onChange={(v) => handleSettingChange('emailNotifications', v)} />
            <ToggleRow label={t('settings.account.discordNotif')} desc={t('settings.account.discordNotifDesc')} checked={settings.discordNotifications} onChange={(v) => handleSettingChange('discordNotifications', v)} />
            <ToggleRow label={t('settings.account.botActivity')} desc={t('settings.account.botActivityDesc')} checked={settings.botActivityAlerts} onChange={(v) => handleSettingChange('botActivityAlerts', v)} />
            <button onClick={handleSaveSettings} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50">
              {saving ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <CheckIcon className="h-4 w-4" />}
              {t('common.save')}
            </button>
          </div>
        )}

        {/* ── Tab: Privacidade ──────────────────────────────────── */}
        {activeTab === 'privacy' && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
            <div>
              <h3 className="text-base font-semibold text-gray-900">{t("settings.tabs.privacy")}</h3>
              <p className="text-sm text-gray-500 mt-0.5">{t("settings.account.privacyDesc")}</p>
            </div>
            <ToggleRow label={t('settings.account.publicProfile')} desc={t('settings.account.publicProfileDesc')} checked={settings.publicProfile} onChange={(v) => handleSettingChange('publicProfile', v)} />
            <ToggleRow label={t('settings.account.showOnline')} desc={t('settings.account.showOnlineDesc')} checked={settings.showOnlineStatus} onChange={(v) => handleSettingChange('showOnlineStatus', v)} />
            <button onClick={handleSaveSettings} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50">
              {saving ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <CheckIcon className="h-4 w-4" />}
              {t('common.save')}
            </button>
          </div>
        )}

        {/* ── Tab: Regional ─────────────────────────────────────── */}
        {activeTab === 'regional' && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
            <div>
              <h3 className="text-base font-semibold text-gray-900">{t("settings.regional.title")}</h3>
              <p className="text-sm text-gray-500 mt-0.5">{t("settings.account.regionalDesc")}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t("settings.regional.language")}</label>
                <select
                  value={settings.language}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="pt-BR">Português (Brasil)</option>
                  <option value="en-US">English (US)</option>
                  <option value="es-ES">Español</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t("settings.regional.timezone")}</label>
                <select
                  value={settings.timezone}
                  onChange={(e) => handleSettingChange('timezone', e.target.value)}
                  className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="America/Sao_Paulo">São Paulo (UTC-3)</option>
                  <option value="America/New_York">New York (UTC-5)</option>
                  <option value="Europe/London">London (UTC+0)</option>
                  <option value="Asia/Tokyo">Tokyo (UTC+9)</option>
                </select>
              </div>
            </div>
            <button onClick={handleSaveSettings} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50">
              {saving ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <CheckIcon className="h-4 w-4" />}
              {t('common.save')}
            </button>
          </div>
        )}

        {/* ── Tab: Segurança ────────────────────────────────────── */}
        {activeTab === 'security' && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
            <div>
              <h3 className="text-base font-semibold text-gray-900">{t("settings.security.password")}</h3>
              <p className="text-sm text-gray-500 mt-0.5">{t("settings.account.securityDesc")}</p>
            </div>
            {showSetPassword && (
              <SetPasswordModal onSuccess={() => setShowSetPassword(false)} onSkip={() => setShowSetPassword(false)} />
            )}
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <PasswordInput label={t('settings.security.currentPassword')} value={passwordData.currentPassword} onChange={(v) => setPasswordData(p => ({ ...p, currentPassword: v }))} show={showPasswords.current} onToggle={() => setShowPasswords(s => ({ ...s, current: !s.current }))} placeholder={t('settings.security.currentPasswordPlaceholder')} required />
              <PasswordInput label={t('settings.security.newPassword')} value={passwordData.newPassword} onChange={(v) => setPasswordData(p => ({ ...p, newPassword: v }))} show={showPasswords.new} onToggle={() => setShowPasswords(s => ({ ...s, new: !s.new }))} placeholder={t('settings.security.newPasswordPlaceholder')} required minLength={8} />
              <PasswordInput label={t('settings.security.confirmPassword')} value={passwordData.confirmPassword} onChange={(v) => setPasswordData(p => ({ ...p, confirmPassword: v }))} show={showPasswords.confirm} onToggle={() => setShowPasswords(s => ({ ...s, confirm: !s.confirm }))} placeholder={t('settings.security.confirmPasswordPlaceholder')} required />
              {passwordData.newPassword && passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && (
                <p className="text-xs text-red-600">⚠ {t('settings.security.passwordsDontMatch')}</p>
              )}
              <button type="submit" disabled={passwordData.newPassword !== passwordData.confirmPassword || !passwordData.currentPassword || !passwordData.newPassword} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50">
                <KeyIcon className="h-4 w-4" />
                {t('settings.security.changePassword')}
              </button>
            </form>
          </div>
        )}

        {/* ── Tab: Discord ──────────────────────────────────────── */}
        {activeTab === 'discord' && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
            <div>
              <h3 className="text-base font-semibold text-gray-900">{t("settings.discord.title")}</h3>
              <p className="text-sm text-gray-500 mt-0.5">{t("settings.account.discordConnectDesc")}</p>
            </div>
            {user.discordOauth2Id ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckIcon className="h-5 w-5" />
                  <span className="text-sm font-medium">{t("settings.account.discordConnected")}</span>
                </div>
                <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                  <p className="text-xs text-gray-600">{t("settings.account.discordId")}</p>
                  <code className="text-sm font-mono text-gray-900">{user.discordOauth2Id}</code>
                </div>
                <button onClick={handleUnlinkDiscord} disabled={discordUnlinking} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50">
                  <NoSymbolIcon className="h-4 w-4" />
                  {discordUnlinking ? t('settings.discord.unlinking') : t('settings.discord.unlink')}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-yellow-700">
                  <ExclamationTriangleIcon className="h-5 w-5" />
                  <span className="text-sm font-medium">{t("settings.account.discordNotConnected")}</span>
                </div>
                <p className="text-sm text-gray-600">{t('settings.account.discordConnectCta')}</p>
                <button onClick={handleLinkDiscord} disabled={discordLinking} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50">
                  <LinkIcon className="h-4 w-4" />
                  {discordLinking ? t('settings.discord.connecting') : t('settings.discord.connect')}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Conta (Danger zone) ──────────────────────────── */}
        {activeTab === 'danger' && (
          <div className="space-y-4">
            {user.deletionScheduledFor ? (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                <h3 className="text-base font-semibold text-red-900">{t("settings.account.scheduledDeletionBadge")}</h3>
                <p className="text-sm text-red-700 mt-1">
                  {t('settings.account.deletionScheduledIn')}{' '}
                  <strong>{new Date(user.deletionScheduledFor).toLocaleDateString(undefined)}</strong>.
                  {t('settings.account.dataRemovedAfterPeriod')}
                </p>
                <p className="text-xs text-red-600 mt-2">
                  {t('settings.account.cancelByLoginOrButton')}
                </p>
                <button
                  onClick={handleCancelClosure}
                  disabled={closureLoading}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {closureLoading ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <CheckIcon className="h-4 w-4" />}
                  {t('settings.account.cancelClose')}
                </button>
              </div>
            ) : (
              <div className="bg-white border border-red-200 rounded-xl p-6">
                <h3 className="text-base font-semibold text-red-900">{t("settings.account.closeAccountButton")}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {t('settings.account.scheduleCloseDesc')}
                </p>
                <ul className="text-xs text-gray-500 mt-3 space-y-1 list-disc pl-5">
                  <li>{t('settings.account.deletionWarning1')}</li>
                  <li>{t('settings.account.deletionWarning2')}</li>
                  <li>{t('settings.account.deletionWarning3')}</li>
                  <li>{t('settings.account.deletionWarning4')}</li>
                </ul>

                {!closureConfirmOpen ? (
                  <button
                    onClick={() => setClosureConfirmOpen(true)}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-300 rounded-md hover:bg-red-100"
                  >
                    <TrashIcon className="h-4 w-4" />
                    {t('settings.account.scheduleClose')}
                  </button>
                ) : (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md space-y-3">
                    <p className="text-sm font-medium text-red-900">{t("settings.account.finalConfirmation")}</p>
                    <p className="text-xs text-red-700" dangerouslySetInnerHTML={{ __html: t('settings.account.typeDelete') }} />
                    <input
                      type="text"
                      value={closureConfirmText}
                      onChange={(e) => setClosureConfirmText(e.target.value)}
                      placeholder={t('settings.account.deletePlaceholder')}
                      className="w-full px-3 py-2 text-sm border border-red-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 uppercase tracking-wider"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setClosureConfirmOpen(false); setClosureConfirmText(''); }}
                        disabled={closureLoading}
                        className="px-3 py-1.5 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        {t('common.cancel')}
                      </button>
                      <button
                        onClick={handleRequestClosure}
                        disabled={closureLoading || closureConfirmText !== t('settings.account.deletePlaceholder')}
                        className="inline-flex items-center gap-2 px-4 py-1.5 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                      >
                        {closureLoading ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <TrashIcon className="h-4 w-4" />}
                        {t('settings.account.confirmClose')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

// ─── Subcomponentes ──────────────────────────────────────────────────────────

function ToggleRow({ label, desc, checked, onChange }) {
  return (
    <div className="flex items-start justify-between gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors ${
          checked ? 'bg-purple-600' : 'bg-gray-200'
        }`}
      >
        <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`} />
      </button>
    </div>
  );
}

function PasswordInput({ label, value, onChange, show, onToggle, placeholder, required, minLength }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          minLength={minLength}
          className="block w-full px-3 py-2 pr-10 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
        >
          {show ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
