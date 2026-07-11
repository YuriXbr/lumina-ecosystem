import { useState } from 'react';
import { useUser } from '../../../../contexts/UserContext';
import { 
  CheckCircleIcon, 
  XCircleIcon,
  LinkIcon,
  NoSymbolIcon
} from '@heroicons/react/24/outline';

export default function ProfileTab() {
  const { user } = useUser();
  const [isLinking, setIsLinking] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);

  const getDiscordAvatarUrl = () => {
    console.log('ProfileTab getDiscordAvatarUrl chamado', { user });
    
    // Primeiro tenta campos diretos (usado no inventory page)
    if (user && user.avatar && user.id) {
      console.log('Avatar encontrado no ProfileTab (campos diretos):', `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`);
      return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`;
    }
    
    // Depois tenta campos do UserContext (discordOauth2Id + discordAvatar)
    if (user && user.discordAvatar && user.discordOauth2Id) {
      console.log('Avatar encontrado no ProfileTab (campos discord):', `https://cdn.discordapp.com/avatars/${user.discordOauth2Id}/${user.discordAvatar}.png`);
      return `https://cdn.discordapp.com/avatars/${user.discordOauth2Id}/${user.discordAvatar}.png`;
    }
    
    console.log('Usando avatar padrão no ProfileTab - user:', user);
    return 'https://static.vecteezy.com/system/resources/thumbnails/003/337/584/small/default-avatar-photo-placeholder-profile-icon-vector.jpg';
  };

const handleLinkDiscord = () => {
    setIsLinking(true);
    const origin = window.location.origin;
    const params = new URLSearchParams({ origin, intent: 'link' });
    if (token) params.set('linkToken', token);
    window.location.href = `${import.meta.env.VITE_API_BASE_URL}expapi/oauth2/discord/auth/start?${params}`;
};

  const handleUnlinkDiscord = async () => {
    setIsUnlinking(true);
    try {
      // Obter token CSRF
      const csrfResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}expapi/v1/csrf-token`, {
      
      let csrfToken = '';
      if (csrfResponse.ok) {
        const csrfData = await csrfResponse.json();
        csrfToken = csrfData.csrfToken;
      }

      // Deslinkar Discord
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}expapi/v1/unlink-discord`, { credentials: 'include' })
      
      if (response.ok) {
        const data = await response.json();
        alert('Discord deslinkado com sucesso!');
        // Recarregar dados do usuário
        window.location.reload();
      } else {
        const error = await response.json();
        alert('Erro ao deslinkar Discord: ' + (error.error || 'Erro desconhecido'));
      }
    } catch (error) {
      console.error('Erro ao deslinkar Discord:', error);
      alert('Erro ao deslincar Discord: ' + error.message);
    } finally {
      setIsUnlinking(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Informações Pessoais */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Informações Pessoais</h3>
        </div>
        <div className="px-4 sm:px-6 py-4">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Nome</dt>
              <dd className="mt-1 text-sm text-gray-900">{user.firstName}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Sobrenome</dt>
              <dd className="mt-1 text-sm text-gray-900">{user.lastName}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-gray-500">Email</dt>
              <dd className="mt-1 text-sm text-gray-900 flex items-center">
                {user.email}
                {user.emailVerified ? (
                  <CheckCircleIcon className="ml-2 h-4 w-4 text-green-500" />
                ) : (
                  <XCircleIcon className="ml-2 h-4 w-4 text-red-500" />
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Data de Registro</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(user.registrationDate).toLocaleDateString('pt-BR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Último Login</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(user.lastLogin).toLocaleDateString('pt-BR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Status da Conta */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Status da Conta</h3>
        </div>
        <div className="px-4 sm:px-6 py-4">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Email Verificado</dt>
              <dd className="mt-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  user.emailVerified 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {user.emailVerified ? 'Verificado' : 'Não Verificado'}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">2FA Ativado</dt>
              <dd className="mt-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  user.twoFactorAuth 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {user.twoFactorAuth ? 'Ativado' : 'Desativado'}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Status da Conta</dt>
              <dd className="mt-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  user.banned 
                    ? 'bg-red-100 text-red-800' 
                    : user.blocked 
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-green-100 text-green-800'
                }`}>
                  {user.banned ? 'Banido' : user.blocked ? 'Bloqueado' : 'Ativo'}
                </span>
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Integração Discord */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Integração Discord</h3>
        </div>
        <div className="px-4 sm:px-6 py-4">
          {user.discordOauth2Id ? (
            <div className="space-y-4">
              <div className="flex items-center">
                <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                <span className="text-sm text-gray-900">Discord conectado</span>
              </div>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Discord ID</dt>
                  <dd className="mt-1 text-sm text-gray-900 font-mono">{user.discordOauth2Id}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Token Expira em</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {user.discordOauth2TokenExpiresAt 
                      ? new Date(user.discordOauth2TokenExpiresAt).toLocaleDateString('pt-BR')
                      : 'Não definido'
                    }
                  </dd>
                </div>
              </dl>
              <div className="mt-4">
                <button
                  onClick={handleUnlinkDiscord}
                  disabled={isUnlinking}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                >
                  <NoSymbolIcon className="h-4 w-4 mr-2" />
                  {isUnlinking ? 'Deslinkando...' : 'Deslinkar Discord'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center">
                <XCircleIcon className="h-5 w-5 text-red-500 mr-2" />
                <span className="text-sm text-gray-900">Discord não conectado</span>
              </div>
              <p className="text-sm text-gray-500">
                Conecte sua conta Discord para usar todos os recursos do Lumina Bot.
              </p>
              <button
                onClick={handleLinkDiscord}
                disabled={isLinking}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
              >
                <LinkIcon className="h-4 w-4 mr-2" />
                {isLinking ? 'Conectando...' : 'Conectar Discord'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
