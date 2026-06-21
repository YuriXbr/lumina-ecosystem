import { createContext, useContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';

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
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      // Buscar dados reais do usuário via API
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}expapi/v1/user/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        
        // Buscar informações do Discord após carregar o perfil do usuário
        try {
          const discordResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}expapi/v1/discordinfo`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (discordResponse.ok) {
            const discordData = await discordResponse.json();
            // Atualizar usuário com dados do Discord
            setUser(prevUser => ({
              ...prevUser,
              id: discordData.id,
              username: discordData.username,
              avatar: discordData.avatar
            }));
          } else {
            console.warn('Informações do Discord não disponíveis');
          }
        } catch (discordError) {
          console.warn('Erro ao buscar informações do Discord:', discordError);
        }
      } else if (response.status === 401) {
        // Token inválido, remover e redirecionar para login
        localStorage.removeItem('token');
        setUser(null);
        setError('Token inválido. Faça login novamente.');
      } else {
        console.error('Erro ao buscar dados do usuário:', response.status);
        setError('Erro ao carregar dados do usuário');
      }
    } catch (error) {
      console.error('Erro ao carregar usuário:', error);
      // Em caso de erro de rede, usar dados mockados temporariamente para desenvolvimento
      if (process.env.NODE_ENV === 'development') {
        console.warn('Usando dados mockados devido a erro de rede');
        setUser({
          accountId: "dev-mock-id",
          firstName: "Usuário",
          lastName: "Teste",
          email: "teste@test.com",
          accessType: "admin",
          emailVerified: true,
          discordOauth2Id: "123456789",
          discordAvatar: "a1b2c3d4e5f6g7h8i9j0",
          // Campos para compatibilidade com inventory page
          id: "123456789",
          avatar: "a1b2c3d4e5f6g7h8i9j0",
          registrationDate: new Date(),
          lastLogin: new Date(),
          blocked: false,
          banned: false,
          emailNotifications: true,
          discordNotifications: true,
          botActivityAlerts: false,
          publicProfile: false,
          showOnlineStatus: true,
          language: 'pt-BR',
          timezone: 'America/Sao_Paulo'
        });
      } else {
        localStorage.removeItem('token');
        setUser(null);
        setError('Erro de conexão. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
    
    // Listen for storage changes (when token is set in another tab/component)
    const handleStorageChange = (e) => {
      if (e.key === 'token') {
        if (e.newValue) {
          // Token was added, reload user
          loadUser();
        } else {
          // Token was removed, clear user
          setUser(null);
          setLoading(false);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
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
    return userLevel && userLevel.level >= 5; // support e acima
  };

  const isAdmin = () => {
    if (!user) return false;
    const userLevel = ACCESS_LEVELS[user.accessType];
    return userLevel && userLevel.level >= 7; // admin e acima
  };

  const getUserLevel = () => {
    if (!user) return null;
    return ACCESS_LEVELS[user.accessType];
  };

  const refreshUser = async () => {
    await loadUser();
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  // Função para ser chamada após login bem-sucedido
  const onLoginSuccess = async () => {
    await loadUser();
  };

  const value = {
    user,
    setUser,
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
