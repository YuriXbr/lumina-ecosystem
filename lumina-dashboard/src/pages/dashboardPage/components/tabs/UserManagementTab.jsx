import { useState, useEffect, useCallback } from 'react';
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
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import ErrorState from '../../../../components/ui/ErrorState';
import ErrorBanner from '../../../../components/ui/ErrorBanner';
import { SkeletonRow } from '../../../../components/ui/Skeleton';

export default function UserManagementTab() {
  const { user: currentUser, hasPermission, getUserLevel } = useUser();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updateError, setUpdateError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingUser, setEditingUser] = useState(null);
  const usersPerPage = 10;

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
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}expapi/v1/admin/users?page=${currentPage}&limit=${usersPerPage}&search=${encodeURIComponent(searchTerm)}`, {
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
      const usersWithDiscordStatus = (data.users || []).map(user => ({
        ...user,
        discordLinked: !!(user.discordOauth2Id && user.discordOauth2Id.trim() !== '')
      }));
      setUsers(usersWithDiscordStatus);
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const updateUser = async (userId, updateData) => {
    setUpdateError(null);
    try {
      console.log('Iniciando atualização do usuário:', userId, updateData);
      
      const csrfToken = await getCsrfToken();
      console.log('CSRF Token obtido:', csrfToken);
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}expapi/v1/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify(updateData),
        credentials: 'include',
      });

      console.log('Response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('Sucesso na atualização:', result);
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
          console.error('Resposta não-JSON:', text);
          throw new Error(`Erro HTTP ${response.status}: Resposta inesperada do servidor`);
        }
      }
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      setUpdateError('Erro ao atualizar usuário: ' + error.message);
      return false;
    }
  };

  const getCsrfToken = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}expapi/v1/csrf-token`, { credentials: 'include' })
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

  const filteredUsers = users.filter(user =>
    user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.accountId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const startIndex = (currentPage - 1) * usersPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + usersPerPage);

  const getAccessLevelColor = (accessType) => {
    const level = ACCESS_LEVELS[accessType];
    if (!level) return 'bg-gray-100 text-gray-800';
    
    if (level.level >= 7) return 'bg-red-100 text-red-800';
    if (level.level >= 5) return 'bg-yellow-100 text-yellow-800';
    if (level.level >= 3) return 'bg-blue-100 text-blue-800';
    return 'bg-green-100 text-green-800';
  };

  // Modal de detalhes do usuário
  const UserDetailModal = () => {
    if (!selectedUser || !editingUser) return null;

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Detalhes do Usuário: {selectedUser.firstName} {selectedUser.lastName}
            </h3>
            <button
              onClick={closeUserDetails}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nome */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Nome</label>
              <input
                type="text"
                value={editingUser.firstName}
                onChange={(e) => setEditingUser({...editingUser, firstName: e.target.value})}
                disabled={!canEditField('firstName', selectedUser)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 disabled:bg-gray-100"
              />
            </div>

            {/* Sobrenome */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Sobrenome</label>
              <input
                type="text"
                value={editingUser.lastName}
                onChange={(e) => setEditingUser({...editingUser, lastName: e.target.value})}
                disabled={!canEditField('lastName', selectedUser)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 disabled:bg-gray-100"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={editingUser.email}
                disabled
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100"
              />
            </div>

            {/* Nível de Acesso */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Nível de Acesso</label>
              <select
                value={editingUser.accessType}
                onChange={(e) => setEditingUser({...editingUser, accessType: e.target.value})}
                disabled={!canEditField('accessType', selectedUser)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 disabled:bg-gray-100"
              >
                {Object.entries(ACCESS_LEVELS).map(([key, level]) => (
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
                checked={editingUser.emailVerified}
                onChange={(e) => setEditingUser({...editingUser, emailVerified: e.target.checked})}
                disabled={!canEditField('emailVerified', selectedUser)}
                className="h-4 w-4 text-purple-600 disabled:opacity-50"
              />
              <label className="ml-2 text-sm text-gray-700">Email Verificado</label>
            </div>

            {/* Bloqueado */}
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={editingUser.blocked}
                onChange={(e) => setEditingUser({...editingUser, blocked: e.target.checked})}
                disabled={!canEditField('blocked', selectedUser)}
                className="h-4 w-4 text-purple-600 disabled:opacity-50"
              />
              <label className="ml-2 text-sm text-gray-700">Bloqueado</label>
            </div>

            {/* Banido */}
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={editingUser.banned}
                onChange={(e) => setEditingUser({...editingUser, banned: e.target.checked})}
                disabled={!canEditField('banned', selectedUser)}
                className="h-4 w-4 text-purple-600 disabled:opacity-50"
              />
              <label className="ml-2 text-sm text-gray-700">Banido</label>
            </div>

            {/* Discord Vinculado */}
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={editingUser.discordLinked}
                disabled
                className="h-4 w-4 text-purple-600 opacity-50"
              />
              <label className="ml-2 text-sm text-gray-700">Discord Vinculado</label>
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={closeUserDetails}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={saveUserChanges}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700"
            >
              Salvar Alterações
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading && users.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-white shadow rounded-lg">
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
        <div className="bg-white shadow rounded-lg overflow-hidden">
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
        <ErrorBanner error={`Falha ao atualizar: ${error}`} onRetry={loadUsers} />
      )}

      {/* Erro em mutações (update/promote/block/ban) */}
      {updateError && (
        <ErrorBanner error={updateError} />
      )}

      {/* Cabeçalho e Busca */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
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
      <div className="bg-white shadow rounded-lg overflow-hidden">
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
            {paginatedUsers.map((user) => (
              <tr key={user.accountId} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                        <span className="text-sm font-medium text-purple-600">
                          {user.firstName[0]}{user.lastName[0]}
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
                  {new Date(user.lastLogin).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center space-x-2">
                    {/* Botão de detalhes */}
                    <button
                      onClick={() => openUserDetails(user)}
                      className="text-purple-600 hover:text-purple-900"
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
                        className="text-yellow-600 hover:text-yellow-900"
                        title="Bloquear usuário"
                      >
                        <ShieldExclamationIcon className="h-4 w-4" />
                      </button>
                    )}
                    
                    {canEditField('blocked', user) && user.blocked && !user.banned && (
                      <button
                        onClick={() => handleBlockUser(user.accountId, false)}
                        className="text-green-600 hover:text-green-900"
                        title="Desbloquear usuário"
                      >
                        <ShieldCheckIcon className="h-4 w-4" />
                      </button>
                    )}
                    
                    {canEditField('banned', user) && !user.banned && (
                      <button
                        onClick={() => handleBanUser(user.accountId, true)}
                        className="text-red-600 hover:text-red-900"
                        title="Banir usuário"
                      >
                        <NoSymbolIcon className="h-4 w-4" />
                      </button>
                    )}
                    
                    {canEditField('banned', user) && user.banned && (
                      <button
                        onClick={() => handleBanUser(user.accountId, false)}
                        className="text-blue-600 hover:text-blue-900"
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

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 rounded-lg shadow">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Próximo
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Mostrando <span className="font-medium">{startIndex + 1}</span> a{' '}
                <span className="font-medium">
                  {Math.min(startIndex + usersPerPage, filteredUsers.length)}
                </span>{' '}
                de <span className="font-medium">{filteredUsers.length}</span> usuários
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                      page === currentPage
                        ? 'z-10 bg-purple-50 border-purple-500 text-purple-600'
                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Modal de detalhes do usuário */}
      {isDetailModalOpen && <UserDetailModal />}
    </div>
  );
}
