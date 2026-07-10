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
import AppShell from '../../components/AppShell';
import SetPasswordModal from '../dashboardPage/components/SetPasswordModal';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

const TABS = [
  { id: 'profile',       label: 'Perfil',         icon: UserIcon },
  { id: 'identity',      label: 'Identidade',     icon: IdentificationIcon },
  { id: 'notifications', label: 'Notificações',   icon: BellIcon },
  { id: 'privacy',       label: 'Privacidade',    icon: ShieldCheckIcon },
  { id: 'regional',      label: 'Regional',       icon: GlobeAltIcon },
  { id: 'security',      label: 'Segurança',      icon: KeyIcon },
  { id: 'discord',       label: 'Discord',        icon: LinkIcon },
  { id: 'danger',        label: 'Conta',          icon: TrashIcon },
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

  const handleSaveSettings = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const csrfRes = await fetch(`${API_BASE}expapi/v1/csrf-token`, { credentials: 'include' });
      const { csrfToken } = await csrfRes.json();
      const res = await fetch(`${API_BASE}expapi/v1/user/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setSaveMsg({ type: 'success', text: 'Configurações salvas com sucesso!' });
        await refreshUser();
      } else {
        const err = await res.json().catch(() => ({}));
        setSaveMsg({ type: 'error', text: err.error || 'Erro ao salvar configurações' });
      }
    } catch {
      setSaveMsg({ type: 'error', text: 'Erro de conexão. Tente novamente.' });
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 4000);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setSaveMsg({ type: 'error', text: 'As senhas não coincidem' });
      return;
    }
    if (passwordData.newPassword.length < 8) {
      setSaveMsg({ type: 'error', text: 'A nova senha deve ter pelo menos 8 caracteres' });
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
        setSaveMsg({ type: 'success', text: 'Senha alterada com sucesso!' });
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        const err = await res.json().catch(() => ({}));
        setSaveMsg({ type: 'error', text: err.error || 'Erro ao alterar senha' });
      }
    } catch {
      setSaveMsg({ type: 'error', text: 'Erro de conexão' });
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
        setSaveMsg({ type: 'info', text: 'Nenhuma alteração para salvar.' });
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
        setSaveMsg({ type: 'success', text: 'Identidade atualizada!' });
        await refreshUser();
      } else {
        const err = await res.json().catch(() => ({}));
        setSaveMsg({ type: 'error', text: err.error || `HTTP ${res.status}` });
      }
    } catch {
      setSaveMsg({ type: 'error', text: 'Erro de conexão' });
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
    if (!confirm('Tem certeza que deseja desvincular sua conta Discord?')) return;
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
        setSaveMsg({ type: 'success', text: 'Discord desvinculado' });
      } else {
        const err = await res.json().catch(() => ({}));
        setSaveMsg({ type: 'error', text: err.error || 'Erro ao desvincular Discord' });
      }
    } catch {
      setSaveMsg({ type: 'error', text: 'Erro de conexão' });
    } finally {
      setDiscordUnlinking(false);
    }
  };

  // ─── Account closure ──────────────────────────────────────────────────────
  const handleRequestClosure = async () => {
    if (closureConfirmText !== 'EXCLUIR') {
      setSaveMsg({ type: 'error', text: 'Digite EXCLUIR para confirmar' });
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
        setSaveMsg({ type: 'error', text: err.error || 'Erro ao agendar fechamento' });
      }
    } catch {
      setSaveMsg({ type: 'error', text: 'Erro de conexão' });
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
        setSaveMsg({ type: 'success', text: 'Fechamento cancelado. Conta ativa.' });
        await refreshUser();
      } else {
        const err = await res.json().catch(() => ({}));
        setSaveMsg({ type: 'error', text: err.error || 'Erro ao cancelar' });
      }
    } catch {
      setSaveMsg({ type: 'error', text: 'Erro de conexão' });
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
          <h3 className="text-base font-semibold text-gray-900">Erro ao carregar configurações</h3>
          <p className="text-sm text-gray-600 mt-1">{userError || 'Não foi possível carregar os dados.'}</p>
          <button
            onClick={() => refreshUser()}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            <ArrowPathIcon className="h-4 w-4" />
            Tentar novamente
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
    <AppShell maxWidth="max-w-5xl" title="Configurações" subtitle="Gerencie sua conta e preferências">
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
              <strong>Conta agendada para exclusão.</strong> Exclusão permanente em{' '}
              <strong>{new Date(user.deletionScheduledFor).toLocaleDateString('pt-BR')}</strong>.
              Faça login regularmente para cancelar automaticamente.
            </div>
            <button
              onClick={handleCancelClosure}
              disabled={closureLoading}
              className="flex-shrink-0 px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              Cancelar exclusão
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
            Painel Admin
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
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── Tab: Perfil ───────────────────────────────────────── */}
        {activeTab === 'profile' && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Informações pessoais</h3>
              <p className="text-sm text-gray-500 mt-0.5">Seu nome e email de cadastro</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nome</label>
                <input
                  type="text"
                  value={settings.firstName}
                  onChange={(e) => handleSettingChange('firstName', e.target.value)}
                  className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Sobrenome</label>
                <input
                  type="text"
                  value={settings.lastName}
                  onChange={(e) => handleSettingChange('lastName', e.target.value)}
                  className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                <input
                  type="email"
                  value={settings.email}
                  disabled
                  className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                />
                <p className="text-[10px] text-gray-400 mt-1">O email não pode ser alterado.</p>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <h4 className="text-sm font-medium text-gray-900 mb-2">ID da conta</h4>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs font-mono text-gray-600 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                  {showAccountId ? user.accountId : '••••••••-••••-••••-••••-••••••••••••'}
                </code>
                <button
                  onClick={() => setShowAccountId(!showAccountId)}
                  className="p-2 text-gray-500 hover:text-gray-700"
                  title={showAccountId ? 'Ocultar' : 'Mostrar'}
                >
                  {showAccountId ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                </button>
                <button onClick={copyAccountId} className="p-2 text-gray-500 hover:text-gray-700" title="Copiar">
                  {copiedAccountId ? <CheckIcon className="h-4 w-4 text-green-600" /> : <ClipboardDocumentIcon className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Use este ID em solicitações de suporte.</p>
            </div>

            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
            >
              {saving ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <CheckIcon className="h-4 w-4" />}
              Salvar alterações
            </button>
          </div>
        )}

        {/* ── Tab: Identidade ───────────────────────────────────── */}
        {activeTab === 'identity' && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Identidade pública</h3>
              <p className="text-sm text-gray-500 mt-0.5">Username único e nome de exibição para seu perfil público</p>
            </div>

            {/* Preview do perfil público */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 flex items-center gap-2 text-xs text-purple-800">
              <span>Seu perfil público:</span>
              <code className="bg-purple-100 px-2 py-0.5 rounded font-mono">
                /u/{identityForm.username || 'seu_username'}
              </code>
              {identityForm.username && (
                <Link to={`/u/${identityForm.username}`} className="ml-auto text-purple-600 hover:text-purple-700 underline">
                  Ver perfil
                </Link>
              )}
            </div>

            {/* Username */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Username
                {usernameOnCooldown && (
                  <span className="ml-2 text-[10px] text-yellow-700 bg-yellow-100 px-1.5 py-0.5 rounded">
                    Bloqueado até {usernameCooldown.toLocaleDateString('pt-BR')}
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
                  placeholder="seu_username"
                  minLength={4}
                  maxLength={16}
                />
                {usernameStatus === 'available' && <CheckIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />}
                {usernameStatus === 'checking' && <div className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                4-16 caracteres. Letras, números e _. Alterável a cada 30 dias.
              </p>
            </div>

            {/* DisplayName */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Nome de exibição
                {displayNameOnCooldown && (
                  <span className="ml-2 text-[10px] text-yellow-700 bg-yellow-100 px-1.5 py-0.5 rounded">
                    Bloqueado até {displayNameCooldown.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </label>
              <input
                type="text"
                value={identityForm.displayName}
                onChange={(e) => setIdentityForm(prev => ({ ...prev, displayName: e.target.value.slice(0, 32) }))}
                disabled={displayNameOnCooldown}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                placeholder="Como você quer ser chamado"
                maxLength={32}
              />
              <p className="text-xs text-gray-500 mt-1">1-32 caracteres. Pode conter espaços e acentos. Alterável a cada 24h.</p>
            </div>

            <button
              onClick={handleSaveIdentity}
              disabled={savingIdentity}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
            >
              {savingIdentity ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <CheckIcon className="h-4 w-4" />}
              Salvar identidade
            </button>
          </div>
        )}

        {/* ── Tab: Notificações ─────────────────────────────────── */}
        {activeTab === 'notifications' && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Notificações</h3>
              <p className="text-sm text-gray-500 mt-0.5">Escolha como deseja ser avisado</p>
            </div>
            <ToggleRow label="Notificações por email" desc="Receber novidades e alertas por email" checked={settings.emailNotifications} onChange={(v) => handleSettingChange('emailNotifications', v)} />
            <ToggleRow label="Notificações do Discord" desc="Receber DMs do bot para alertas importantes" checked={settings.discordNotifications} onChange={(v) => handleSettingChange('discordNotifications', v)} />
            <ToggleRow label="Alertas de atividade do bot" desc="Ser avisado quando o bot ficar offline/online" checked={settings.botActivityAlerts} onChange={(v) => handleSettingChange('botActivityAlerts', v)} />
            <button onClick={handleSaveSettings} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50">
              {saving ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <CheckIcon className="h-4 w-4" />}
              Salvar
            </button>
          </div>
        )}

        {/* ── Tab: Privacidade ──────────────────────────────────── */}
        {activeTab === 'privacy' && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Privacidade</h3>
              <p className="text-sm text-gray-500 mt-0.5">Controle sua visibilidade</p>
            </div>
            <ToggleRow label="Perfil público" desc="Permitir que outros usuários vejam seu perfil em /u/:username" checked={settings.publicProfile} onChange={(v) => handleSettingChange('publicProfile', v)} />
            <ToggleRow label="Mostrar status online" desc="Exibir quando você está online no dashboard" checked={settings.showOnlineStatus} onChange={(v) => handleSettingChange('showOnlineStatus', v)} />
            <button onClick={handleSaveSettings} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50">
              {saving ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <CheckIcon className="h-4 w-4" />}
              Salvar
            </button>
          </div>
        )}

        {/* ── Tab: Regional ─────────────────────────────────────── */}
        {activeTab === 'regional' && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Regional</h3>
              <p className="text-sm text-gray-500 mt-0.5">Idioma e fuso horário</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Idioma</label>
                <select
                  value={settings.language}
                  onChange={(e) => handleSettingChange('language', e.target.value)}
                  className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="pt-BR">Português (Brasil)</option>
                  <option value="en-US">English (US)</option>
                  <option value="es-ES">Español</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Fuso horário</label>
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
              Salvar
            </button>
          </div>
        )}

        {/* ── Tab: Segurança ────────────────────────────────────── */}
        {activeTab === 'security' && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Alterar senha</h3>
              <p className="text-sm text-gray-500 mt-0.5">Mantenha sua conta segura</p>
            </div>
            {showSetPassword && (
              <SetPasswordModal onSuccess={() => setShowSetPassword(false)} onSkip={() => setShowSetPassword(false)} />
            )}
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <PasswordInput label="Senha atual" value={passwordData.currentPassword} onChange={(v) => setPasswordData(p => ({ ...p, currentPassword: v }))} show={showPasswords.current} onToggle={() => setShowPasswords(s => ({ ...s, current: !s.current }))} placeholder="Sua senha atual" required />
              <PasswordInput label="Nova senha" value={passwordData.newPassword} onChange={(v) => setPasswordData(p => ({ ...p, newPassword: v }))} show={showPasswords.new} onToggle={() => setShowPasswords(s => ({ ...s, new: !s.new }))} placeholder="Mínimo 8 caracteres, maiúscula, minúscula e número" required minLength={8} />
              <PasswordInput label="Confirmar nova senha" value={passwordData.confirmPassword} onChange={(v) => setPasswordData(p => ({ ...p, confirmPassword: v }))} show={showPasswords.confirm} onToggle={() => setShowPasswords(s => ({ ...s, confirm: !s.confirm }))} placeholder="Repita a nova senha" required />
              {passwordData.newPassword && passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && (
                <p className="text-xs text-red-600">⚠ As senhas não coincidem</p>
              )}
              <button type="submit" disabled={passwordData.newPassword !== passwordData.confirmPassword || !passwordData.currentPassword || !passwordData.newPassword} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50">
                <KeyIcon className="h-4 w-4" />
                Alterar senha
              </button>
            </form>
          </div>
        )}

        {/* ── Tab: Discord ──────────────────────────────────────── */}
        {activeTab === 'discord' && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Integração com Discord</h3>
              <p className="text-sm text-gray-500 mt-0.5">Vincule sua conta para ver seus servidores</p>
            </div>
            {user.discordOauth2Id ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckIcon className="h-5 w-5" />
                  <span className="text-sm font-medium">Discord conectado</span>
                </div>
                <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                  <p className="text-xs text-gray-600">Discord ID</p>
                  <code className="text-sm font-mono text-gray-900">{user.discordOauth2Id}</code>
                </div>
                <button onClick={handleUnlinkDiscord} disabled={discordUnlinking} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50">
                  <NoSymbolIcon className="h-4 w-4" />
                  {discordUnlinking ? 'Desvinculando...' : 'Desvincular Discord'}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-yellow-700">
                  <ExclamationTriangleIcon className="h-5 w-5" />
                  <span className="text-sm font-medium">Discord não conectado</span>
                </div>
                <p className="text-sm text-gray-600">Conecte sua conta Discord para ver seus servidores na Área de Membros e gerenciar as configurações do bot em cada um deles.</p>
                <button onClick={handleLinkDiscord} disabled={discordLinking} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50">
                  <LinkIcon className="h-4 w-4" />
                  {discordLinking ? 'Conectando...' : 'Conectar Discord'}
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
                <h3 className="text-base font-semibold text-red-900">Exclusão agendada</h3>
                <p className="text-sm text-red-700 mt-1">
                  Sua conta será permanentemente excluída em{' '}
                  <strong>{new Date(user.deletionScheduledFor).toLocaleDateString('pt-BR')}</strong>.
                  Todos os dados serão removidos após esse período.
                </p>
                <p className="text-xs text-red-600 mt-2">
                  Para cancelar, basta fazer login regularmente ou clicar no botão abaixo.
                </p>
                <button
                  onClick={handleCancelClosure}
                  disabled={closureLoading}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {closureLoading ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <CheckIcon className="h-4 w-4" />}
                  Cancelar exclusão
                </button>
              </div>
            ) : (
              <div className="bg-white border border-red-200 rounded-xl p-6">
                <h3 className="text-base font-semibold text-red-900">Fechar conta</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Agende a exclusão da sua conta. A exclusão ocorrerá após 30 dias.
                  Se você fizer login novamente antes desse período, a exclusão será cancelada automaticamente.
                </p>
                <ul className="text-xs text-gray-500 mt-3 space-y-1 list-disc pl-5">
                  <li>Seus dados serão permanentemente removidos após 30 dias</li>
                  <li>Seu username ficará reservado por 30 dias antes de ser liberado</li>
                  <li>Itens do inventário e progresso serão perdidos</li>
                  <li>Login a qualquer momento cancela a exclusão</li>
                </ul>

                {!closureConfirmOpen ? (
                  <button
                    onClick={() => setClosureConfirmOpen(true)}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-300 rounded-md hover:bg-red-100"
                  >
                    <TrashIcon className="h-4 w-4" />
                    Agendar fechamento
                  </button>
                ) : (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md space-y-3">
                    <p className="text-sm font-medium text-red-900">Confirmação final</p>
                    <p className="text-xs text-red-700">Digite <strong>EXCLUIR</strong> para confirmar o agendamento:</p>
                    <input
                      type="text"
                      value={closureConfirmText}
                      onChange={(e) => setClosureConfirmText(e.target.value)}
                      placeholder="EXCLUIR"
                      className="w-full px-3 py-2 text-sm border border-red-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 uppercase tracking-wider"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setClosureConfirmOpen(false); setClosureConfirmText(''); }}
                        disabled={closureLoading}
                        className="px-3 py-1.5 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleRequestClosure}
                        disabled={closureLoading || closureConfirmText !== 'EXCLUIR'}
                        className="inline-flex items-center gap-2 px-4 py-1.5 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                      >
                        {closureLoading ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <TrashIcon className="h-4 w-4" />}
                        Confirmar fechamento
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
