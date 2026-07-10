import { useState, useEffect } from 'react';
import { useUser } from '../../../../contexts/UserContext';
import { 
  EyeIcon,
  EyeSlashIcon,
  ShieldCheckIcon,
  BellIcon,
  GlobeAltIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import SetPasswordModal from '../SetPasswordModal.jsx';
import ErrorBanner from '../../../../components/ui/ErrorBanner';

function SettingsSkeleton() {
  return (
    <div className="space-y-6 sm:space-y-8 max-w-4xl">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white shadow-lg rounded-lg border border-gray-100">
          <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 bg-gray-50 rounded-t-lg">
            <div className="flex items-center">
              <div className="h-5 w-5 bg-gray-200 rounded animate-pulse mr-3" />
              <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="mt-2 h-3 w-56 bg-gray-100 rounded animate-pulse" />
          </div>
          <div className="px-4 sm:px-6 py-4 sm:py-6 space-y-4">
            {[1, 2].map((j) => (
              <div
                key={j}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="space-y-2 flex-1">
                  <div className="h-3 w-32 bg-gray-200 rounded animate-pulse" />
                  <div className="h-2 w-48 bg-gray-100 rounded animate-pulse" />
                </div>
                <div className="h-6 w-11 bg-gray-200 rounded-full animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SettingsTab() {
  const { user, refreshUser, loading: userLoading, error: userError } = useUser();
  const [settings, setSettings] = useState({
    emailNotifications: true,
    discordNotifications: true,
    botActivityAlerts: false,
    publicProfile: false,
    showOnlineStatus: true,
    language: 'pt-BR',
    timezone: 'America/Sao_Paulo'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showSetPassword, setShowSetPassword] = useState(false);
      useEffect(() => {
          if (!user) return;

          const params = new URLSearchParams(window.location.search);
          const shouldSetupPassword =
                !user.hasPassword ||
                params.get('setupPassword') === '1';

          if (shouldSetupPassword) {
                setShowSetPassword(true);

                // remove ?setupPassword=1 da URL
                if (params.get('setupPassword') === '1') {
                  window.history.replaceState(
                        {},
                        '',
                        window.location.pathname
                  );
                }
          }
        }, [user]);

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [showAccountId, setShowAccountId] = useState(false);
  const [copiedAccountId, setCopiedAccountId] = useState(false);

  // Carregar configurações do usuário do contexto
  useEffect(() => {
    if (user) {
      setSettings({
        emailNotifications: user.emailNotifications || true,
        discordNotifications: user.discordNotifications || true,
        botActivityAlerts: user.botActivityAlerts || false,
        publicProfile: user.publicProfile || false,
        showOnlineStatus: user.showOnlineStatus || true,
        hasPassword: user.hasPassword || false,
        language: user.language || 'pt-BR',
        timezone: user.timezone || 'America/Sao_Paulo'
      });
      setLoading(false);
    }
  }, [user]);

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    setError(null);
    try {
      // Buscar token CSRF
      const csrfResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL || '/'}expapi/v1/csrf-token`, { credentials: 'include' })
      const { csrfToken } = await csrfResponse.json();

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || '/'}expapi/v1/user/profile`, { credentials: 'include' })

      if (response.ok) {
        alert('Configurações salvas com sucesso!');
        // Atualizar dados do usuário no contexto
        await refreshUser();
      } else {
        const error = await response.json();
        setError(`Erro ao salvar configurações: ${error.error}`);
      }
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      setError('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setError(null);
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setError('A nova senha deve ter pelo menos 8 caracteres');
      return;
    }

    try {
      // Buscar token CSRF
      const csrfResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL || '/'}expapi/v1/csrf-token`, { credentials: 'include' })
      const { csrfToken } = await csrfResponse.json();

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || '/'}expapi/v1/user/set-password`, { credentials: 'include' })

      if (response.ok) {
        alert('Senha alterada com sucesso!');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        const error = await response.json();
        setError(`Erro ao alterar senha: ${error.error}`);
      }
    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      setError('Erro ao alterar senha');
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const copyAccountId = async () => {
    try {
      await navigator.clipboard.writeText(user.accountId);
      setCopiedAccountId(true);
      setTimeout(() => setCopiedAccountId(false), 2000);
    } catch (err) {
      console.error('Erro ao copiar ID:', err);
    }
  };

  if (loading || userLoading) {
    return <SettingsSkeleton />;
  }

  if (userError || !user) {
    return (
      <div className="max-w-4xl">
        <div className="bg-white border border-gray-200 rounded-lg p-8 sm:p-12 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-gray-900">
            Erro ao carregar configurações
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            {userError || 'Não foi possível carregar os dados do usuário.'}
          </p>
          <button
            type="button"
            onClick={() => refreshUser()}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
          >
            <ArrowPathIcon className="h-4 w-4" />
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 max-w-4xl">
      {/* Erro de mutação (salvar configs / alterar senha) */}
      {error && (
        <ErrorBanner error={error} />
      )}

      {/* Configurações de Notificação */}
      <div className="bg-white shadow-lg rounded-lg border border-gray-100">
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 bg-gray-50 rounded-t-lg">
          <div className="flex items-center">
            <BellIcon className="h-5 w-5 text-purple-500 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">Notificações</h3>
          </div>
          <p className="mt-1 text-sm text-gray-600">Configure como você deseja receber notificações</p>
        </div>
        <div className="px-4 sm:px-6 py-4 sm:py-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex-1">
              <label className="text-sm font-semibold text-gray-900">Notificações por Email</label>
              <p className="text-sm text-gray-600 mt-1">Receber notificações importantes por email</p>
            </div>
            <button
              type="button"
              onClick={() => handleSettingChange('emailNotifications', !settings.emailNotifications)}
              className={`${
                settings.emailNotifications ? 'bg-purple-600' : 'bg-gray-200'
              } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2`}
            >
              <span
                className={`${
                  settings.emailNotifications ? 'translate-x-5' : 'translate-x-0'
                } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
              />
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex-1">
              <label className="text-sm font-semibold text-gray-900">Notificações do Discord</label>
              <p className="text-sm text-gray-600 mt-1">Receber DMs do bot para alertas importantes</p>
            </div>
            <button
              type="button"
              onClick={() => handleSettingChange('discordNotifications', !settings.discordNotifications)}
              className={`${
                settings.discordNotifications ? 'bg-purple-600' : 'bg-gray-200'
              } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2`}
            >
              <span
                className={`${
                  settings.discordNotifications ? 'translate-x-5' : 'translate-x-0'
                } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
              />
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex-1">
              <label className="text-sm font-semibold text-gray-900">Alertas de Atividade do Bot</label>
              <p className="text-sm text-gray-600 mt-1">Notificações quando o bot fica offline/online</p>
            </div>
            <button
              type="button"
              onClick={() => handleSettingChange('botActivityAlerts', !settings.botActivityAlerts)}
              className={`${
                settings.botActivityAlerts ? 'bg-purple-600' : 'bg-gray-200'
              } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2`}
            >
              <span
                className={`${
                  settings.botActivityAlerts ? 'translate-x-5' : 'translate-x-0'
                } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Configurações de Privacidade */}
      <div className="bg-white shadow-lg rounded-lg border border-gray-100">
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 bg-gray-50 rounded-t-lg">
          <div className="flex items-center">
            <ShieldCheckIcon className="h-5 w-5 text-purple-500 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">Privacidade</h3>
          </div>
          <p className="mt-1 text-sm text-gray-600">Controle sua privacidade e visibilidade</p>
        </div>
        <div className="px-4 sm:px-6 py-4 sm:py-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex-1">
              <label className="text-sm font-semibold text-gray-900">Perfil Público</label>
              <p className="text-sm text-gray-600 mt-1">Permitir que outros usuários vejam seu perfil</p>
            </div>
            <button
              type="button"
              onClick={() => handleSettingChange('publicProfile', !settings.publicProfile)}
              className={`${
                settings.publicProfile ? 'bg-purple-600' : 'bg-gray-200'
              } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2`}
            >
              <span
                className={`${
                  settings.publicProfile ? 'translate-x-5' : 'translate-x-0'
                } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
              />
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex-1">
              <label className="text-sm font-semibold text-gray-900">Mostrar Status Online</label>
              <p className="text-sm text-gray-600 mt-1">Exibir quando você está online no dashboard</p>
            </div>
            <button
              type="button"
              onClick={() => handleSettingChange('showOnlineStatus', !settings.showOnlineStatus)}
              className={`${
                settings.showOnlineStatus ? 'bg-purple-600' : 'bg-gray-200'
              } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2`}
            >
              <span
                className={`${
                  settings.showOnlineStatus ? 'translate-x-5' : 'translate-x-0'
                } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Configurações Regionais */}
      <div className="bg-white shadow-lg rounded-lg border border-gray-100">
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 bg-gray-50 rounded-t-lg">
          <div className="flex items-center">
            <GlobeAltIcon className="h-5 w-5 text-purple-500 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">Configurações Regionais</h3>
          </div>
          <p className="mt-1 text-sm text-gray-600">Personalize idioma e fuso horário</p>
        </div>
        <div className="px-4 sm:px-6 py-4 sm:py-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-800">🌍 Idioma</label>
              <select
                value={settings.language}
                onChange={(e) => handleSettingChange('language', e.target.value)}
                className="block w-full px-4 py-3 text-base border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 sm:text-sm transition-all duration-200 bg-white"
              >
                <option value="pt-BR">🇧🇷 Português (Brasil)</option>
                <option value="en-US">🇺🇸 English (US)</option>
                <option value="es-ES">🇪🇸 Español</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-800">🕐 Fuso Horário</label>
              <select
                value={settings.timezone}
                onChange={(e) => handleSettingChange('timezone', e.target.value)}
                className="block w-full px-4 py-3 text-base border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 sm:text-sm transition-all duration-200 bg-white"
              >
                <option value="America/Sao_Paulo">São Paulo (UTC-3)</option>
                <option value="America/New_York">New York (UTC-5)</option>
                <option value="Europe/London">London (UTC+0)</option>
                <option value="Asia/Tokyo">Tokyo (UTC+9)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Alterar Senha */}
      {showSetPassword && (
      <SetPasswordModal
        onSuccess={() => setShowSetPassword(false)}
        onSkip={() => setShowSetPassword(false)}
      />
      )}
      <div className="bg-white shadow-lg rounded-lg border border-gray-100">
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-purple-100 rounded-t-lg">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            🔐 Alterar Senha
          </h3>
          <p className="mt-1 text-sm text-gray-600">Mantenha sua conta segura com uma senha forte</p>
        </div>
        <div className="px-4 sm:px-6 py-4 sm:py-6">
          <form onSubmit={handlePasswordChange} className="space-y-6">
            <div>
              <label className="block text-sm font-weight-600 text-gray-800 mb-2">Senha Atual</label>
              <div className="relative">
                <input
                  type={showPasswords.current ? 'text' : 'password'}
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                  className="block w-full px-4 py-3 border-2 border-gray-300 rounded-lg shadow-sm placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 sm:text-sm transition-all duration-200 bg-white"
                  placeholder="Digite sua senha atual"
                  required
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('current')}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center hover:bg-gray-50 rounded-r-lg transition-colors duration-200"
                >
                  {showPasswords.current ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-weight-600 text-gray-800 mb-2">Nova Senha</label>
              <div className="relative">
                <input
                  type={showPasswords.new ? 'text' : 'password'}
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  className="block w-full px-4 py-3 border-2 border-gray-300 rounded-lg shadow-sm placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 sm:text-sm transition-all duration-200 bg-white"
                  placeholder="Digite sua nova senha"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('new')}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center hover:bg-gray-50 rounded-r-lg transition-colors duration-200"
                >
                  {showPasswords.new ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                  )}
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                📋 <strong>Requisitos:</strong> Mínimo 8 caracteres, incluindo maiúscula, minúscula e número
              </p>
            </div>

            <div>
              <label className="block text-sm font-weight-600 text-gray-800 mb-2">Confirmar Nova Senha</label>
              <div className="relative">
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="block w-full px-4 py-3 border-2 border-gray-300 rounded-lg shadow-sm placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 sm:text-sm transition-all duration-200 bg-white"
                  placeholder="Confirme sua nova senha"
                  required
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('confirm')}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center hover:bg-gray-50 rounded-r-lg transition-colors duration-200"
                >
                  {showPasswords.confirm ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                  )}
                </button>
              </div>
              {passwordData.newPassword && passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && (
                <p className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                  ⚠️ As senhas não coincidem
                </p>
              )}
            </div>

            <div className="pt-4">
              <button
                type="submit"
                className="w-full sm:w-auto flex justify-center py-3 px-6 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={passwordData.newPassword !== passwordData.confirmPassword || !passwordData.currentPassword || !passwordData.newPassword}
              >
                🔒 Alterar Senha
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Botão Salvar Configurações */}
      <div className="flex flex-col sm:flex-row sm:justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-4">
        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Salvando...
            </>
          ) : (
            <>
              💾 Salvar Configurações
            </>
          )}
        </button>
      </div>

      {/* ID da Conta - Seção Oculta */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 shadow rounded-lg border border-gray-200">
        <div className="px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <div>
              <h4 className="text-sm font-medium text-gray-700 flex items-center">
                🔧 Informações Técnicas
              </h4>
              <p className="text-xs text-gray-500 mt-1">Dados para suporte técnico - Mantenha confidencial</p>
            </div>
            <button
              onClick={() => setShowAccountId(!showAccountId)}
              className="inline-flex items-center px-3 py-2 text-xs font-medium rounded-md text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200 shadow-sm"
            >
              {showAccountId ? (
                <>
                  <EyeSlashIcon className="h-3 w-3 mr-1" />
                  Ocultar ID
                </>
              ) : (
                <>
                  <EyeIcon className="h-3 w-3 mr-1" />
                  Mostrar ID
                </>
              )}
            </button>
          </div>
          
          {showAccountId && (
            <div className="mt-4 pt-4 border-t border-gray-300">
              <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-600 mb-2">ID da Conta</label>
                    <div className="bg-gray-100 rounded-md p-3 border">
                      <code className="text-sm font-mono text-gray-800 break-all">
                        {user?.accountId}
                      </code>
                    </div>
                  </div>
                  <div className="sm:ml-4">
                    <button
                      onClick={copyAccountId}
                      className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200"
                    >
                      {copiedAccountId ? (
                        <>
                          <CheckIcon className="h-4 w-4 mr-2 text-green-500" />
                          <span className="text-green-600">Copiado!</span>
                        </>
                      ) : (
                        <>
                          <ClipboardDocumentIcon className="h-4 w-4 mr-2" />
                          Copiar ID
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-xs text-yellow-800">
                    ⚠️ <strong>Importante:</strong> Este ID é único e confidencial. Compartilhe apenas com o suporte oficial.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
