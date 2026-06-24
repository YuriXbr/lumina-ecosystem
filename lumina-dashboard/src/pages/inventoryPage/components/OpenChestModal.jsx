import { useState, useEffect, useCallback } from 'react';

// ─── CSS Keyframes ────────────────────────────────────────────────────────────
function AnimationStyles() {
    return (
        <style>{`
            @keyframes chestShake {
                0%,100% { transform: translateX(0) rotate(0deg) scale(1); }
                10%  { transform: translateX(-9px) rotate(-7deg) scale(1.06); }
                20%  { transform: translateX(9px)  rotate(7deg)  scale(1.09); }
                30%  { transform: translateX(-9px) rotate(-6deg) scale(1.07); }
                40%  { transform: translateX(9px)  rotate(6deg)  scale(1.09); }
                50%  { transform: translateX(-8px) rotate(-7deg) scale(1.06); }
                60%  { transform: translateX(8px)  rotate(7deg)  scale(1.09); }
                70%  { transform: translateX(-5px) rotate(-3deg) scale(1.04); }
                80%  { transform: translateX(5px)  rotate(3deg)  scale(1.06); }
                90%  { transform: translateX(-3px) rotate(-1deg) scale(1.02); }
            }
            @keyframes pulseRing {
                0%   { transform: scale(0.7); opacity: 0.75; }
                100% { transform: scale(2.6); opacity: 0; }
            }
            @keyframes cardReveal {
                0%   { opacity: 0; transform: scale(0.58) translateY(32px); }
                65%  { transform: scale(1.06) translateY(-5px); }
                100% { opacity: 1; transform: scale(1) translateY(0); }
            }
            @keyframes particleFly {
                0%   { opacity: 1; transform: translate(0,0) scale(1); }
                100% { opacity: 0; transform: translate(var(--tx), var(--ty)) scale(0.15); }
            }
            @keyframes shimmerSweep {
                0%   { transform: translateX(-140%) skewX(-18deg); }
                100% { transform: translateX(240%)  skewX(-18deg); }
            }
            @keyframes rarityGlow {
                0%, 100% { box-shadow: 0 0 12px var(--glow-color), 0 8px 32px rgba(0,0,0,0.25); }
                50%       { box-shadow: 0 0 44px var(--glow-color), 0 0 90px var(--glow-color), 0 8px 32px rgba(0,0,0,0.25); }
            }
            @keyframes badgePop {
                0%   { opacity: 0; transform: scale(0.35) translateY(10px); }
                70%  { transform: scale(1.12); }
                100% { opacity: 1; transform: scale(1) translateY(0); }
            }
            @keyframes textFadeUp {
                0%   { opacity: 0; transform: translateY(10px); }
                100% { opacity: 1; transform: translateY(0); }
            }
            @keyframes expandRing {
                0%   { transform: scale(1); opacity: 0.8; }
                100% { transform: scale(2.6); opacity: 0; }
            }
            @keyframes chestGlow {
                0%, 100% { filter: drop-shadow(0 0 6px rgba(99,102,241,0.4)); }
                50%       { filter: drop-shadow(0 0 20px rgba(99,102,241,0.9)); }
            }
        `}</style>
    );
}

// ─── Config ──────────────────────────────────────────────────────────────────
const CHEST_CONFIG = {
    masterWorkChests: {
        label: 'Baú do Mestre Artesão',
        description: 'Garante raridade épica ou superior',
        openingEmoji: '✨',
        cardEmoji: '🏆',
        gradient: 'from-amber-400 to-orange-500',
        selectedBorder: 'border-amber-500',
        selectedBg: 'bg-amber-50',
        selectedText: 'text-amber-700',
        badgeBg: 'bg-amber-100 text-amber-700',
        ringColor: 'rgba(245,158,11,0.7)',
    },
    hextechChests: {
        label: 'Baú Hextech',
        description: 'Qualquer raridade possível',
        openingEmoji: '📦',
        cardEmoji: '📦',
        gradient: 'from-indigo-500 to-purple-600',
        selectedBorder: 'border-indigo-500',
        selectedBg: 'bg-indigo-50',
        selectedText: 'text-indigo-700',
        badgeBg: 'bg-indigo-100 text-indigo-700',
        ringColor: 'rgba(99,102,241,0.7)',
    },
};

const RARITY_STYLES = {
    kNoRarity:      { label: 'Sem raridade',  ring: 'ring-gray-300',    text: 'text-gray-600',    glow: null },
    kLegacy:        { label: 'Legado',        ring: 'ring-amber-700',   text: 'text-amber-700',   glow: 'rgba(180,83,9,0.65)' },
    legacy:         { label: 'Legado',        ring: 'ring-amber-700',   text: 'text-amber-700',   glow: 'rgba(180,83,9,0.65)' },
    kEpic:          { label: 'Épica',         ring: 'ring-purple-500',  text: 'text-purple-600',  glow: 'rgba(168,85,247,0.72)' },
    epic:           { label: 'Épica',         ring: 'ring-purple-500',  text: 'text-purple-600',  glow: 'rgba(168,85,247,0.72)' },
    kLegendary:     { label: 'Lendária',      ring: 'ring-orange-500',  text: 'text-orange-600',  glow: 'rgba(249,115,22,0.78)' },
    legendary:      { label: 'Lendária',      ring: 'ring-orange-500',  text: 'text-orange-600',  glow: 'rgba(249,115,22,0.78)' },
    kMythic:        { label: 'Mítica',        ring: 'ring-rose-500',    text: 'text-rose-600',    glow: 'rgba(244,63,94,0.82)' },
    mythic:         { label: 'Mítica',        ring: 'ring-rose-500',    text: 'text-rose-600',    glow: 'rgba(244,63,94,0.82)' },
    kUltimate:      { label: 'Ultimate',      ring: 'ring-cyan-400',    text: 'text-cyan-600',    glow: 'rgba(6,182,212,0.82)' },
    ultimate:       { label: 'Ultimate',      ring: 'ring-cyan-400',    text: 'text-cyan-600',    glow: 'rgba(6,182,212,0.82)' },
    kTranscendent:  { label: 'Transcendente', ring: 'ring-fuchsia-400', text: 'text-fuchsia-600', glow: 'rgba(232,121,249,0.9)' },
    transcendent:   { label: 'Transcendente', ring: 'ring-fuchsia-400', text: 'text-fuchsia-600', glow: 'rgba(232,121,249,0.9)' },
};

const RARITY_PARTICLE_COLORS = {
    kEpic:         ['#a855f7', '#c084fc', '#ddd6fe'],
    epic:          ['#a855f7', '#c084fc', '#ddd6fe'],
    kLegendary:    ['#f97316', '#fb923c', '#fde68a'],
    legendary:     ['#f97316', '#fb923c', '#fde68a'],
    kMythic:       ['#f43f5e', '#fb7185', '#fecdd3'],
    mythic:        ['#f43f5e', '#fb7185', '#fecdd3'],
    kUltimate:     ['#06b6d4', '#67e8f9', '#a5f3fc'],
    ultimate:      ['#06b6d4', '#67e8f9', '#a5f3fc'],
    kTranscendent: ['#e879f9', '#f0abfc', '#f9a8d4', '#c026d3'],
    transcendent:  ['#e879f9', '#f0abfc', '#f9a8d4', '#c026d3'],
};

function getRarityStyle(rarity) {
    return RARITY_STYLES[rarity] || RARITY_STYLES.kNoRarity;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getSkinSplashUrl(skin) {
    if (!skin?.championName || skin?.skinId == null) return null;
    const skinNumber = skin.skinId.toString().slice(-3).replace(/^0+/, '');
    return `https://ddragon.leagueoflegends.com/cdn/img/champion/centered/${skin.championName}_${skinNumber}.jpg`;
}

function preloadImage(url, timeoutMs = 6000) {
    return new Promise((resolve) => {
        if (!url) { resolve(false); return; }
        const img = new Image();
        let settled = false;
        const finish = (ok) => { if (settled) return; settled = true; clearTimeout(timer); resolve(ok); };
        const timer = setTimeout(() => finish(false), timeoutMs);
        img.onload = () => finish(true);
        img.onerror = () => finish(false);
        img.src = url;
    });
}

async function readErrorMessage(response, fallback) {
    try {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            const body = await response.json();
            return body.error || body.message || fallback;
        }
    } catch { /* fall through */ }
    return fallback;
}

async function fetchCsrfToken(baseUrl) {
    const response = await fetch(`${baseUrl}expapi/v1/csrf-token`, { credentials: 'include' });
    if (!response.ok) throw new Error('Não foi possível iniciar a sessão de segurança. Tente novamente.');
    const data = await response.json();
    return data.csrfToken;
}

// ─── Main component ───────────────────────────────────────────────────────────
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
    // null | 'shaking' | 'flashing'
    const [openPhase, setOpenPhase] = useState(null);
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

    useEffect(() => {
        if (isOpen && isLoggedIn && !discordError) {
            setResult(null);
            setRollError(null);
            setOpenPhase(null);
            fetchInventory();
        }
    }, [isOpen, isLoggedIn, discordError, fetchInventory]);

    if (!isOpen) return null;

    const handleRoll = async () => {
        setRolling(true);
        setOpenPhase('shaking');
        setRollError(null);

        const token = localStorage.getItem('token');
        const baseUrl = import.meta.env.VITE_API_BASE_URL;
        const animStart = Date.now();
        const MIN_SHAKE_MS = 1500;
        const FLASH_MS = 400;

        let rollData = null;
        let rollErr = null;

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
            rollData = { ...skin, _imageLoaded: imageLoaded };
        } catch (err) {
            rollErr = err.message;
        }

        // Sempre aguarda a duração mínima do shake para não cortar a animação
        const elapsed = Date.now() - animStart;
        const remaining = Math.max(0, MIN_SHAKE_MS - elapsed);
        await new Promise((r) => setTimeout(r, remaining));

        if (rollErr) {
            setRollError(rollErr);
            setOpenPhase(null);
            setRolling(false);
            fetchInventory();
            return;
        }

        // Flash antes do reveal
        setOpenPhase('flashing');
        await new Promise((r) => setTimeout(r, FLASH_MS));

        // Atualiza contadores locais sem novo fetch
        setInventory((prev) =>
            prev && {
                ...prev,
                keys: Math.max(0, prev.keys - 1),
                [selectedChest]: Math.max(0, prev[selectedChest] - 1),
            }
        );

        setResult(rollData);
        setOpenPhase(null);
        setRolling(false);
        onSkinObtained?.(rollData);
    };

    const handleClose = () => {
        // Impede fechar durante a animação para não quebrar o estado
        if (rolling) return;
        setResult(null);
        setRollError(null);
        setOpenPhase(null);
        onClose();
    };

    const canRoll = inventory && inventory.keys > 0 && inventory[selectedChest] > 0 && !rolling;

    return (
        <>
            <AnimationStyles />
            <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                onClick={handleClose}
            >
                <div
                    className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header do modal */}
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5 flex items-center justify-between">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <span className="text-2xl">🗝️</span>
                            Abrir baú
                        </h2>
                        <button
                            onClick={handleClose}
                            disabled={rolling}
                            className="text-white/80 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
                                description="Abrir baús exige que sua conta esteja vinculada ao Discord, já que seu inventário de skins vive lá."
                                action={
                                    <button
                                        onClick={loginWithDiscord}
                                        className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                                    >
                                        Conectar Discord
                                    </button>
                                }
                            />
                        ) : openPhase ? (
                            <ChestOpeningView chestType={selectedChest} phase={openPhase} />
                        ) : result ? (
                            <ResultView
                                skin={result}
                                onRollAgain={() => {
                                    setResult(null);
                                    setRollError(null);
                                }}
                            />
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
        </>
    );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────
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

// ─── ChestOpeningView ─────────────────────────────────────────────────────────
function ChestOpeningView({ chestType, phase }) {
    const cfg = CHEST_CONFIG[chestType] || CHEST_CONFIG.hextechChests;
    const isFlashing = phase === 'flashing';

    return (
        <div className="relative flex flex-col items-center justify-center py-14 overflow-hidden min-h-[230px]">
            {/* Anéis pulsantes */}
            {!isFlashing && [0, 0.45, 0.9].map((delay, i) => (
                <div
                    key={i}
                    className="absolute w-20 h-20 rounded-full border-2 border-indigo-400/20"
                    style={{ animation: `pulseRing 1.45s ease-out ${delay}s infinite` }}
                />
            ))}

            {/* Ícone do baú */}
            <div
                className="text-7xl select-none z-10"
                style={{
                    animation: !isFlashing
                        ? `chestShake 0.22s ease-in-out infinite, chestGlow 1s ease-in-out infinite`
                        : undefined,
                    transform: isFlashing ? 'scale(1.5)' : undefined,
                    filter: isFlashing ? 'brightness(4)' : undefined,
                    transition: isFlashing
                        ? 'transform 0.25s ease-out, filter 0.25s ease-out'
                        : undefined,
                }}
            >
                {cfg.openingEmoji}
            </div>

            {/* Label */}
            {!isFlashing && (
                <p
                    className="mt-7 text-sm font-medium text-gray-400 z-10 tracking-wide"
                    style={{ animation: 'textFadeUp 0.3s ease-out' }}
                >
                    Abrindo {cfg.label}…
                </p>
            )}

            {/* Overlay de flash */}
            <div
                className="absolute inset-0 bg-white pointer-events-none rounded-xl transition-opacity duration-300"
                style={{ opacity: isFlashing ? 1 : 0 }}
            />
        </div>
    );
}

// ─── ChestSelectionView ───────────────────────────────────────────────────────
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
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-3" />
                <span className="text-gray-600">Carregando seu inventário…</span>
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
            <div className="flex items-center justify-center gap-2 mb-5 px-4 py-3 bg-indigo-50 rounded-xl border border-indigo-100">
                <span className="text-xl">🔑</span>
                <span className="font-bold text-indigo-700 text-lg tabular-nums">{inventory.keys}</span>
                <span className="text-sm text-indigo-500">
                    chave{inventory.keys !== 1 ? 's' : ''} disponível{inventory.keys !== 1 ? 'is' : ''}
                </span>
            </div>

            {/* Cards dos baús */}
            <div className="grid grid-cols-2 gap-3 mb-5">
                {Object.entries(CHEST_CONFIG).map(([key, cfg]) => {
                    const amount = inventory[key] || 0;
                    const isSelected = selectedChest === key;
                    const isEmpty = amount === 0;

                    return (
                        <button
                            key={key}
                            disabled={rolling || isEmpty}
                            onClick={() => setSelectedChest(key)}
                            className={`
                                relative flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-150 text-center select-none
                                ${isSelected
                                    ? `${cfg.selectedBorder} ${cfg.selectedBg} shadow-md`
                                    : isEmpty
                                        ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm cursor-pointer'
                                }
                                ${rolling ? 'pointer-events-none' : ''}
                            `}
                        >
                            {/* Círculo gradiente com ícone */}
                            <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${cfg.gradient} flex items-center justify-center mb-2.5 shadow`}>
                                <span className="text-2xl">{cfg.cardEmoji}</span>
                            </div>

                            <p className={`text-sm font-bold leading-tight mb-1 ${isSelected ? cfg.selectedText : 'text-gray-800'}`}>
                                {cfg.label}
                            </p>
                            <p className="text-xs text-gray-400 leading-snug mb-2.5">
                                {cfg.description}
                            </p>

                            {/* Badge de quantidade */}
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                                isSelected ? `bg-white ${cfg.selectedText}` :
                                isEmpty ? 'bg-gray-200 text-gray-400' :
                                cfg.badgeBg
                            }`}>
                                {amount} disponíve{amount !== 1 ? 'is' : 'l'}
                            </span>

                            {/* Check de seleção */}
                            {isSelected && (
                                <div className={`absolute top-2.5 right-2.5 ${cfg.selectedText}`}>
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Erro de roll */}
            {rollError && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                    {rollError}
                </div>
            )}

            {!canRoll && !rolling && inventory && (
                <p className="text-center text-sm text-gray-400 mb-4">
                    {inventory.keys === 0
                        ? 'Você não tem chaves suficientes.'
                        : 'Você não tem esse baú disponível.'}
                </p>
            )}

            <button
                onClick={onRoll}
                disabled={!canRoll}
                className={`w-full py-3.5 rounded-xl font-bold text-white text-base transition-all duration-200 ${
                    canRoll
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
            >
                🗝️ Abrir baú
            </button>
        </>
    );
}

// ─── ParticleBurst ────────────────────────────────────────────────────────────
function ParticleBurst({ rarity }) {
    const colors = RARITY_PARTICLE_COLORS[rarity];
    if (!colors) return null;

    const count =
        ['kTranscendent', 'transcendent'].includes(rarity) ? 22 :
        ['kUltimate', 'ultimate', 'kMythic', 'mythic'].includes(rarity) ? 17 :
        ['kLegendary', 'legendary'].includes(rarity) ? 13 : 9;

    const particles = Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
        const dist = 55 + Math.random() * 50;
        return {
            tx: `${Math.cos(angle) * dist}px`,
            ty: `${Math.sin(angle) * dist}px`,
            color: colors[i % colors.length],
            size: 5 + Math.random() * 7,
            delay: Math.random() * 0.28,
            duration: 0.55 + Math.random() * 0.3,
        };
    });

    return (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden rounded-xl">
            {particles.map((p, i) => (
                <div
                    key={i}
                    style={{
                        position: 'absolute',
                        width: `${p.size}px`,
                        height: `${p.size}px`,
                        borderRadius: '50%',
                        backgroundColor: p.color,
                        '--tx': p.tx,
                        '--ty': p.ty,
                        animation: `particleFly ${p.duration}s ease-out ${p.delay}s forwards`,
                    }}
                />
            ))}
        </div>
    );
}

// ─── ResultView ───────────────────────────────────────────────────────────────
function ResultView({ skin, onRollAgain }) {
    const style = getRarityStyle(skin.rarity);
    const splashUrl = getSkinSplashUrl(skin);
    const showImage = skin._imageLoaded && splashUrl;
    const hasParticles = !!RARITY_PARTICLE_COLORS[skin.rarity];
    const hasShine = ['kLegendary', 'legendary', 'kMythic', 'mythic', 'kUltimate', 'ultimate', 'kTranscendent', 'transcendent'].includes(skin.rarity);

    return (
        <div className="text-center py-2" style={{ animation: 'textFadeUp 0.25s ease-out' }}>
            {/* Wrapper relativo para anéis de expansão (fora do overflow-hidden do card) */}
            <div className="relative mx-auto mb-5 w-full max-w-[250px] aspect-[3/4]">
                {/* Anéis de expansão após reveal — ficam fora do card */}
                {hasParticles && (
                    <>
                        <div
                            className={`absolute inset-0 rounded-xl ring-4 ${style.ring} pointer-events-none`}
                            style={{ animation: 'expandRing 0.55s ease-out 0.05s forwards' }}
                        />
                        <div
                            className={`absolute inset-0 rounded-xl ring-2 ${style.ring} pointer-events-none opacity-60`}
                            style={{ animation: 'expandRing 0.7s ease-out 0.2s forwards' }}
                        />
                    </>
                )}

                {/* Card da skin */}
                <div
                    className={`absolute inset-0 rounded-xl overflow-hidden ring-4 ${style.ring} shadow-2xl`}
                    style={{
                        animation: `cardReveal 0.55s cubic-bezier(0.34,1.56,0.64,1) forwards${style.glow ? ', rarityGlow 2.8s ease-in-out 0.7s infinite' : ''}`,
                        '--glow-color': style.glow || 'transparent',
                    }}
                >
                    {/* Partículas */}
                    {hasParticles && <ParticleBurst rarity={skin.rarity} />}

                    {/* Imagem ou placeholder */}
                    {showImage ? (
                        <img
                            src={splashUrl}
                            alt={skin.skinName}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 text-6xl">
                            🎨
                        </div>
                    )}

                    {/* Shine sweep para lendária+ */}
                    {hasShine && (
                        <div className="absolute inset-0 pointer-events-none overflow-hidden">
                            <div
                                className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/38 to-transparent"
                                style={{ animation: 'shimmerSweep 1.1s ease-out 0.45s both' }}
                            />
                        </div>
                    )}

                    {/* Gradiente inferior + badge de raridade */}
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/88 via-black/30 to-transparent p-3">
                        <div
                            className={`text-xs font-bold uppercase tracking-widest ${style.text} bg-white/95 inline-block px-2.5 py-1 rounded-md`}
                            style={{ animation: 'badgePop 0.45s cubic-bezier(0.34,1.56,0.64,1) 0.38s both' }}
                        >
                            {style.label}
                        </div>
                    </div>
                </div>
            </div>

            {/* Nome e campeão */}
            <div style={{ animation: 'textFadeUp 0.4s ease-out 0.28s both' }}>
                <h3 className="text-xl font-bold text-gray-900 mb-1">{skin.skinName}</h3>
                <p className="text-sm text-gray-500 mb-6">{skin.championName}</p>
            </div>

            {/* Botão de abrir outro */}
            <div style={{ animation: 'textFadeUp 0.4s ease-out 0.48s both' }}>
                <button
                    onClick={onRollAgain}
                    className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold rounded-xl text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
                >
                    🗝️ Abrir outro baú
                </button>
            </div>
        </div>
    );
}