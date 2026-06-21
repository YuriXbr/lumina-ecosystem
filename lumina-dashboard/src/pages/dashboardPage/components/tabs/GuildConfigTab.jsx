import { useState, useEffect } from 'react';
import { useUser } from '../../../../contexts/UserContext';
import { 
  ServerIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  XMarkIcon,
  CheckIcon,
  XMarkIcon as XIcon
} from '@heroicons/react/24/outline';

export default function GuildConfigTab() {
  const { user: currentUser, getUserLevel } = useUser();
  const [guilds, setGuilds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGuild, setSelectedGuild] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editingGuild, setEditingGuild] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [updatingMembers, setUpdatingMembers] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const guildsPerPage = 10;

  useEffect(() => {
    loadGuilds();
  }, [currentPage, searchTerm]);

  // Atualizar dados do Discord automaticamente após carregar guildas
  useEffect(() => {
    if (guilds.length > 0 && !updatingMembers && !loading) {
      const timer = setTimeout(() => {
        updateMemberCounts();
      }, 1000); // Aguarda 1 segundo para garantir que os dados foram processados
      
      return () => clearTimeout(timer);
    }
  }, [guilds.length, loading]); // Depende do loading também

  // Função para buscar dados da guilda da API oficial do Discord
  const fetchDiscordGuildData = async (guildId) => {
    try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}expapi/v1/discord/guild/${guildId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          return {
            memberCount: data.member_count || data.approximate_member_count,
            icon: data.icon
          };
        }
    } catch (error) {
      console.error(`Erro ao buscar dados do Discord para guilda ${guildId}:`, error);
      return null;
    }
  };

  const loadGuilds = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}expapi/v1/admin/guilds?page=${currentPage}&limit=${guildsPerPage}&search=${encodeURIComponent(searchTerm)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setGuilds(data.guilds || []);
      } else {
        console.error('Erro ao carregar guildas:', response.status);
      }
    } catch (error) {
      console.error('Erro ao carregar guildas:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateGuild = async (guildId, updateData) => {
    try {
      console.log('Iniciando atualização da guilda:', guildId, updateData);
      
      const csrfToken = await getCsrfToken();
      console.log('CSRF Token obtido:', csrfToken);
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}expapi/v1/admin/guilds/${guildId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify(updateData)
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      if (response.ok) {
        const result = await response.json();
        console.log('Sucesso na atualização:', result);
        await loadGuilds();
        return true;
      } else {
        const contentType = response.headers.get('content-type');
        console.error('Erro na resposta - Content-Type:', contentType);
        
        if (contentType && contentType.includes('application/json')) {
          const error = await response.json();
          throw new Error(error.error || 'Erro ao atualizar guilda');
        } else {
          const text = await response.text();
          console.error('Resposta não-JSON:', text);
          throw new Error(`Erro HTTP ${response.status}: Resposta inesperada do servidor`);
        }
      }
    } catch (error) {
      console.error('Erro ao atualizar guilda:', error);
      alert('Erro ao atualizar guilda: ' + error.message);
      return false;
    }
  };

  const getCsrfToken = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}expapi/v1/csrf-token`, {
        method: 'GET',
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        return data.csrfToken;
      }
    } catch (error) {
      console.error('Erro ao obter CSRF token:', error);
    }
    return '';
  };

  const openGuildDetails = (guild) => {
    setSelectedGuild(guild);
    setEditingGuild({ ...guild });
    setIsDetailModalOpen(true);
  };

  const closeGuildDetails = () => {
    setSelectedGuild(null);
    setEditingGuild(null);
    setIsDetailModalOpen(false);
  };

  const saveGuildChanges = async () => {
    if (!editingGuild || !selectedGuild) return;

    const changes = {};
    Object.keys(editingGuild).forEach(key => {
      if (editingGuild[key] !== selectedGuild[key]) {
        changes[key] = editingGuild[key];
      }
    });

    if (Object.keys(changes).length === 0) {
      closeGuildDetails();
      return;
    }

    const success = await updateGuild(selectedGuild.guildId, changes);
    if (success) {
      closeGuildDetails();
    }
  };

  const canEditField = (field) => {
    if (!currentUser) return false;
    
    const currentLevel = getUserLevel()?.level || 0;

    switch (field) {
      case 'botEnabled':
      case 'welcomeEnabled':
      case 'moderationEnabled':
      case 'musicEnabled':
      case 'levelSystemEnabled':
        return currentLevel >= 7; // Admin+
      case 'welcomeChannelId':
      case 'moderationChannelId':
      case 'prefix':
      case 'language':
        return currentLevel >= 8; // HeadAdmin+
      case 'customCommands':
      case 'antiSpamEnabled':
      case 'antiLinkEnabled':
        return currentLevel >= 9; // Developer+
      default:
        return false;
    }
  };

  const filteredGuilds = guilds.filter(guild =>
    guild.guildName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    guild.guildId.includes(searchTerm)
  );

  const totalPages = Math.ceil(filteredGuilds.length / guildsPerPage);
  const startIndex = (currentPage - 1) * guildsPerPage;
  const paginatedGuilds = filteredGuilds.slice(startIndex, startIndex + guildsPerPage);

  // Modal de detalhes da guilda
  const GuildDetailModal = () => {
    if (!selectedGuild || !editingGuild) return null;

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 shadow-lg rounded-md bg-white max-h-screen overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Configurações: {selectedGuild.guildName}
            </h3>
            <button
              onClick={closeGuildDetails}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Informações básicas */}
            <div className="col-span-full">
              <h4 className="text-md font-medium text-gray-900 mb-3">Informações Básicas</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">ID da Guilda</label>
                  <input
                    type="text"
                    value={selectedGuild.guildId}
                    disabled
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Membros</label>
                  <input
                    type="number"
                    value={selectedGuild.memberCount}
                    disabled
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100"
                  />
                </div>
              </div>
            </div>

            {/* Configurações do Bot */}
            <div className="col-span-full">
              <h4 className="text-md font-medium text-gray-900 mb-3">Configurações do Bot</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editingGuild.botEnabled}
                    onChange={(e) => setEditingGuild({...editingGuild, botEnabled: e.target.checked})}
                    disabled={!canEditField('botEnabled')}
                    className="h-4 w-4 text-purple-600 disabled:opacity-50"
                  />
                  <label className="ml-2 text-sm text-gray-700">Bot Ativo</label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editingGuild.welcomeEnabled}
                    onChange={(e) => setEditingGuild({...editingGuild, welcomeEnabled: e.target.checked})}
                    disabled={!canEditField('welcomeEnabled')}
                    className="h-4 w-4 text-purple-600 disabled:opacity-50"
                  />
                  <label className="ml-2 text-sm text-gray-700">Boas-vindas</label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editingGuild.moderationEnabled}
                    onChange={(e) => setEditingGuild({...editingGuild, moderationEnabled: e.target.checked})}
                    disabled={!canEditField('moderationEnabled')}
                    className="h-4 w-4 text-purple-600 disabled:opacity-50"
                  />
                  <label className="ml-2 text-sm text-gray-700">Moderação</label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editingGuild.musicEnabled}
                    onChange={(e) => setEditingGuild({...editingGuild, musicEnabled: e.target.checked})}
                    disabled={!canEditField('musicEnabled')}
                    className="h-4 w-4 text-purple-600 disabled:opacity-50"
                  />
                  <label className="ml-2 text-sm text-gray-700">Música</label>
                </div>
              </div>
            </div>

            {/* Configurações avançadas (apenas para HeadAdmin+) */}
            {canEditField('prefix') && (
              <div className="col-span-full">
                <h4 className="text-md font-medium text-gray-900 mb-3">Configurações Avançadas</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Prefixo</label>
                    <input
                      type="text"
                      value={editingGuild.prefix || '!'}
                      onChange={(e) => setEditingGuild({...editingGuild, prefix: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Idioma</label>
                    <select
                      value={editingGuild.language || 'pt-BR'}
                      onChange={(e) => setEditingGuild({...editingGuild, language: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="pt-BR">Português (BR)</option>
                      <option value="en-US">English (US)</option>
                      <option value="es-ES">Español</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={closeGuildDetails}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={saveGuildChanges}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700"
            >
              Salvar Alterações
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Função para atualizar memberCount de todas as guildas
  const updateMemberCounts = async () => {
    if (!guilds || !Array.isArray(guilds) || guilds.length === 0 || updatingMembers || loading) {
      console.log('Pulando atualização do Discord - condições não atendidas:', {
        guildsLength: guilds?.length,
        updatingMembers,
        loading,
        isArray: Array.isArray(guilds)
      });
      return;
    }
    
    console.log('Iniciando atualização de memberCount para', guilds.length, 'guildas');
    setUpdatingMembers(true);
    let successCount = 0;
    
    try {
      const updatedGuilds = await Promise.allSettled(
        guilds.map(async (guild) => {
          if (!guild || !guild.guildId) {
            console.warn('Guilda inválida encontrada:', guild);
            return guild;
          }
          
          try {
            const discordData = await fetchDiscordGuildData(guild.guildId);
            if (discordData) {
              successCount++;
              return {
                ...guild,
                memberCount: discordData.memberCount,
                discordIcon: discordData.icon
              };
            }
          } catch (error) {
            console.error(`Erro ao buscar dados do Discord para guilda ${guild.guildId}:`, error);
          }
          return guild;
        })
      );

      const finalGuilds = updatedGuilds.map(result => 
        result.status === 'fulfilled' ? result.value : result.reason
      );

      setGuilds(finalGuilds);
      console.log(`Atualizadas ${successCount} de ${guilds.length} guildas com dados do Discord`);
      
    } catch (error) {
      console.error('Erro durante atualização do Discord:', error);
    } finally {
      setUpdatingMembers(false);
      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 3000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando guildas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho e Busca */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <ServerIcon className="h-5 w-5 text-gray-400 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Gerenciamento de Guildas</h3>
              {updateSuccess && (
                <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  ✓ Dados atualizados do Discord
                </span>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={updateMemberCounts}
                disabled={updatingMembers}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updatingMembers ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Atualizando...
                  </>
                ) : (
                  'Atualizar Discord'
                )}
              </button>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Buscar guildas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Guildas */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Guilda
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Membros
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Última Atividade
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedGuilds.map((guild) => (
              <tr key={guild.guildId} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      {guild.discordIcon ? (
                        <img
                          className="h-10 w-10 rounded-full"
                          src={`https://cdn.discordapp.com/icons/${guild.guildId}/${guild.discordIcon}.png`}
                          alt={`${guild.guildName} icon`}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div className={`h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center ${guild.discordIcon ? 'hidden' : ''}`}>
                        <ServerIcon className="h-6 w-6 text-purple-600" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {guild.guildName}
                      </div>
                      <div className="text-xs text-gray-400 font-mono">{guild.guildId}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center">
                    {guild.memberCount?.toLocaleString() || 'N/A'}
                    {updatingMembers && (
                      <div className="ml-2 animate-spin rounded-full h-3 w-3 border-b-2 border-purple-600"></div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col space-y-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      guild.botEnabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {guild.botEnabled ? 'Ativo' : 'Inativo'}
                    </span>
                    <div className="flex space-x-1">
                      {guild.welcomeEnabled && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">Bem-vindas</span>}
                      {guild.moderationEnabled && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">Moderação</span>}
                      {guild.musicEnabled && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">Música</span>}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {guild.lastActivity ? new Date(guild.lastActivity).toLocaleDateString('pt-BR') : 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => openGuildDetails(guild)}
                    className="text-purple-600 hover:text-purple-900"
                    title="Configurar guilda"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>
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
                  {Math.min(startIndex + guildsPerPage, filteredGuilds.length)}
                </span>{' '}
                de <span className="font-medium">{filteredGuilds.length}</span> guildas
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

      {/* Modal de detalhes da guilda */}
      {isDetailModalOpen && <GuildDetailModal />}
    </div>
  );
}
