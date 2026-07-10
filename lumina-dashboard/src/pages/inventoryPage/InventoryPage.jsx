import { useState, useEffect } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import SkinGrid from './components/SkinGrid';
import FilterDrawer from './components/FilterDrawer';
import luminaLogo from '../assets/isolated-monochrome-white.svg';
import OpenChestModal from './components/OpenChestModal';
import DailyRewardModal from './components/DailyRewardModal';

async function getInventoryFromId(id) {
    console.log('Buscando inventário do usuário', id);
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || '/'}expapi/internal/fetchuserskins?userId=${id}`)
        .then(response => response.json())
        .then(data => data);
    return response;
}

const RARITY_TO_K_FORMAT = {
    legacy: 'kLegacy',
    epic: 'kEpic',
    legendary: 'kLegendary',
    mythic: 'kMythic',
    ultimate: 'kUltimate',
    transcendent: 'kTranscendent',
};

const rarityOptions = [
    { key: 'kNoRarity', label: 'Sem raridade' },
    { key: 'kLegacy', label: 'Legado' },
    { key: 'kEpic', label: 'Épicas' },
    { key: 'kLegendary', label: 'Lendárias' },
    { key: 'kMythic', label: 'Míticas' },
    { key: 'kUltimate', label: 'Ultimates' },
    { key: 'kTranscendent', label: 'Transcendentes' },
];

export function InventoryPage() {
    const [isChestModalOpen, setIsChestModalOpen] = useState(false);
    const [isDailyModalOpen, setIsDailyModalOpen] = useState(false);
    const [skins, setSkins] = useState([]);
    const [user, setUser] = useState(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [discordInfo, setDiscordInfo] = useState(null);
    const [discordError, setDiscordError] = useState(false);

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

    // Carrega usuário e valida sessão (cookie httpOnly)
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const userParam = urlParams.get('user');
        if (userParam) {
            const userData = { id: userParam };
            setUser(userData);
            handleGetInventory(userData.id);
        }

        // Verifica sessão via cookie httpOnly (não mais localStorage)
        fetch(`${import.meta.env.VITE_API_BASE_URL || '/'}expapi/v1/session`, {
            credentials: 'include',
        })
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                if (data?.authenticated) {
                    setIsLoggedIn(true);
                }
            })
            .catch(() => setIsLoggedIn(false));
    }, []);

    // Solicita informações do Discord
    useEffect(() => {
        fetch(`${import.meta.env.VITE_API_BASE_URL || '/'}expapi/v1/discordinfo`, {
            credentials: 'include',
        })
            .then(res => {
                if (!res.ok) {
                    throw new Error('Conta Discord não vinculada');
                }
                return res.json();
            })
            .then(data => {
                setDiscordInfo(data);
                setDiscordError(false);
                setUser(prev => ({
                    ...prev,
                    id: data.id,
                    username: data.username,
                    avatar: data.avatar
                }));
            })
            .catch(err => {
                setDiscordError(true);
                setDiscordInfo(null);
            });
    }, []);

    // Busca automaticamente as skins do próprio usuário assim que o Discord
    // vincula — exceto se a página já foi aberta com ?user=ID na URL, caso
    // em que esse parâmetro tem prioridade (ex: link compartilhado de
    // inventário de outra pessoa).
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const hasUserParam = urlParams.has('user');

        if (discordInfo && discordInfo.id && !hasUserParam) {
            setUser(prev => ({ ...prev, id: discordInfo.id }));
            handleGetInventory(discordInfo.id);
        }
    }, [discordInfo]);

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
        try {
            const inventory = await getInventoryFromId(userId);
            setSkins(inventory);
        } catch(error) {
            console.error("Erro ao buscar inventário:", error);
        } finally {
            setInventoryLoading(false);
        }
    };

    const loginWithDiscord = async () => {
        const origin = window.location.href;
        try {
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || '/'}expapi/oauth2/discord/prepare`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ origin }),
            });
            const data = await response.json();
            if (data.redirectUrl) {
                window.location.href = data.redirectUrl;
            } else {
                console.error('URL de redirecionamento não recebida.');
            }
        } catch (error) {
            console.error('Erro ao preparar redirecionamento para Discord:', error);
        }
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
    const groupedSkins = skins.reduce((acc, skin) => {
        if (!skin || !skin.id) return acc; // Validação de segurança
        
        const existing = acc.find(item => item.id === skin.id);
        if (existing) {
            existing.count++;
        } else {
            acc.push({ ...skin, count: 1 });
        }
        return acc;
    }, []);

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
            case 'rarity':
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
                    Anterior
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
                                    ? 'bg-indigo-600 text-white'
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
                    Próxima
                </button>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100">
            {/* Main Content */}
            <section className="min-h-screen">
                <div className="w-full">
                    <div className="bg-white shadow-xl min-h-screen">
                        {/* Enhanced Header with Navigation */}
                        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-6">
                            {/* Navigation Bar */}
                            <nav className="flex items-center justify-between mb-6">
                                <div className="flex items-center space-x-3">
                                    <a href="/" className="flex items-center space-x-3">
                                        <img 
                                            src={luminaLogo} 
                                            alt="LuminaBot" 
                                            className="h-8 w-auto"
                                        />
                                    </a>
                                </div>
                                
                                <div className="hidden lg:flex lg:space-x-8">
                                    <a href="/commands" className="text-white/80 hover:text-white transition-colors font-medium">
                                        Comandos
                                    </a>
                                    <a href="/inventory" className="text-white border-b border-white font-medium">
                                        Inventário
                                    </a>
                                    <a href="/pricing" className="text-white/80 hover:text-white transition-colors font-medium">
                                        Assinaturas
                                    </a>
                                    <a href="/about" className="text-white/80 hover:text-white transition-colors font-medium">
                                        Sobre Nós
                                    </a>
                                </div>
                                <div className="flex items-center space-x-4">
                                    {isLoggedIn ? (
                                        <a
                                            href="/members"
                                            className="flex items-center space-x-2 bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded-lg transition-colors font-medium backdrop-blur-sm border border-white/20"
                                            title={discordInfo?.username ? `Ir para a Área de Membros — ${discordInfo.username}` : 'Ir para a Área de Membros'}
                                        >
                                            {discordInfo?.avatar && discordInfo?.id ? (
                                                <img
                                                    src={`https://cdn.discordapp.com/avatars/${discordInfo.id}/${discordInfo.avatar}.png`}
                                                    alt="Avatar"
                                                    className="w-6 h-6 rounded-full border border-white/30"
                                                />
                                            ) : (
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                </svg>
                                            )}
                                            <span className="hidden sm:inline">
                                                {discordInfo?.username || 'Minha conta'}
                                            </span>
                                        </a>
                                    ) : (
                                        <a
                                            href="/login"
                                            className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors font-medium backdrop-blur-sm border border-white/20"
                                        >
                                            Login
                                        </a>
                                    )}
                                </div>
                            </nav>
                            
                            {/* Elegant divider */}
                            <div className="w-full h-px bg-white/20 my-6"></div>
                            
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
                                        toggleChampion={toggleChampion}
                                        raritySearch={raritySearch}
                                        setRaritySearch={setRaritySearch}
                                        selectedRarities={selectedRarities}
                                        toggleRarity={toggleRarity}
                                        rarityOptions={rarityOptions}
                                    />
                                )}
                            />

                            {/* Main Content Area */}
                            <div className="flex-1 p-6 lg:p-8">
                                {inventoryLoading ? (
                                    <div className="flex flex-col justify-center items-center h-96">
                                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mb-4"></div>
                                        <span className="text-xl font-semibold text-gray-700">Carregando inventário...</span>
                                        <p className="text-gray-500 mt-2">Buscando suas skins coletadas</p>
                                    </div>
                                ) : sortedSkins.length > 0 ? (
                                    <div>
                                        {/* Results Stats */}
                                        <div className="mb-6 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                                <div className="flex items-center space-x-4">
                                                    <span className="text-indigo-700 font-semibold">
                                                        {hasActiveFilters ? (
                                                            `${sortedSkins.length} skin${sortedSkins.length !== 1 ? 's' : ''} encontrada${sortedSkins.length !== 1 ? 's' : ''}`
                                                        ) : (
                                                            `Mostrando ${paginatedSkins.length} de ${sortedSkins.length} skins`
                                                        )}
                                                    </span>
                                                    {hasActiveFilters && (
                                                        <span className="text-sm text-indigo-600">
                                                            (Filtros ativos - Todas as skins)
                                                        </span>
                                                    )}
                                                    {!hasActiveFilters && totalPages > 1 && (
                                                        <span className="text-sm text-indigo-600">
                                                            (Página {currentPage} de {totalPages})
                                                        </span>
                                                    )}
                                                </div>
                                                
                                                <div className="flex items-center space-x-4">
                                                    {/* Filtro de Ordenação */}
                                                    <div className="flex items-center space-x-2">
                                                        <span className="text-sm text-gray-600 font-medium">Ordenar por:</span>
                                                        <select
                                                            value={sortOrder}
                                                            onChange={(e) => setSortOrder(e.target.value)}
                                                            className="text-sm bg-white border border-gray-300 rounded-md px-3 py-1 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                                        >
                                                            <option value="alphabetical">Nome (A-Z)</option>
                                                            <option value="alphabetical-desc">Nome (Z-A)</option>
                                                            <option value="rarity">Raridade</option>
                                                            <option value="quantity">Quantidade</option>
                                                            <option value="champion">Campeão</option>
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
                                                            className="text-sm bg-white px-3 py-1 rounded-md border border-indigo-300 text-indigo-700 hover:bg-indigo-50 transition-colors"
                                                        >
                                                            Limpar filtros
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
                                            Nenhuma skin encontrada
                                        </h3>
                                        <p className="text-gray-600 mb-6 max-w-md mx-auto">
                                            {!isLoggedIn ? 
                                                "Faça login para ver seu inventário de skins." :
                                                discordError ?
                                                "Conecte sua conta Discord para acessar seu inventário." :
                                                "Você ainda não possui skins. Use o comando /openchest no Discord para coletar suas primeiras skins!"
                                            }
                                        </p>
                                        
                                        {!isLoggedIn ? (
                                            <a
                                                href="/login"
                                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                                            >
                                                Fazer Login
                                            </a>
                                        ) : discordError ? (
                                            <button
                                                onClick={loginWithDiscord}
                                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                                            >
                                                Conectar Discord
                                            </button>
                                        ) : (
                                            <a
                                                href="/commands"
                                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                                            >
                                                Ver Comandos
                                            </a>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center py-16">
                                        <div className="text-6xl mb-4">🔍</div>
                                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                            Nenhuma skin corresponde aos filtros
                                        </h3>
                                        <p className="text-gray-600 mb-6">
                                            Tente ajustar os filtros para encontrar as skins que procura.
                                        </p>
                                        
                                        <button
                                            onClick={() => {
                                                setSelectedChampions([]);
                                                setSelectedRarities([]);
                                                setGeneralSearch('');
                                                setChampionSearch('');
                                                setRaritySearch('');
                                            }}
                                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                                        >
                                            Limpar todos os filtros
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
                    className="fixed bottom-6 right-6 bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-700 transition-all duration-200 z-50"
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