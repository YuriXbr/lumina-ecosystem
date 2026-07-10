import { useState, useEffect } from 'react';
import { useUser } from '../../../contexts/UserContext';
import { 
  UserIcon, 
  Cog6ToothIcon, 
  ShieldCheckIcon,
  UsersIcon,
  ChartBarIcon,
  CommandLineIcon,
  ServerIcon,
  ArrowRightOnRectangleIcon,
  HomeIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

// Componentes das abas
import ProfileTab from './tabs/ProfileTab';
import SettingsTab from './tabs/SettingsTab';
import UserManagementTab from './tabs/UserManagementTab';
import MetricsTab from './tabs/MetricsTab';
import GuildConfigTab from './tabs/GuildConfigTab';
import ConsoleTab from './tabs/ConsoleTab';
import LogsTab from './tabs/LogsTab';

export default function DashboardTabs() {
  const { user, loading, error, hasPermission, isStaff, getUserLevel, logout } = useUser();
  const [activeTab, setActiveTab] = useState('profile');
  const [openSetupPasswordModal, setOpenSetupPasswordModal] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get('setupPassword') === '1') {
      setActiveTab('settings');
      setOpenSetupPasswordModal(true);

      // Remove o parâmetro da URL para evitar reabrir ao atualizar
      window.history.replaceState(
        {},
        '',
        window.location.pathname
      );
    }
  }, []);

  const getDiscordAvatarUrl = () => {
    // Primeiro tenta campos diretos (usado no inventory page)
    if (user && user.avatar && user.id) {
      return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`;
    }

    // Depois tenta campos do UserContext (discordOauth2Id + discordAvatar)
    if (user && user.discordAvatar && user.discordOauth2Id) {
      return `https://cdn.discordapp.com/avatars/${user.discordOauth2Id}/${user.discordAvatar}.png`;
    }

    return 'https://static.vecteezy.com/system/resources/thumbnails/003/337/584/small/default-avatar-photo-placeholder-profile-icon-vector.jpg';
  };

  const handleLogout = () => {
    if (confirm('Tem certeza que deseja sair?')) {
      logout();
      window.location.href = '/login';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-6 text-lg text-gray-600">Carregando dados do usuário...</p>
          <p className="mt-2 text-sm text-gray-500">Por favor, aguarde um momento</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Erro ao carregar dados</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <div className="space-y-2">
            <button 
              onClick={() => window.location.reload()} 
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200"
            >
              Tentar Novamente
            </button>
            <button 
              onClick={() => window.location.href = '/login'} 
              className="w-full px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors duration-200"
            >
              Voltar ao Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-gray-400 text-4xl mb-4">👤</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Acesso Negado</h2>
          <p className="text-gray-600 mb-4">Você precisa estar logado para acessar o dashboard</p>
          <button 
            onClick={() => window.location.href = '/login'} 
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200"
          >
            Fazer Login
          </button>
        </div>
      </div>
    );
  }

  const userLevel = getUserLevel();

  // Definir abas disponíveis baseado nas permissões
  const availableTabs = [
    {
      id: 'profile',
      name: 'Perfil',
      icon: UserIcon,
      permission: 'profile'
    },
    {
      id: 'settings',
      name: 'Configurações',
      icon: Cog6ToothIcon,
      permission: 'settings'
    },
    // Abas para staff
    ...(isStaff() ? [
      {
        id: 'metrics',
        name: 'Métricas',
        icon: ChartBarIcon,
        permission: 'metrics'
      },
      {
        id: 'users',
        name: 'Usuários',
        icon: UsersIcon,
        permission: 'user-management'
      }
    ] : []),
    // Aba de Logs — apenas admins (level 7+) têm permissão 'console'
    // Reutilizamos a permissão 'console' que já existe no ACCESS_LEVELS para admin+
    ...(hasPermission('console') ? [
      {
        id: 'logs',
        name: 'Logs',
        icon: DocumentTextIcon,
        permission: 'console'
      }
    ] : []),
    // Abas para admins
    ...(hasPermission('guild-config') ? [
      {
        id: 'guilds',
        name: 'Guildas',
        icon: ServerIcon,
        permission: 'guild-config'
      }
    ] : []),
    ...(hasPermission('console') ? [
      {
        id: 'console',
        name: 'Console',
        icon: CommandLineIcon,
        permission: 'console'
      }
    ] : [])
  ].filter(tab => hasPermission(tab.permission));

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfileTab />;
      case 'settings':
        return (
                <SettingsTab
                  openSetupPasswordModal={openSetupPasswordModal}
                  setOpenSetupPasswordModal={setOpenSetupPasswordModal}
                />
          );
      case 'metrics':
        return <MetricsTab />;
      case 'users':
        return <UserManagementTab />;
      case 'guilds':
        return <GuildConfigTab />;
      case 'console':
        return <ConsoleTab />;
      case 'logs':
        return <LogsTab />;
      default:
        return <ProfileTab />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header com informações do usuário */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4 sm:py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <img
                    className="h-10 w-10 sm:h-12 sm:w-12 rounded-full"
                    src={getDiscordAvatarUrl()}
                    alt={`${user.firstName} ${user.lastName}`}
                    onError={(e) => {
                      e.target.src = 'https://static.vecteezy.com/system/resources/thumbnails/003/337/584/small/default-avatar-photo-placeholder-profile-icon-vector.jpg';
                    }}
                  />
                </div>
                <div className="ml-3 sm:ml-4">
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                    {user.firstName} {user.lastName}
                  </h1>
                  <p className="text-sm text-gray-500">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      userLevel.level >= 7 ? 'bg-red-100 text-red-800' :
                      userLevel.level >= 5 ? 'bg-yellow-100 text-yellow-800' :
                      userLevel.level >= 3 ? 'bg-blue-100 text-blue-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {userLevel.name}
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between sm:justify-end space-x-3">
                <div className="text-left sm:text-right">
                  <p className="text-sm text-gray-500">Último login</p>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(user.lastLogin).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <a
                  href="/"
                  title="Voltar para o site"
                  className="inline-flex items-center justify-center p-2 border border-gray-300 shadow-sm rounded-md text-gray-500 bg-white hover:bg-gray-50 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
                >
                  <HomeIcon className="h-4 w-4" />
                </a>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                >
                  <ArrowRightOnRectangleIcon className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Sair</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navegação das abas */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="-mb-px flex overflow-x-auto space-x-4 sm:space-x-8" aria-label="Tabs">
            {availableTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`${
                    activeTab === tab.id
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center flex-shrink-0`}
                >
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Conteúdo da aba ativa */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {renderTabContent()}
      </div>
    </div>
  );
}
