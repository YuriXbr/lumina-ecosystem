import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { checkSession, apiLogout, resetCsrfToken } from '../utils/apiFetch';

export const UserContext = createContext();

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser deve ser usado dentro de um UserProvider');
  }
  return context;
};

// Definição dos níveis de acesso e suas permissões
export const ACCESS_LEVELS = {
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
  const [user,setUser]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState(null);
  const generation=useRef(0);
  const loadUser=useCallback(async()=>{
    const current=++generation.current;
    setError(null);setLoading(true);
    try {
      const data=await checkSession();
      if(current!==generation.current)return null;
      const next=data.authenticated?data.user:null;
      setUser(next);
      if(data.reason)setError(data.reason==='ACCOUNT_BANNED'?'Conta banida.':'Conta bloqueada.');
      return next;
    }catch(err){if(current===generation.current)setError('Não foi possível verificar sua sessão. Tente novamente.');throw err;}
    finally {if(current===generation.current)setLoading(false);}
  },[]);
  useEffect(()=>{
    loadUser().catch(()=>{});
    const unauthorized=()=>{++generation.current;setUser(null);setError(null);setLoading(false);resetCsrfToken();};
    window.addEventListener('auth:unauthorized',unauthorized);
    return()=>{++generation.current;window.removeEventListener('auth:unauthorized',unauthorized);};
  },[loadUser]);
  const logout=useCallback(async()=>{await apiLogout();++generation.current;setUser(null);setError(null);},[]);
  const onLoginSuccess=useCallback(async(directUser=null)=>{
    resetCsrfToken();
    if(!directUser)return loadUser();
    ++generation.current;setUser(directUser);setError(null);setLoading(false);return directUser;
  },[loadUser]);
  const value=useMemo(()=>({user,loading,error,refreshUser:loadUser,logout,onLoginSuccess,ACCESS_LEVELS,
    hasPermission:permission=>!!user&&(ACCESS_LEVELS[user.accessType]?.permissions||[]).some(p=>p==='all'||p===permission),
    isStaff:()=>!!user&&(ACCESS_LEVELS[user.accessType]?.level||0)>=5,
    isAdmin:()=>!!user&&(ACCESS_LEVELS[user.accessType]?.level||0)>=7,
    getUserLevel:()=>user?ACCESS_LEVELS[user.accessType]||null:null,
  }),[user,loading,error,loadUser,logout,onLoginSuccess]);
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
UserProvider.propTypes={children:PropTypes.node.isRequired};
