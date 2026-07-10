/* eslint-disable react/display-name */
import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from './contexts/UserContext';

/**
 * HOC que protege rotas exigindo autenticação.
 *
 * Usa o estado do UserContext (que por sua vez usa /session + cookie httpOnly).
 */
const withAuth = (Component) => {
  return (props) => {
    const { user, loading } = useUser();

    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-6 text-lg text-gray-600">Verificando autenticação...</p>
          </div>
        </div>
      );
    }

    if (!user) {
      return <Navigate to="/login" />;
    }

    return <Component {...props} />;
  };
};

/**
 * HOC que protege rotas exigindo uma permissão específica (além de auth).
 *
 * Uso:
 *   export default withPermission(AdminPage, 'console');
 *   export default withPermission(SettingsPage, 'settings');
 *
 * Permissões disponíveis (definidas em UserContext.ACCESS_LEVELS):
 *   profile, discord, settings, vip-features, enterprise-features,
 *   creator-tools, beta-features, user-management, tickets, moderation,
 *   metrics, guild-config, console, system-config, debug, all
 *
 * Se o usuário não tem a permissão, mostra tela de "Acesso restrito".
 * A verificação server-side (na API) é o gate real — este HOC é apenas UX.
 */
const ACCESS_LEVELS = {
  user: 0, vipUser: 1, enterpriseUser: 2, contentCreator: 3, tester: 4,
  support: 5, moderator: 6, admin: 7, headadmin: 8, developer: 9,
  coowner: 10, owner: 11,
};

const PERMISSION_BY_LEVEL = {
  0: ['profile', 'discord', 'settings'],
  1: ['profile', 'discord', 'settings', 'vip-features'],
  2: ['profile', 'discord', 'settings', 'enterprise-features'],
  3: ['profile', 'discord', 'settings', 'creator-tools'],
  4: ['profile', 'discord', 'settings', 'beta-features'],
  5: ['profile', 'discord', 'settings', 'user-management', 'tickets'],
  6: ['profile', 'discord', 'settings', 'user-management', 'moderation', 'metrics'],
  7: ['profile', 'discord', 'settings', 'user-management', 'moderation', 'metrics', 'guild-config', 'console'],
  8: ['profile', 'discord', 'settings', 'user-management', 'moderation', 'metrics', 'guild-config', 'console', 'system-config'],
  9: ['profile', 'discord', 'settings', 'user-management', 'moderation', 'metrics', 'guild-config', 'console', 'system-config', 'debug'],
  10: ['all'],
  11: ['all'],
};

export const withPermission = (Component, requiredPermission) => {
  return (props) => {
    const { user, loading } = useUser();

    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto"></div>
        </div>
      );
    }

    if (!user) {
      return <Navigate to="/login" />;
    }

    // Verifica permissão
    const level = ACCESS_LEVELS[user.accessType] ?? 0;
    const permissions = PERMISSION_BY_LEVEL[level] || [];
    const hasPermission = permissions.includes('all') || permissions.includes(requiredPermission);

    if (!hasPermission) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="bg-white border border-gray-200 rounded-lg p-8 max-w-md text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-gray-900">Acesso restrito</h3>
            <p className="text-sm text-gray-600 mt-1">
              Você não tem permissão para acessar esta página.
            </p>
            <a href="/members" className="mt-4 inline-block px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700">
              Voltar para Área de Membros
            </a>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
};

/**
 * HOC específico para rotas admin (level 7+).
 * Atalho para withPermission(Component, 'guild-config') que é a permissão
 * base de admin.
 */
export const withAdmin = (Component) => withPermission(Component, 'guild-config');

export default withAuth;
