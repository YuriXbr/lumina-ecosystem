import { useState } from 'react';
import { useUser } from '../../contexts/UserContext';
import AppShell from '../../components/AppShell';
import { ShieldCheckIcon } from '@heroicons/react/24/outline';
import { useT } from '../../i18n/LanguageContext.jsx';

// Reutiliza as abas existentes do dashboard antigo
import MetricsTab from '../dashboardPage/components/tabs/MetricsTab';
import UserManagementTab from '../dashboardPage/components/tabs/UserManagementTab';
import GuildConfigTab from '../dashboardPage/components/tabs/GuildConfigTab';
import ConsoleTab from '../dashboardPage/components/tabs/ConsoleTab';
import LogsTab from '../dashboardPage/components/tabs/LogsTab';
import NewsAdminTab from './components/NewsAdminTab';
import AdminBadgesTab from './components/AdminBadgesTab';

const ADMIN_TABS = [
  { id: 'metrics', labelKey: 'admin.tabs.metrics',     icon: '📊', permission: 'metrics' },
  { id: 'users',   labelKey: 'admin.tabs.users',       icon: '👥', permission: 'user-management' },
  { id: 'guilds',  labelKey: 'admin.tabs.guilds',      icon: '🏰', permission: 'guild-config' },
  { id: 'badges',  labelKey: 'admin.tabs.badges',      icon: '🎖️', permission: 'guild-config' },
  { id: 'news',    labelKey: 'admin.tabs.news',        icon: '📰', permission: 'guild-config' },
  { id: 'logs',    labelKey: 'admin.tabs.logs',        icon: '📋', permission: 'console' },
  { id: 'console', labelKey: 'admin.tabs.console',     icon: '💻', permission: 'console' },
];

export default function AdminPage() {
  const t = useT();
  const { user, loading, hasPermission, isAdmin } = useUser();
  const [activeTab, setActiveTab] = useState('metrics');

  if (loading) {
    return (
      <AppShell title={t("admin.title")}>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
        </div>
      </AppShell>
    );
  }

  if (!user || !isAdmin()) {
    return (
      <AppShell title={t("common.accessDenied")}>
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center max-w-md mx-auto">
          <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <ShieldCheckIcon className="h-6 w-6 text-red-600" />
          </div>
          <h3 className="text-base font-semibold text-gray-900">{t("apiError.insufficientPermission")}</h3>
          <p className="text-sm text-gray-600 mt-1">
            {t("apiError.insufficientPermission")}
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
      case 'badges':  return <AdminBadgesTab />;
      case 'news':    return <NewsAdminTab />;
      case 'logs':    return <LogsTab />;
      case 'console': return <ConsoleTab />;
      default:        return <MetricsTab />;
    }
  };

  return (
    <AppShell maxWidth="max-w-7xl" title={t("admin.title")} subtitle={t("admin.subtitle")}>
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
                {t(tab.labelKey)}
              </button>
            );
          })}
        </div>

        {renderTab()}
      </div>
    </AppShell>
  );
}
