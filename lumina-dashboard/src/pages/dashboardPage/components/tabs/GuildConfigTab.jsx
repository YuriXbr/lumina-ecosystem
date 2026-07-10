import { useState, useEffect, useCallback } from 'react';
import { useUser } from '../../../../contexts/UserContext';
import {
  ServerIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  XMarkIcon,
  CheckIcon,
  XMarkIcon as XIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import ErrorState from '../../../../components/ui/ErrorState';
import ErrorBanner from '../../../../components/ui/ErrorBanner';
import { SkeletonRow } from '../../../../components/ui/Skeleton';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/';
const GUILDS_PER_PAGE = 10;

export default function GuildConfigTab() {
  const { user: currentUser, getUserLevel } = useUser();
  const [guilds, setGuilds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGuild, setSelectedGuild] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editingGuild, setEditingGuild] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [updatingMembers, setUpdatingMembers] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [discordUpdateError, setDiscordUpdateError] = useState(null);
  const [guildUpdateError, setGuildUpdateError] = useState(null);

  // ─── Carregar guildas da API ───────────────────────────────────────────────
  const loadGuilds = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${API_BASE}expapi/v1/admin/guilds?page=${currentPage}&limit=${GUILDS_PER_PAGE}&search=${encodeURIComponent(searchTerm)}`,
        {
          headers: {}, credentials: 'include',
        }
      );

      if (!response.ok) {
        let detail = `HTTP ${response.status}`;
        try {
          const body = await response.json();
          if (body?.error) detail = body.error;
        } catch { /* corpo não-JSON */ }
        throw new Error(detail);
      }

      const data = await response.json();
      // Garante que cada guilda tenha um memberCount válido (fallback 0, não undefined)
      const normalized = (data.guilds || []).map(g => ({
        ...g,
        memberCount: typeof g.memberCount === 'number' ? g.memberCount : 0,
        discordIcon: g.discordIcon || null,
      }));
      setGuilds(normalized);
    } catch (err) {
      console.error('Erro ao carregar guildas:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm]);

  useEffect(() => {
    loadGuilds();
  }, [loadGuilds]);

  // ─── Buscar dados do Discord para uma guilda específica ────────────────────
  const fetchDiscordGuildData = async (guildId) => {
    try {
      const response = await fetch(`${API_BASE}expapi/v1/discord/guild/${guildId}`, {
        headers: {
          
          'Content-Type': 'application/json'
        },
        credentials: 'include',
      });

      if (!response.ok) return null;

      const data = await response.json();
      return {
        memberCount: data.member_count || data.approximate_member_count || 0,
        icon: data.icon
      };
    } catch (error) {
      console.error(`Erro ao buscar dados do Discord para guilda ${guildId}:`, error);
      return null;
    }
  };

  // ─── Atualizar memberCount de todas as guildas visíveis ────────────────────
  // Agora só dispara quando o usuário clica no botão "Atualizar Discord",
  // evitando N+1 requests automáticos em cada mudança de página/busca.
  const updateMemberCounts = async () => {
    if (!guilds || guilds.length === 0 || updatingMembers) return;

    setUpdatingMembers(true);
    setDiscordUpdateError(null);
    setUpdateSuccess(false);
    let successCount = 0;
    let failureCount = 0;

    try {
      // Usamos Promise.allSettled para garantir que uma falha não aborte as demais
      const results = await Promise.allSettled(
        guilds.map(async (guild) => {
          if (!guild || !guild.guildId) return guild;
          const discordData = await fetchDiscordGuildData(guild.guildId);
          if (discordData) {
            successCount++;
            return {
              ...guild,
              memberCount: discordData.memberCount,
              discordIcon: discordData.icon
            };
          }
          failureCount++;
          return guild;
        })
      );

      const finalGuilds = results.map(result =>
        result.status === 'fulfilled' ? result.value : null
      ).filter(Boolean);

      setGuilds(finalGuilds);

      if (failureCount > 0 && successCount === 0) {
        // Todas falharam
        setDiscordUpdateError(
          'Não foi possível carregar dados do Discord. Verifique se o bot está configurado e tem acesso aos servidores.'
        );
      } else if (failureCount > 0) {
        // Algumas falharam — avisa parcial
        setDiscordUpdateError(
          `${failureCount} de ${guilds.length} guildas não puderam ser atualizadas (o bot pode não estar nelas).`
        );
      } else if (successCount > 0) {
        setUpdateSuccess(true);
        setTimeout(() => setUpdateSuccess(false), 3000);
      }
    } catch (error) {
      console.error('Erro durante atualização do Discord:', error);
      setDiscordUpdateError('Erro inesperado ao contatar o Discord.');
    } finally {
      setUpdatingMembers(false);
    }
  };

  // ─── Atualizar guilda (PUT) ────────────────────────────────────────────────
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

  const updateGuild = async (guildId, updateData) => {
    setGuildUpdateError(null);
    try {
      const csrfToken = await getCsrfToken();
      const response = await fetch(`${API_BASE}expapi/v1/admin/guilds/${guildId}`, {
        method: 'PUT',
        headers: {
          
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify(updateData),
        credentials: 'include',
      });

      if (response.ok) {
        await loadGuilds();
        return true;
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao atualizar guilda');
      } else {
        throw new Error(`Erro HTTP ${response.status}: Resposta inesperada do servidor`);
      }
    } catch (error) {
      console.error('Erro ao atualizar guilda:', error);
      setGuildUpdateError('Erro ao atualizar guilda: ' + error.message);
      return false;
    }
  };

  // ─── Handlers do modal de detalhes ─────────────────────────────────────────
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
    if (success) closeGuildDetails();
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
        return currentLevel >= 7;
      case 'welcomeChannelId':
      case 'moderationChannelId':
      case 'prefix':
      case 'language':
        return currentLevel >= 8;
      case 'customCommands':
      case 'antiSpamEnabled':
      case 'antiLinkEnabled':
        return currentLevel >= 9;
      default:
        return false;
    }
  };

  // Filtragem local (a busca também é feita server-side, mas mantemos o filtro
  // local para feedback imediato enquanto digita).
  const filteredGuilds = guilds.filter(guild =>
    guild.guildName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    guild.guildId?.includes(searchTerm)
  );

  // ─── Modal de detalhes da guilda ────────────────────────────────────────────
  const GuildDetailModal = () => {
    if (!selectedGuild || !editingGuild) return null;
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 shadow-lg rounded-md bg-white max-h-screen overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Configurações: {selectedGuild.guildName}
            </h3>
            <button onClick={closeGuildDetails} className="text-gray-400 hover:text-gray-600">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

  // ─── Estados de renderização ───────────────────────────────────────────────

  // Erro de carregamento inicial
  if (loading && guilds.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <ServerIcon className="h-5 w-5 text-gray-400 mr-2" />
                <div className="h-5 w-48 bg-gray-200 rounded animate-pulse" />
              </div>
              <div className="h-9 w-40 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        </div>
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Guilda</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Membros</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Última Atividade</th>
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

  if (error && guilds.length === 0) {
    return (
      <ErrorState
        title="Erro ao carregar guildas"
        message="Não foi possível carregar a lista de guildas do servidor."
        detail={error}
        onRetry={loadGuilds}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho e Busca */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center">
              <ServerIcon className="h-5 w-5 text-gray-400 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Gerenciamento de Guildas</h3>
              {updateSuccess && (
                <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  ✓ Dados atualizados do Discord
                </span>
              )}
            </div>
            <div className="flex items-center space-x-3 flex-wrap">
              <button
                onClick={updateMemberCounts}
                disabled={updatingMembers || filteredGuilds.length === 0}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Buscar contagem de membros e ícones diretamente do Discord"
              >
                {updatingMembers ? (
                  <>
                    <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                    Atualizando...
                  </>
                ) : (
                  <>
                    <ArrowPathIcon className="h-4 w-4 mr-2" />
                    Atualizar Discord
                  </>
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

      {/* Erro ao atualizar Discord (banner, não bloqueia a tabela) */}
      {discordUpdateError && (
        <ErrorBanner error={discordUpdateError} variant="warning" />
      )}

      {/* Erro em mutações (save/update) */}
      {guildUpdateError && (
        <ErrorBanner error={guildUpdateError} />
      )}

      {/* Erro em refresh subsequente */}
      {error && guilds.length > 0 && (
        <ErrorBanner error={`Falha ao atualizar: ${error}`} onRetry={loadGuilds} />
      )}

      {/* Lista de Guildas */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guilda</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Membros</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Última Atividade</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredGuilds.length === 0 && (
              <tr>
                <td colSpan="5" className="px-6 py-10 text-center text-sm text-gray-400">
                  Nenhuma guilda encontrada.
                </td>
              </tr>
            )}
            {filteredGuilds.map((guild) => (
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
                            if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div
                        className={`h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center ${guild.discordIcon ? 'hidden' : ''}`}
                      >
                        <ServerIcon className="h-6 w-6 text-purple-600" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{guild.guildName}</div>
                      <div className="text-xs text-gray-400 font-mono">{guild.guildId}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center">
                    {guild.memberCount?.toLocaleString('pt-BR') || '0'}
                    {updatingMembers && (
                      <ArrowPathIcon className="ml-2 h-3 w-3 text-purple-600 animate-spin" />
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
                    <div className="flex space-x-1 flex-wrap">
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

      {/* Paginação local */}
      {filteredGuilds.length > GUILDS_PER_PAGE && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 rounded-lg shadow">
          <div>
            <p className="text-sm text-gray-700">
              Mostrando <span className="font-medium">{Math.min((currentPage - 1) * GUILDS_PER_PAGE + 1, filteredGuilds.length)}</span> a{' '}
              <span className="font-medium">{Math.min(currentPage * GUILDS_PER_PAGE, filteredGuilds.length)}</span>{' '}
              de <span className="font-medium">{filteredGuilds.length}</span> guildas
            </p>
          </div>
          <div>
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
              {Array.from({ length: Math.ceil(filteredGuilds.length / GUILDS_PER_PAGE) }, (_, i) => i + 1).map((page) => (
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
      )}

      {/* Modal de detalhes da guilda */}
      {isDetailModalOpen && <GuildDetailModal />}
    </div>
  );
}
