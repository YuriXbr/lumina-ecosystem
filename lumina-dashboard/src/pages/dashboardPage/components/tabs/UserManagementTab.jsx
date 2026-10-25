import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import ServerPagination from '../../../../components/ui/ServerPagination';
import {API_BASE} from '../../../../utils/apiBase';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useUser } from '../../../../contexts/UserContext';
import { 
  UsersIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  ShieldCheckIcon,
  ShieldExclamationIcon,
  NoSymbolIcon,
  EyeIcon,
  XMarkIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import ErrorState from '../../../../components/ui/ErrorState';
import { SkeletonRow } from '../../../../components/ui/Skeleton';

export default function UserManagementTab() {
  const { user: currentUser, hasPermission, getUserLevel } = useUser();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingUser, setEditingUser] = useState(null);
  const usersPerPage = 10;
  const [hasMore, setHasMore] = useState(false);
  const requestIdRef = useRef(0);

  // Níveis de acesso
  const ACCESS_LEVELS = {
    user: { level: 0, name: 'Usuário' },
    vipUser: { level: 1, name: 'VIP' },
    enterpriseUser: { level: 2, name: 'Enterprise' },
    contentCreator: { level: 3, name: 'Content Creator' },
    tester: { level: 4, name: 'Tester' },
    support: { level: 5, name: 'Suporte' },
    moderator: { level: 6, name: 'Moderador' },
    admin: { level: 7, name: 'Admin' },
    headadmin: { level: 8, name: 'Head Admin' },
    developer: { level: 9, name: 'Developer' },
    coowner: { level: 10, name: 'Co-Owner' },
    owner: { level: 11, name: 'Owner' }
  };

  const loadUsers = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}expapi/v1/admin/users?page=${currentPage}&limit=${usersPerPage}&search=${encodeURIComponent(searchTerm)}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        let detail = `HTTP ${response.status}`;
        try {
          const body = await response.json();
          if (body?.error) detail = body.error;
        } catch { /* corpo não-JSON */ }
        throw new Error(detail);
      }

      const data = await response.json();
      if (requestId !== requestIdRef.current) return;
      setHasMore(!!data.pagination?.hasMore);
      const usersWithDiscordStatus = (data.users || []).map(user => ({
        ...user,
        firstName: typeof user.firstName === 'string' ? user.firstName : '',
        lastName: typeof user.lastName === 'string' ? user.lastName : '',
        email: typeof user.email === 'string' ? user.email : '',
        accountId: typeof user.accountId === 'string' ? user.accountId : '',
        discordLinked: !!(user.discordOauth2Id && user.discordOauth2Id.trim() !== '')
      }));
      setUsers(usersWithDiscordStatus);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      console.error('Erro ao carregar usuários:', err);
      setError(err.message);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [currentPage, searchTerm]);

  useEffect(() => {
    const timer = setTimeout(loadUsers, searchTerm ? 250 : 0);
    return () => { clearTimeout(timer); requestIdRef.current += 1; };
  }, [loadUsers, searchTerm]);

  const updateUser = async (userId, updateData) => {
    try {

      const csrfToken = await getCsrfToken();

      const response = await fetch(`${API_BASE}expapi/v1/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify(updateData),
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();

        await loadUsers();
        return true;
      } else {
        const contentType = response.headers.get('content-type');
        console.error('Erro na resposta - Content-Type:', contentType);
        
        if (contentType && contentType.includes('application/json')) {
          const error = await response.json();
          throw new Error(error.error || 'Erro ao atualizar usuário');
        } else {
          const text = await response.text();

          throw new Error(`Erro HTTP ${response.status}: Resposta inesperada do servidor`);
        }
      }
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      alert('Erro ao atualizar usuário: ' + error.message);
      return false;
    }
  };

  const getCsrfToken = async () => {
    try {
      const response = await fetch(`${API_BASE}expapi/v1/csrf-token`, { credentials: 'include' })
      if (response.ok) {
        const data = await response.json();
        return data.csrfToken;
      }
    } catch (error) {
      console.error('Erro ao obter CSRF token:', error);
    }
    return '';
  };

  const handlePromoteUser = async (userId, newAccessType) => {
    if (confirm(`Tem certeza que deseja alterar o nível de acesso deste usuário para ${ACCESS_LEVELS[newAccessType]?.name}?`)) {
      await updateUser(userId, { accessType: newAccessType });
    }
  };

  const handleBlockUser = async (userId, block = true) => {
    if (confirm(`Tem certeza que deseja ${block ? 'bloquear' : 'desbloquear'} este usuário?`)) {
      await updateUser(userId, { blocked: block });
    }
  };

  const handleBanUser = async (userId, ban = true) => {
    if (confirm(`Tem certeza que deseja ${ban ? 'banir' : 'desbanir'} este usuário?`)) {
      await updateUser(userId, { banned: ban });
    }
  };

  const openUserDetails = (user) => {
    setSelectedUser(user);
    setEditingUser({ ...user });
    setIsDetailModalOpen(true);
  };

  const closeUserDetails = () => {
    setSelectedUser(null);
    setEditingUser(null);
    setIsDetailModalOpen(false);
  };

  const saveUserChanges = async () => {
    if (!editingUser || !selectedUser) return;

    const changes = {};
    Object.keys(editingUser).forEach(key => {
      if (editingUser[key] !== selectedUser[key]) {
        changes[key] = editingUser[key];
      }
    });

    if (Object.keys(changes).length === 0) {
      closeUserDetails();
      return;
    }

    const success = await updateUser(selectedUser.accountId, changes);
    if (success) {
      closeUserDetails();
    }
  };

  const canEditField = (field, targetUser) => {
    if (!currentUser) return false;
    
    const currentLevel = getUserLevel()?.level || 0;
    const targetLevel = ACCESS_LEVELS[targetUser.accessType]?.level || 0;

    switch (field) {
      case 'blocked':
        return currentLevel >= 5 && targetLevel < 5;
      case 'banned':
      case 'emailNotifications':
      case 'discordNotifications':
      case 'botActivityAlerts':
        return currentLevel >= 6 && targetLevel < currentLevel;
      case 'accessType':
        return currentLevel >= 7 && targetLevel < currentLevel;
      case 'firstName':
      case 'lastName':
      case 'emailVerified':
        return currentLevel >= 8 && targetLevel < currentLevel;
      default:
        return false;
    }
  };

  const paginatedUsers = users;

  const getAccessLevelColor = (accessType) => {
    const level = ACCESS_LEVELS[accessType];
    if (!level) return 'bg-gray-100 text-gray-800';
    
    if (level.level >= 7) return 'bg-red-100 text-red-800';
    if (level.level >= 5) return 'bg-yellow-100 text-yellow-800';
    if (level.level >= 3) return 'bg-blue-100 text-blue-800';
    return 'bg-green-100 text-green-800';
  };

  // Modal de detalhes do usuário
  const renderUserDetailModal = () => {
    if (!selectedUser || !editingUser) return null;

    return (
      <Dialog open={isDetailModalOpen} onClose={closeUserDetails} className="relative z-50">
        <div className="fixed inset-0 bg-gray-900/50" aria-hidden="true" />
        <div className="fixed inset-0 overflow-y-auto p-4 sm:p-6"><div className="min-h-full flex items-center justify-center">
        <DialogPanel className="lumina-card w-full max-w-3xl p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <DialogTitle className="text-lg font-semibold text-gray-900">
              Detalhes do Usuário: {selectedUser.firstName} {selectedUser.lastName}
            </DialogTitle>
            <button
              aria-label="Fechar detalhes do usuário"
              onClick={closeUserDetails}
              className="lumina-icon-button text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nome */}
            <div>
              <label className="block text-sm font-medium text-gray-700" htmlFor="admin-user-firstName">Nome</label>
              <input
                type="text"
                id="admin-user-firstName"
                value={editingUser.firstName}
                onChange={(e) => setEditingUser({...editingUser, firstName: e.target.value})}
                disabled={!canEditField('firstName', selectedUser)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 disabled:bg-gray-100"
              />
            </div>

            {/* Sobrenome */}
            <div>
              <label className="block text-sm font-medium text-gray-700" htmlFor="admin-user-lastName">Sobrenome</label>
              <input
                type="text"
                id="admin-user-lastName"
                value={editingUser.lastName}
                onChange={(e) => setEditingUser({...editingUser, lastName: e.target.value})}
                disabled={!canEditField('lastName', selectedUser)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 disabled:bg-gray-100"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700" htmlFor="admin-user-email">Email</label>
              <input
                type="email"
                id="admin-user-email"
                value={editingUser.email}
                disabled
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100"
              />
            </div>

            {/* Nível de Acesso */}
            <div>
              <label className="block text-sm font-medium text-gray-700" htmlFor="admin-user-accessType">Nível de Acesso</label>
              <select
                id="admin-user-accessType"
                value={editingUser.accessType}
                onChange={(e) => setEditingUser({...editingUser, accessType: e.target.value})}
                disabled={!canEditField('accessType', selectedUser)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 disabled:bg-gray-100"
              >
                {Object.entries(ACCESS_LEVELS).filter(([key, level]) => key === editingUser.accessType || level.level < (getUserLevel()?.level || 0)).map(([key, level]) => (
                  <option key={key} value={key}>
                    {level.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Email Verificado */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="admin-user-emailVerified"
                checked={editingUser.emailVerified}
                onChange={(e) => setEditingUser({...editingUser, emailVerified: e.target.checked})}
                disabled={!canEditField('emailVerified', selectedUser)}
                className="h-4 w-4 text-purple-600 disabled:opacity-50"
              />
              <label className="ml-2 text-sm text-gray-700" htmlFor="admin-user-emailVerified">Email Verificado</label>
            </div>

            {/* Bloqueado */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="admin-user-blocked"
                checked={editingUser.blocked}
                onChange={(e) => setEditingUser({...editingUser, blocked: e.target.checked})}
                disabled={!canEditField('blocked', selectedUser)}
                className="h-4 w-4 text-purple-600 disabled:opacity-50"
              />
              <label className="ml-2 text-sm text-gray-700" htmlFor="admin-user-blocked">Bloqueado</label>
            </div>

            {/* Banido */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="admin-user-banned"
                checked={editingUser.banned}
                onChange={(e) => setEditingUser({...editingUser, banned: e.target.checked})}
                disabled={!canEditField('banned', selectedUser)}
                className="h-4 w-4 text-purple-600 disabled:opacity-50"
              />
              <label className="ml-2 text-sm text-gray-700" htmlFor="admin-user-banned">Banido</label>
            </div>

            {/* Discord Vinculado */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="admin-user-discordLinked"
                checked={editingUser.discordLinked}
                disabled
                className="h-4 w-4 text-purple-600 opacity-50"
              />
              <label className="ml-2 text-sm text-gray-700" htmlFor="admin-user-discordLinked">Discord Vinculado</label>
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={closeUserDetails}
              className="lumina-button-secondary"
            >
              Cancelar
            </button>
            <button
              onClick={saveUserChanges}
              className="lumina-button"
            >
              Salvar Alterações
            </button>
          </div>
        </DialogPanel>
        </div></div>
      </Dialog>
    );
  };

  if (loading && users.length === 0) {
    return (
      <div className="space-y-6">
        <div className="lumina-card">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <UsersIcon className="h-5 w-5 text-gray-400 mr-2" />
                <div className="h-5 w-48 bg-gray-200 rounded animate-pulse" />
              </div>
              <div className="h-9 w-48 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        </div>
        <div className="lumina-card overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuário</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nível de Acesso</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Último Login</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} columns={5} />)}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (error && users.length === 0) {
    return (
      <ErrorState
        title="Erro ao carregar usuários"
        message="Não foi possível carregar a lista de usuários do servidor."
        detail={error}
        onRetry={loadUsers}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Erro em refresh subsequente (mantém os dados antigos visíveis) */}
      {error && users.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-red-700">
            <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0" />
            <span>Falha ao atualizar: {error}</span>
          </div>
          <button
            onClick={loadUsers}
            className="inline-flex items-center gap-1 text-xs font-medium text-red-700 hover:text-red-900"
          >
            <ArrowPathIcon className="h-3.5 w-3.5" />
            Tentar novamente
          </button>
        </div>
      )}

      {/* Cabeçalho e Busca */}
      <div className="lumina-card">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center">
              <UsersIcon className="h-5 w-5 text-gray-400 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Gerenciamento de Usuários</h3>
              {loading && users.length > 0 && (
                <ArrowPathIcon className="ml-3 h-4 w-4 text-purple-600 animate-spin" />
              )}
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  aria-label="Buscar usuários"
                  placeholder="Buscar usuários..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabela de Usuários */}
      <div className="lumina-card overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Usuário
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nível de Acesso
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Último Login
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {!paginatedUsers.length && <tr><td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-500">Nenhum usuário encontrado.</td></tr>}
            {paginatedUsers.map((user) => (
              <tr key={user.accountId} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                        <span className="text-sm font-medium text-purple-600">
                          {user.firstName[0] || '?'}{user.lastName[0] || ''}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {user.firstName} {user.lastName}
                      </div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                      <div className="text-xs text-gray-400 font-mono">{user.accountId}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getAccessLevelColor(user.accessType)}`}>
                    {ACCESS_LEVELS[user.accessType]?.name || user.accessType}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col space-y-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.banned ? 'bg-red-100 text-red-800' :
                      user.blocked ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {user.banned ? 'Banido' : user.blocked ? 'Bloqueado' : 'Ativo'}
                    </span>
                    {!user.emailVerified && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                        Email não verificado
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.lastLogin && Number.isFinite(new Date(user.lastLogin).getTime()) ? new Date(user.lastLogin).toLocaleDateString('pt-BR') : '—'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center space-x-2">
                    {/* Botão de detalhes */}
                    <button
                      onClick={() => openUserDetails(user)}
                      className="lumina-icon-button text-purple-600 hover:text-purple-900"
                      title="Ver detalhes"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </button>

                    {/* Alteração de nível de acesso */}
                    {canEditField('accessType', user) && (
                      <div className="relative">
                        <select
                          onChange={(e) => {
                            if (e.target.value !== user.accessType) {
                              handlePromoteUser(user.accountId, e.target.value);
                            }
                          }}
                          aria-label={`Nível de acesso de ${user.email}`}
                          value={user.accessType}
                          className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-purple-500 focus:border-purple-500"
                        >
                          {Object.entries(ACCESS_LEVELS)
                            .filter(([key, level]) => level.level < (getUserLevel()?.level || 0))
                            .map(([key, level]) => (
                              <option key={key} value={key}>
                                {level.name}
                              </option>
                            ))}
                        </select>
                      </div>
                    )}
                    
                    {/* Botões de ação */}
                    {canEditField('blocked', user) && !user.blocked && !user.banned && (
                      <button
                        onClick={() => handleBlockUser(user.accountId, true)}
                        className="lumina-icon-button text-yellow-600 hover:text-yellow-900"
                        title="Bloquear usuário"
                      >
                        <ShieldExclamationIcon className="h-4 w-4" />
                      </button>
                    )}
                    
                    {canEditField('blocked', user) && user.blocked && !user.banned && (
                      <button
                        onClick={() => handleBlockUser(user.accountId, false)}
                        className="lumina-icon-button text-green-600 hover:text-green-900"
                        title="Desbloquear usuário"
                      >
                        <ShieldCheckIcon className="h-4 w-4" />
                      </button>
                    )}
                    
                    {canEditField('banned', user) && !user.banned && (
                      <button
                        onClick={() => handleBanUser(user.accountId, true)}
                        className="lumina-icon-button text-red-600 hover:text-red-900"
                        title="Banir usuário"
                      >
                        <NoSymbolIcon className="h-4 w-4" />
                      </button>
                    )}
                    
                    {canEditField('banned', user) && user.banned && (
                      <button
                        onClick={() => handleBanUser(user.accountId, false)}
                        className="lumina-icon-button text-blue-600 hover:text-blue-900"
                        title="Desbanir usuário"
                      >
                        <ShieldCheckIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ServerPagination page={currentPage} hasMore={hasMore} loading={loading} onChange={setCurrentPage} />

      {/* Modal de detalhes do usuário */}
      {isDetailModalOpen && renderUserDetailModal()}
    </div>
  );
}
