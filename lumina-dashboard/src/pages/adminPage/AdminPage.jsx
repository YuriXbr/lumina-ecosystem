import { useState } from 'react';
import { useUser } from '../../contexts/UserContext';
import AppShell from '../../components/AppShell';
import { ShieldCheckIcon } from '@heroicons/react/24/outline';

// Reutiliza as abas existentes do dashboard antigo
import MetricsTab from '../dashboardPage/components/tabs/MetricsTab';
import UserManagementTab from '../dashboardPage/components/tabs/UserManagementTab';
import GuildConfigTab from '../dashboardPage/components/tabs/GuildConfigTab';
import ConsoleTab from '../dashboardPage/components/tabs/ConsoleTab';
import LogsTab from '../dashboardPage/components/tabs/LogsTab';
import NewsAdminTab from './components/NewsAdminTab';

const ADMIN_TABS = [
  { id: 'metrics', label: 'Métricas',     icon: '📊', permission: 'metrics' },
  { id: 'users',   label: 'Usuários',     icon: '👥', permission: 'user-management' },
  { id: 'guilds',  label: 'Guildas',      icon: '🏰', permission: 'guild-config' },
  { id: 'news',    label: 'Novidades',    icon: '📰', permission: 'guild-config' },
  { id: 'logs',    label: 'Logs',         icon: '📋', permission: 'console' },
  { id: 'console', label: 'Console',      icon: '💻', permission: 'console' },
];

export default function AdminPage() {
  const { user, loading, hasPermission, isAdmin } = useUser();
  const [activeTab, setActiveTab] = useState('metrics');

  if (loading) {
    return (
      <AppShell title="Painel Administrativo">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
        </div>
      </AppShell>
    );
  }

  if (!user || !isAdmin()) {
    return (
      <AppShell title="Acesso restrito">
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center max-w-md mx-auto">
          <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <ShieldCheckIcon className="h-6 w-6 text-red-600" />
          </div>
          <h3 className="text-base font-semibold text-gray-900">Acesso restrito</h3>
          <p className="text-sm text-gray-600 mt-1">
            Você não tem permissão para acessar o painel administrativo.
          </p>
        </div>
      </AppShell>
    );
  }

  const availableTabs = ADMIN_TABS.filter(tab => hasPermission(tab.permission));

  const renderTab = () => {
    switch (activeTab) {
      case 'metrics': return <MetricsTab />;
      case 'users':   return <UserManagementTab />;
      case 'guilds':  return <GuildConfigTab />;
      case 'news':    return <NewsAdminTab />;
      case 'logs':    return <LogsTab />;
      case 'console': return <ConsoleTab />;
      default:        return <MetricsTab />;
    }
  };

  return (
    <AppShell maxWidth="max-w-7xl" title="Painel Administrativo" subtitle="Gerencie o bot, usuários e configurações do sistema">
      <div className="space-y-6">
        {/* Tabs (subheader visual) */}
        <div className="bg-white border border-gray-200 rounded-xl p-1 flex gap-1 overflow-x-auto">
          {availableTabs.map(tab => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                  active ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            );
          })}
        </div>

        {renderTab()}
      </div>
    </AppShell>
  );
}
