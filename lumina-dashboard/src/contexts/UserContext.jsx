import { createContext, useContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { checkSession, apiLogout, API_BASE } from '../utils/apiFetch';

const UserContext = createContext();

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser deve ser usado dentro de um UserProvider');
  }
  return context;
};

// Definição dos níveis de acesso e suas permissões
const ACCESS_LEVELS = {
  user: {
    level: 0,
    name: 'Usuário',
    permissions: ['profile', 'discord', 'settings']
  },
  vipUser: {
    level: 1,
    name: 'VIP',
    permissions: ['profile', 'discord', 'settings', 'vip-features']
  },
  enterpriseUser: {
    level: 2,
    name: 'Enterprise',
    permissions: ['profile', 'discord', 'settings', 'enterprise-features']
  },
  contentCreator: {
    level: 3,
    name: 'Content Creator',
    permissions: ['profile', 'discord', 'settings', 'creator-tools']
  },
  tester: {
    level: 4,
    name: 'Tester',
    permissions: ['profile', 'discord', 'settings', 'beta-features']
  },
  support: {
    level: 5,
    name: 'Suporte',
    permissions: ['profile', 'discord', 'settings', 'user-management', 'tickets']
  },
  moderator: {
    level: 6,
    name: 'Moderador',
    permissions: ['profile', 'discord', 'settings', 'user-management', 'moderation', 'metrics']
  },
  admin: {
    level: 7,
    name: 'Admin',
    permissions: ['profile', 'discord', 'settings', 'user-management', 'moderation', 'metrics', 'guild-config', 'console']
  },
  headadmin: {
    level: 8,
    name: 'Head Admin',
    permissions: ['profile', 'discord', 'settings', 'user-management', 'moderation', 'metrics', 'guild-config', 'console', 'system-config']
  },
  developer: {
    level: 9,
    name: 'Developer',
    permissions: ['profile', 'discord', 'settings', 'user-management', 'moderation', 'metrics', 'guild-config', 'console', 'system-config', 'debug']
  },
  coowner: {
    level: 10,
    name: 'Co-Owner',
    permissions: ['all']
  },
  owner: {
    level: 11,
    name: 'Owner',
    permissions: ['all']
  }
};

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadUser = async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await checkSession();

      if (data.authenticated && data.user) {
        setUser(data.user);

        // Se tiver Discord vinculado, busca info adicional (avatar/username)
        // já que o perfil do banco pode não ter avatar atualizado
        if (data.user.discordOauth2Id) {
          try {
            const discordRes = await fetch(`${API_BASE}expapi/v1/discordinfo`, {
              credentials: 'include',
            });
            if (discordRes.ok) {
              const discordData = await discordRes.json();
              setUser(prevUser => prevUser ? ({
                ...prevUser,
                id: discordData.id,
                username: prevUser.username || discordData.username,
                avatar: discordData.avatar,
              }) : prevUser);
            }
          } catch (discordError) {
            console.warn('Erro ao buscar informações do Discord:', discordError);
          }
        }
      } else {
        setUser(null);
        if (data.reason) {
          setError(data.reason === 'ACCOUNT_BANNED' ? 'Conta banida.' : 'Conta bloqueada.');
        }
      }
    } catch (err) {
      console.error('Erro ao carregar usuário:', err);
      setUser(null);
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();

    // Escuta evento de 401 disparado pelo apiFetch
    const handleUnauthorized = () => {
      setUser(null);
      setError(null);
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);

    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  const hasPermission = (permission) => {
    if (!user) return false;
    const userLevel = ACCESS_LEVELS[user.accessType];
    if (!userLevel) return false;
    return userLevel.permissions.includes('all') || userLevel.permissions.includes(permission);
  };

  const isStaff = () => {
    if (!user) return false;
    const userLevel = ACCESS_LEVELS[user.accessType];
    return userLevel && userLevel.level >= 5;
  };

  const isAdmin = () => {
    if (!user) return false;
    const userLevel = ACCESS_LEVELS[user.accessType];
    return userLevel && userLevel.level >= 7;
  };

  const getUserLevel = () => {
    if (!user) return null;
    return ACCESS_LEVELS[user.accessType];
  };

  const refreshUser = async () => {
    await loadUser();
  };

  const logout = async () => {
    await apiLogout();
    setUser(null);
  };

  const onLoginSuccess = async (directUser = null) => {
    if (directUser) {
      // Se a API já retornou o user (ex: login response), usa diretamente
      setUser(directUser);
      setLoading(false);
      // Busca info do Discord em background se tiver vinculado
      if (directUser.discordOauth2Id) {
        try {
          const discordRes = await fetch(`${API_BASE}expapi/v1/discordinfo`, {
            credentials: 'include',
          });
          if (discordRes.ok) {
            const discordData = await discordRes.json();
            setUser(prevUser => prevUser ? ({
              ...prevUser,
              id: discordData.id,
              username: prevUser.username || discordData.username,
              avatar: discordData.avatar,
            }) : prevUser);
          }
        } catch {}
      }
    } else {
      await loadUser();
    }
  };

  const value = {
    user,
    loading,
    error,
    hasPermission,
    isStaff,
    isAdmin,
    getUserLevel,
    refreshUser,
    logout,
    onLoginSuccess,
    ACCESS_LEVELS
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

UserProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
