import { useState, useEffect, useMemo } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import SkinGrid from './components/SkinGrid';
import FilterDrawer from './components/FilterDrawer';
import { useUser } from '../../contexts/UserContext';
import { apiGetJson, API_BASE } from '../../utils/apiFetch';
import OpenChestModal from './components/OpenChestModal';
import DailyRewardModal from './components/DailyRewardModal';
import { useT } from '../../i18n/LanguageContext.jsx';

async function getInventoryFromId(id) {
    if (!/^\d{16,20}$/.test(id)) throw new Error('Informe um ID Discord válido (16 a 20 dígitos).');
    const data = await apiGetJson(`expapi/internal/fetchuserskins?userId=${encodeURIComponent(id)}`);
    if (!Array.isArray(data)) throw new Error('Resposta de inventário inválida.');
    return data;
}

const RARITY_TO_K_FORMAT = {
    legacy: 'kLegacy',
    epic: 'kEpic',
    legendary: 'kLegendary',
    mythic: 'kMythic',
    ultimate: 'kUltimate',
    transcendent: 'kTranscendent',
};

const RARITY_OPTIONS = [
    { key: 'kNoRarity',     labelKey: 'inventory.noRarity' },
    { key: 'kLegacy',       labelKey: 'inventory.rarity.legacy' },
    { key: 'kEpic',         labelKey: 'inventory.rarity.epic' },
    { key: 'kLegendary',    labelKey: 'inventory.rarity.legendary' },
    { key: 'kMythic',       labelKey: 'inventory.rarity.mythic' },
    { key: 'kUltimate',     labelKey: 'inventory.rarity.ultimate' },
    { key: 'kTranscendent', labelKey: 'inventory.rarity.transcendent' },
];

export function InventoryPage() {
  const t = useT();
    const [isChestModalOpen, setIsChestModalOpen] = useState(false);
    const [isDailyModalOpen, setIsDailyModalOpen] = useState(false);
    const [skins, setSkins] = useState([]);
    const { user: account, loading: sessionLoading } = useUser();
    const user = account ? { ...account, id: account.discordOauth2Id || account.id } : null;
    const isLoggedIn = !!account;
    const discordError = !!account && !user?.id;
    const [inventoryError, setInventoryError] = useState('');
    const [viewedId, setViewedId] = useState('');

    // Estados dos filtros
    const [generalSearch, setGeneralSearch] = useState('');
    const [championSearch, setChampionSearch] = useState('');
    const [selectedChampions, setSelectedChampions] = useState([]);
    const [raritySearch, setRaritySearch] = useState('');
    const [selectedRarities, setSelectedRarities] = useState([]);

    // Estados de paginação
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    // Estado de ordenação
    const [sortOrder, setSortOrder] = useState('alphabetical'); // alphabetical, alphabetical-desc, rarity, quantity

    // Estado para botão "voltar ao início"
    const [showScrollTop, setShowScrollTop] = useState(false);
    // Estado para controlar o carregamento do inventário
    const [inventoryLoading, setInventoryLoading] = useState(false);
    // Estado do drawer de filtros no mobile/tablet
    const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

    useEffect(() => {
        if (sessionLoading) return;
        const requestedId = new URLSearchParams(window.location.search).get('user');
        const id = requestedId || account?.discordOauth2Id || account?.id;
        if (id) handleGetInventory(id);
        else { setSkins([]); setInventoryError(''); }
    }, [account?.discordOauth2Id, account?.id, sessionLoading]);

    // Evento de scroll para exibir botão de "voltar ao início"
    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 300) {
                setShowScrollTop(true);
            } else {
                setShowScrollTop(false);
            }
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleGetInventory = async (userId) => {
        if (!userId) {
            console.error("User ID não definido");
            return;
        }
        setInventoryLoading(true);
        setInventoryError('');
        try {
            const inventory = await getInventoryFromId(userId);
            setSkins(inventory);
            setViewedId(userId);
            setCurrentPage(1);
        } catch(error) {
            setInventoryError(error.message || 'Não foi possível carregar a coleção.');
            setSkins([]);
        } finally {
            setInventoryLoading(false);
        }
    };

    const loginWithDiscord = () => {
        window.location.href = `${API_BASE}expapi/oauth2/discord/auth/start?origin=${encodeURIComponent(window.location.origin)}&intent=${account ? 'link' : 'login'}`;
    };

    const toggleChampion = (champion) => {
        setSelectedChampions(prev =>
            prev.includes(champion)
                ? prev.filter(ch => ch !== champion)
                : [...prev, champion]
        );
    };

    const toggleRarity = (rarity) => {
        setSelectedRarities(prev =>
            prev.includes(rarity)
                ? prev.filter(r => r !== rarity)
                : [...prev, rarity]
        );
    };

    // Agrupar skins por ID para contar duplicatas
    const groupedSkins = useMemo(() => {
        const items = new Map();
        for (const skin of skins) {
            if (!skin?.id) continue;
            if (items.has(skin.id)) items.get(skin.id).count++;
            else items.set(skin.id, { ...skin, count: 1 });
        }
        return [...items.values()];
    }, [skins]);

    const availableChampions = Array.from(new Set(
        groupedSkins
            .map(skin => skin.championName)
            .filter(name => name && typeof name === 'string') // Filtrar valores válidos
    ))
        .filter(name => name.toLowerCase().includes(championSearch.toLowerCase()))
        .sort();

    const filteredSkins = groupedSkins.filter(skin => {
        if (!skin || !skin.championName || !skin.name) return false; // Validação de segurança

        const generalMatch = !generalSearch ||
            skin.championName.toLowerCase().includes(generalSearch.toLowerCase()) ||
            skin.name.toLowerCase().includes(generalSearch.toLowerCase());

        const championMatch = selectedChampions.length === 0 ||
            selectedChampions.includes(skin.championName);

        const rarityMatch = selectedRarities.length === 0 ||
            selectedRarities.includes(skin.rarity);

        return generalMatch && championMatch && rarityMatch;
    });

    // Aplicar ordenação
    const sortedSkins = [...filteredSkins].sort((a, b) => {
        switch (sortOrder) {
            case 'alphabetical':
                return (a.name || '').localeCompare(b.name || '');
            case 'alphabetical-desc':
                return (b.name || '').localeCompare(a.name || '');
            case 'rarity': {
                const rarityOrder = {
                    'kTranscendent': 7,
                    'kUltimate': 6,
                    'kMythic': 5,
                    'kLegendary': 4,
                    'kEpic': 3,
                    'kLegacy': 2,
                    'kNoRarity': 1
                };
                return (rarityOrder[b.rarity] || 0) - (rarityOrder[a.rarity] || 0);
            }
            case 'quantity':
                return (b.count || 1) - (a.count || 1);
            case 'champion':
                return (a.championName || '').localeCompare(b.championName || '');
            default:
                return 0;
        }
    });

    // Verificar se há filtros ativos
    const hasActiveFilters = selectedChampions.length > 0 || selectedRarities.length > 0 || generalSearch;

    // Aplicar paginação apenas quando não há filtros ativos
    const totalPages = hasActiveFilters ? 1 : Math.ceil(sortedSkins.length / itemsPerPage);
    const startIndex = hasActiveFilters ? 0 : (currentPage - 1) * itemsPerPage;
    const endIndex = hasActiveFilters ? sortedSkins.length : startIndex + itemsPerPage;
    const paginatedSkins = sortedSkins.slice(startIndex, endIndex);

    // Reset da página quando filtros ou ordenação mudarem
    useEffect(() => {
        setCurrentPage(1);
    }, [generalSearch, selectedChampions, selectedRarities, sortOrder]);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Componente de Paginação
    const Pagination = ({ currentPage, totalPages, onPageChange }) => {
        const t = useT();
        const getPageNumbers = () => {
            const pages = [];
            const maxVisible = 5;

            if (totalPages <= maxVisible) {
                for (let i = 1; i <= totalPages; i++) {
                    pages.push(i);
                }
            } else {
                if (currentPage <= 3) {
                    for (let i = 1; i <= 4; i++) pages.push(i);
                    pages.push('...');
                    pages.push(totalPages);
                } else if (currentPage >= totalPages - 2) {
                    pages.push(1);
                    pages.push('...');
                    for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
                } else {
                    pages.push(1);
                    pages.push('...');
                    for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
                    pages.push('...');
                    pages.push(totalPages);
                }
            }
            return pages;
        };

        if (totalPages <= 1) return null;

        return (
            <div className="flex items-center justify-center space-x-2 mt-8">
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {t('common.previous')}
                </button>

                {getPageNumbers().map((page, index) => (
                    page === '...' ? (
                        <span key={index} className="px-3 py-2 text-sm text-gray-500">...</span>
                    ) : (
                        <button
                            key={index}
                            onClick={() => onPageChange(page)}
                            className={`px-3 py-2 text-sm font-medium rounded-md ${
                                currentPage === page
                                    ? 'bg-purple-600 text-white'
                                    : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                            }`}
                        >
                            {page}
                        </button>
                    )
                ))}

                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {t('common.next')}
                </button>
            </div>
        );
    };

    return (
        <div className="bg-gray-50">
            {/* Main Content */}
            <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                <div className="w-full">
                    <div className="lumina-card overflow-hidden">
                        {/* Enhanced Header with Navigation */}
                        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-6">
                            <Header
                                generalSearch={generalSearch}
                                setGeneralSearch={setGeneralSearch}
                                isLoggedIn={isLoggedIn}
                                discordError={discordError}
                                loginWithDiscord={loginWithDiscord}
                                handleGetInventory={handleGetInventory}
                                user={user}
                                inventoryLoading={inventoryLoading}
                                onOpenChestModal={() => setIsChestModalOpen(true)}
                                onOpenDailyModal={() => setIsDailyModalOpen(true)}
                            />
                        </div>

                        {inventoryError && <div role="alert" className="mx-6 my-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{inventoryError}<button className="ml-3 underline" onClick={() => handleGetInventory(viewedId || user?.id)}>Tentar novamente</button></div>}
                        {viewedId && viewedId !== user?.id && <p className="px-6 pt-4 text-sm text-gray-500">Coleção pública · {viewedId}</p>}
                        {/* Content Area */}
                        <div className="flex flex-col lg:flex-row">
                            <FilterDrawer
                                isOpen={isFilterDrawerOpen}
                                onClose={() => setIsFilterDrawerOpen(false)}
                                onOpenButtonClick={() => setIsFilterDrawerOpen(true)}
                                activeFilterCount={selectedChampions.length + selectedRarities.length}
                                renderFilters={() => (
                                    <Sidebar
                                        skins={groupedSkins}
                                        generalSearch={generalSearch}
                                        setGeneralSearch={setGeneralSearch}
                                        championSearch={championSearch}
                                        setChampionSearch={setChampionSearch}
                                        availableChampions={availableChampions}
                                        selectedChampions={selectedChampions}
                                        setSelectedChampions={setSelectedChampions}
                                        toggleChampion={toggleChampion}
                                        raritySearch={raritySearch}
                                        setRaritySearch={setRaritySearch}
                                        selectedRarities={selectedRarities}
                                        setSelectedRarities={setSelectedRarities}
                                        toggleRarity={toggleRarity}
                                        rarityOptions={RARITY_OPTIONS}
                                    />
                                )}
                            />

                            {/* Main Content Area */}
                            <div className="flex-1 p-6 lg:p-8">
                                {inventoryLoading ? (
                                    <div className="flex flex-col justify-center items-center h-96">
                                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mb-4"></div>
                                        <span className="text-xl font-semibold text-gray-700">{t("inventory.loadingInventory")}</span>
                                        <p className="text-gray-500 mt-2">{t("inventory.fetchingSkins")}</p>
                                    </div>
                                ) : sortedSkins.length > 0 ? (
                                    <div>
                                        {/* Results Stats */}
                                        <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
                                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                                <div className="flex items-center space-x-4">
                                                    <span className="text-purple-700 font-semibold">
                                                        {hasActiveFilters ? (
                                                            t('inventory.skinsFound', { count: sortedSkins.length })
                                                        ) : (
                                                            t('inventory.showing', { shown: paginatedSkins.length, total: sortedSkins.length })
                                                        )}
                                                    </span>
                                                    {hasActiveFilters && (
                                                        <span className="text-sm text-purple-600">
                                                            ({t('inventory.filtersActive')} - {t('inventory.allSkins')})
                                                        </span>
                                                    )}
                                                    {!hasActiveFilters && totalPages > 1 && (
                                                        <span className="text-sm text-purple-600">
                                                            {t('inventory.pageOf', { current: currentPage, total: totalPages })}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center space-x-4">
                                                    {/* Filtro de Ordenação */}
                                                    <div className="flex items-center space-x-2">
                                                        <span className="text-sm text-gray-600 font-medium">{t("common.sortBy")}</span>
                                                        <select
                                                            value={sortOrder}
                                                            onChange={(e) => setSortOrder(e.target.value)}
                                                            className="text-sm bg-white border border-gray-300 rounded-md px-3 py-1 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                                        >
                                                            <option value="alphabetical">{t('inventory.sortByName')}</option>
                                                            <option value="alphabetical-desc">{t('inventory.sortByNameDesc')}</option>
                                                            <option value="rarity">{t('inventory.sortByRarity')}</option>
                                                            <option value="quantity">{t('inventory.sortByQuantity')}</option>
                                                            <option value="champion">{t('inventory.sortByChampion')}</option>
                                                        </select>
                                                    </div>

                                                    {hasActiveFilters && (
                                                        <button
                                                            onClick={() => {
                                                                setSelectedChampions([]);
                                                                setSelectedRarities([]);
                                                                setGeneralSearch('');
                                                                setChampionSearch('');
                                                                setRaritySearch('');
                                                            }}
                                                            className="text-sm bg-white px-3 py-1 rounded-md border border-purple-300 text-purple-700 hover:bg-purple-50 transition-colors"
                                                        >
                                                            {t('common.clearFilters')}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Paginação superior - apenas quando não há filtros ativos */}
                                        {!hasActiveFilters && (
                                            <Pagination
                                                currentPage={currentPage}
                                                totalPages={totalPages}
                                                onPageChange={setCurrentPage}
                                            />
                                        )}

                                        <div className="my-8">
                                            <SkinGrid filteredSkins={paginatedSkins} />
                                        </div>

                                        {/* Paginação inferior - apenas quando não há filtros ativos */}
                                        {!hasActiveFilters && (
                                            <Pagination
                                                currentPage={currentPage}
                                                totalPages={totalPages}
                                                onPageChange={setCurrentPage}
                                            />
                                        )}
                                    </div>
                                ) : skins.length === 0 && !inventoryLoading ? (
                                    <div className="text-center py-16">
                                        <div className="text-6xl mb-4">📦</div>
                                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                            {t('inventory.noSkinsFound')}
                                        </h3>
                                        <p className="text-gray-600 mb-6 max-w-md mx-auto">
                                            {!isLoggedIn ?
                                                t('inventory.loginRequired') :
                                                discordError ?
                                                t('inventory.discordRequired') :
                                                t('inventory.noSkins')
                                            }
                                        </p>

                                        {!isLoggedIn ? (
                                            <a
                                                href="/login"
                                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 transition-colors"
                                            >
                                                {t('common.login')}
                                            </a>
                                        ) : discordError ? (
                                            <button
                                                onClick={loginWithDiscord}
                                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 transition-colors"
                                            >
                                                {t('inventory.connectDiscord')}
                                            </button>
                                        ) : (
                                            <a
                                                href="/commands"
                                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 transition-colors"
                                            >
                                                {t('inventory.viewCommands')}
                                            </a>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center py-16">
                                        <div className="text-6xl mb-4">🔍</div>
                                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                            {t('inventory.noSkinsMatch')}
                                        </h3>
                                        <p className="text-gray-600 mb-6">
                                            {t('inventory.noSkinsMatchDesc')}
                                        </p>

                                        <button
                                            onClick={() => {
                                                setSelectedChampions([]);
                                                setSelectedRarities([]);
                                                setGeneralSearch('');
                                                setChampionSearch('');
                                                setRaritySearch('');
                                            }}
                                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 transition-colors"
                                        >
                                            {t('inventory.clearAllFilters')}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Scroll to top button */}
            {showScrollTop && (
                <button
                    onClick={scrollToTop}
                    className="fixed bottom-6 right-6 bg-purple-600 text-white p-4 rounded-full shadow-lg hover:bg-purple-700 transition-all duration-200 z-50"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                </button>
            )}

            <OpenChestModal
                isOpen={isChestModalOpen}
                onClose={() => setIsChestModalOpen(false)}
                isLoggedIn={isLoggedIn}
                discordError={discordError}
                loginWithDiscord={loginWithDiscord}
                onSkinObtained={(skin) => {
                    // Atualiza a lista de skins em tela sem precisar de um novo
                    // fetch completo do inventário, já convertendo a raridade
                    // para o formato "kXxx" usado pelo resto do app.
                    setSkins(prev => [...prev, {
                        id: skin.skinId,
                        name: skin.skinName,
                        championName: skin.championName,
                        rarity: RARITY_TO_K_FORMAT[skin.rarity] || skin.rarity,
                        isBase: skin.isBase,
                        isLegacy: skin.isLegacy,
                        splashPath: skin.splashPath,
                        loadScreenPath: skin.loadScreenPath,
                        tilePath: skin.tilePath,
                        uncenteredSplashPath: skin.uncenteredSplashPath,
                    }]);
                }}
            />

            <DailyRewardModal
                isOpen={isDailyModalOpen}
                onClose={() => setIsDailyModalOpen(false)}
                isLoggedIn={isLoggedIn}
                discordError={discordError}
                loginWithDiscord={loginWithDiscord}
            />
        </div>
    );
}

export default InventoryPage;
