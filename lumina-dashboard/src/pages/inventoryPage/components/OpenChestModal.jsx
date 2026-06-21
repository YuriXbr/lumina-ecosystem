import { useState, useEffect, useCallback } from 'react';

const CHEST_LABELS = {
    masterWorkChests: 'Baú de Maestria',
    hextechChests: 'Baú Hextech',
};

const RARITY_STYLES = {
    kNoRarity:      { label: 'Sem raridade',  ring: 'ring-gray-300',    glow: '',                       text: 'text-gray-600' },
    kLegacy:        { label: 'Legado',        ring: 'ring-amber-700',   glow: 'shadow-amber-700/40',    text: 'text-amber-700' },
    legacy:         { label: 'Legado',        ring: 'ring-amber-700',   glow: 'shadow-amber-700/40',    text: 'text-amber-700' },
    kEpic:          { label: 'Épica',         ring: 'ring-purple-500',  glow: 'shadow-purple-500/50',   text: 'text-purple-600' },
    epic:           { label: 'Épica',         ring: 'ring-purple-500',  glow: 'shadow-purple-500/50',   text: 'text-purple-600' },
    kLegendary:     { label: 'Lendária',      ring: 'ring-orange-500',  glow: 'shadow-orange-500/50',   text: 'text-orange-600' },
    legendary:      { label: 'Lendária',      ring: 'ring-orange-500',  glow: 'shadow-orange-500/50',   text: 'text-orange-600' },
    kMythic:        { label: 'Mítica',        ring: 'ring-rose-500',    glow: 'shadow-rose-500/60',     text: 'text-rose-600' },
    mythic:         { label: 'Mítica',        ring: 'ring-rose-500',    glow: 'shadow-rose-500/60',     text: 'text-rose-600' },
    kUltimate:      { label: 'Ultimate',      ring: 'ring-cyan-400',    glow: 'shadow-cyan-400/60',     text: 'text-cyan-600' },
    ultimate:       { label: 'Ultimate',      ring: 'ring-cyan-400',    glow: 'shadow-cyan-400/60',     text: 'text-cyan-600' },
    kTranscendent:  { label: 'Transcendente', ring: 'ring-fuchsia-400', glow: 'shadow-fuchsia-400/70',  text: 'text-fuchsia-600' },
    transcendent:   { label: 'Transcendente', ring: 'ring-fuchsia-400', glow: 'shadow-fuchsia-400/70',  text: 'text-fuchsia-600' },
};

function getRarityStyle(rarity) {
    return RARITY_STYLES[rarity] || RARITY_STYLES.kNoRarity;
}

/**
 * Monta a URL pública da splash art via Data Dragon.
 *
 * Os paths que a API devolve (splashPath, loadScreenPath, etc) são
 * caminhos internos do client do League (ex: "/lol-game-data/assets/...")
 * e não existem como URL pública — por isso não podem ser usados
 * diretamente num <img src>. O bot do Discord já resolve isso ignorando
 * esses paths e montando a URL a partir do Data Dragon; replicamos a
 * mesma lógica aqui para manter consistência visual entre bot e site.
 *
 * Fórmula (idêntica à do bot): pega os últimos 3 dígitos do skinId e
 * remove zeros à esquerda — ex: skinId 45051 -> "51".
 */
function getSkinSplashUrl(skin) {
    if (!skin?.championName || skin?.skinId == null) return null;
    const skinNumber = skin.skinId.toString().slice(-3).replace(/^0+/, '');
    return `https://ddragon.leagueoflegends.com/cdn/img/champion/centered/${skin.championName}_${skinNumber}.jpg`;
}

/**
 * Pré-carrega uma imagem antes de exibir o resultado, evitando que o nome
 * da skin apareça em tela enquanto a splash art ainda está sendo baixada.
 * Resolve com `true` se a imagem carregou, `false` se falhou ou não havia
 * URL. Tem um timeout de segurança: se o Data Dragon demorar demais (ou
 * não tiver aquele número de skin), seguimos em frente mostrando o
 * placeholder em vez de travar o usuário indefinidamente.
 */
function preloadImage(url, timeoutMs = 6000) {
    return new Promise((resolve) => {
        if (!url) {
            resolve(false);
            return;
        }
        const img = new Image();
        let settled = false;
        const finish = (ok) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            resolve(ok);
        };
        const timer = setTimeout(() => finish(false), timeoutMs);
        img.onload = () => finish(true);
        img.onerror = () => finish(false);
        img.src = url;
    });
}

/**
 * Lê o corpo de uma resposta de erro com segurança. O backend nem sempre
 * devolve JSON (ex: erros de middleware como csurf vazam HTML/stack trace
 * cru quando não há um error handler customizado), então tentamos JSON e
 * caímos para uma mensagem genérica em vez de propagar o conteúdo cru.
 */
async function readErrorMessage(response, fallback) {
    try {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            const body = await response.json();
            return body.error || body.message || fallback;
        }
    } catch {
        // corpo não era JSON válido, cai no fallback
    }
    return fallback;
}

/**
 * Busca um token CSRF fresco em /expapi/v1/csrf-token. Essa rota seta um
 * cookie httpOnly no navegador (por isso credentials: 'include' é
 * obrigatório aqui) e devolve o token que deve ser ecoado de volta no
 * header X-CSRF-Token nas próximas requisições que mudam estado.
 */
async function fetchCsrfToken(baseUrl) {
    const response = await fetch(`${baseUrl}expapi/v1/csrf-token`, {
        credentials: 'include',
    });
    if (!response.ok) {
        throw new Error('Não foi possível iniciar a sessão de segurança. Tente novamente.');
    }
    const data = await response.json();
    return data.csrfToken;
}

/**
 * Modal de abertura de baú.
 *
 * Props:
 * - isOpen: bool
 * - onClose: () => void
 * - isLoggedIn: bool — usuário tem JWT válido
 * - discordError: bool — true quando a conta Discord não está vinculada
 * - loginWithDiscord: () => void — reaproveita o fluxo já existente no InventoryPage
 * - onSkinObtained: (skin) => void — callback opcional pra atualizar o inventário/listagem por trás
 */
export default function OpenChestModal({
    isOpen,
    onClose,
    isLoggedIn,
    discordError,
    loginWithDiscord,
    onSkinObtained,
}) {
    const [inventory, setInventory] = useState(null);
    const [inventoryLoading, setInventoryLoading] = useState(false);
    const [inventoryError, setInventoryError] = useState(null);

    const [selectedChest, setSelectedChest] = useState('masterWorkChests');
    const [rolling, setRolling] = useState(false);
    const [rollError, setRollError] = useState(null);
    const [result, setResult] = useState(null);

    const fetchInventory = useCallback(async () => {
        setInventoryLoading(true);
        setInventoryError(null);
        const token = localStorage.getItem('token');
        try {
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}expapi/v1/myinventory`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) {
                const message = await readErrorMessage(response, 'Não foi possível carregar seu inventário');
                throw new Error(message);
            }
            const data = await response.json();
            setInventory(data);
        } catch (err) {
            setInventoryError(err.message);
        } finally {
            setInventoryLoading(false);
        }
    }, []);

    // Recarrega o inventário sempre que o modal é aberto (e o usuário está apto)
    useEffect(() => {
        if (isOpen && isLoggedIn && !discordError) {
            setResult(null);
            setRollError(null);
            fetchInventory();
        }
    }, [isOpen, isLoggedIn, discordError, fetchInventory]);

    if (!isOpen) return null;

    const handleRoll = async () => {
        setRolling(true);
        setRollError(null);
        const token = localStorage.getItem('token');
        const baseUrl = import.meta.env.VITE_API_BASE_URL;
        try {
            const csrfToken = await fetchCsrfToken(baseUrl);

            const response = await fetch(`${baseUrl}expapi/v1/rollskin`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                    'X-CSRF-Token': csrfToken,
                },
                body: JSON.stringify({ chestType: selectedChest }),
            });

            if (!response.ok) {
                const message = await readErrorMessage(
                    response,
                    'Não foi possível abrir o baú. Verifique se você tem chaves e baús suficientes.'
                );
                throw new Error(message);
            }

            const skin = await response.json();
            const splashUrl = getSkinSplashUrl(skin);
            const imageLoaded = await preloadImage(splashUrl);

            setResult({ ...skin, _imageLoaded: imageLoaded });
            // Atualiza contadores locais sem precisar de um novo fetch
            setInventory(prev => prev && ({
                ...prev,
                keys: Math.max(0, prev.keys - 1),
                [selectedChest]: Math.max(0, prev[selectedChest] - 1),
            }));
            onSkinObtained?.(skin);
        } catch (err) {
            setRollError(err.message);
        } finally {
            setRolling(false);
        }
    };

    const handleClose = () => {
        setResult(null);
        setRollError(null);
        onClose();
    };

    const canRoll = inventory && inventory.keys > 0 && inventory[selectedChest] > 0 && !rolling;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
        >
            <div
                className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <span className="text-2xl">🗝️</span>
                        Abrir baú
                    </h2>
                    <button
                        onClick={handleClose}
                        className="text-white/80 hover:text-white transition-colors"
                        aria-label="Fechar"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6">
                    {!isLoggedIn ? (
                        <EmptyState
                            emoji="🔒"
                            title="Faça login para continuar"
                            description="Você precisa estar logado no dashboard para abrir baús."
                        />
                    ) : discordError ? (
                        <EmptyState
                            emoji="🔗"
                            title="Conecte sua conta Discord"
                            description="Abrir baús exige que sua conta do dashboard esteja vinculada ao Discord, já que seu inventário de skins vive lá."
                            action={
                                <button
                                    onClick={loginWithDiscord}
                                    className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                                >
                                    Conectar Discord
                                </button>
                            }
                        />
                    ) : result ? (
                        <ResultView skin={result} onRollAgain={() => setResult(null)} />
                    ) : (
                        <ChestSelectionView
                            inventory={inventory}
                            inventoryLoading={inventoryLoading}
                            inventoryError={inventoryError}
                            selectedChest={selectedChest}
                            setSelectedChest={setSelectedChest}
                            rolling={rolling}
                            rollError={rollError}
                            canRoll={canRoll}
                            onRoll={handleRoll}
                            onRetryInventory={fetchInventory}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

function EmptyState({ emoji, title, description, action }) {
    return (
        <div className="text-center py-8">
            <div className="text-5xl mb-4">{emoji}</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
            <p className="text-gray-600 mb-6 max-w-sm mx-auto">{description}</p>
            {action}
        </div>
    );
}

function ChestSelectionView({
    inventory,
    inventoryLoading,
    inventoryError,
    selectedChest,
    setSelectedChest,
    rolling,
    rollError,
    canRoll,
    onRoll,
    onRetryInventory,
}) {
    if (inventoryLoading) {
        return (
            <div className="flex flex-col items-center py-10">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-3"></div>
                <span className="text-gray-600">Carregando seu inventário...</span>
            </div>
        );
    }

    if (inventoryError) {
        return (
            <EmptyState
                emoji="⚠️"
                title="Erro ao carregar inventário"
                description={inventoryError}
                action={
                    <button
                        onClick={onRetryInventory}
                        className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                    >
                        Tentar novamente
                    </button>
                }
            />
        );
    }

    if (!inventory) return null;

    return (
        <>
            {/* Saldo de chaves */}
            <div className="flex items-center justify-center gap-2 mb-6 text-gray-700">
                <span className="text-xl">🔑</span>
                <span className="font-semibold">{inventory.keys}</span>
                <span className="text-sm text-gray-500">chave{inventory.keys !== 1 ? 's' : ''} disponível{inventory.keys !== 1 ? 'is' : ''}</span>
            </div>

            {/* Seleção de baú */}
            <div className="grid grid-cols-2 gap-3 mb-6">
                {Object.entries(CHEST_LABELS).map(([key, label]) => {
                    const amount = inventory[key] || 0;
                    const isSelected = selectedChest === key;
                    return (
                        <button
                            key={key}
                            disabled={rolling}
                            onClick={() => setSelectedChest(key)}
                            className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                                isSelected
                                    ? 'border-indigo-600 bg-indigo-50'
                                    : 'border-gray-200 bg-white hover:border-gray-300'
                            } ${rolling ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                            <div className="text-3xl mb-2">📦</div>
                            <div className="text-sm font-semibold text-gray-900">{label}</div>
                            <div className="text-xs text-gray-500 mt-1">
                                {amount} disponíve{amount !== 1 ? 'is' : 'l'}
                            </div>
                        </button>
                    );
                })}
            </div>

            {rollError && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                    {rollError}
                </div>
            )}

            {!canRoll && !rolling && (
                <p className="text-center text-sm text-gray-500 mb-4">
                    {inventory.keys === 0
                        ? 'Você não tem chaves suficientes.'
                        : 'Você não tem esse baú disponível.'}
                </p>
            )}

            <button
                onClick={onRoll}
                disabled={!canRoll}
                className={`w-full py-3 rounded-lg font-semibold text-white transition-all ${
                    canRoll
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg'
                        : 'bg-gray-300 cursor-not-allowed'
                }`}
            >
                {rolling ? (
                    <span className="flex items-center justify-center gap-2">
                        <span className="inline-block h-5 w-5 border-b-2 border-white rounded-full animate-spin"></span>
                        Abrindo baú...
                    </span>
                ) : (
                    'Abrir baú'
                )}
            </button>
        </>
    );
}

function ResultView({ skin, onRollAgain }) {
    const style = getRarityStyle(skin.rarity);
    const splashUrl = getSkinSplashUrl(skin);
    const showImage = skin._imageLoaded && splashUrl;

    return (
        <div className="text-center py-2 animate-[fadeIn_0.4s_ease-out]">
            <div
                className={`relative mx-auto mb-5 w-full max-w-xs aspect-[3/4] rounded-xl overflow-hidden ring-4 ${style.ring} shadow-xl ${style.glow}`}
            >
                {showImage ? (
                    <img
                        src={splashUrl}
                        alt={skin.skinName}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100 text-5xl">
                        🎨
                    </div>
                )}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                    <div className={`text-xs font-bold uppercase tracking-wide ${style.text} bg-white/90 inline-block px-2 py-0.5 rounded`}>
                        {style.label}
                    </div>
                </div>
            </div>

            <h3 className="text-lg font-bold text-gray-900">{skin.skinName}</h3>
            <p className="text-sm text-gray-500 mb-6">{skin.championName}</p>

            <button
                onClick={onRollAgain}
                className="inline-flex items-center px-5 py-2.5 text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md"
            >
                Abrir outro baú
            </button>
        </div>
    );
}
