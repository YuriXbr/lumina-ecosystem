import { useState, useEffect, useCallback } from 'react';

/**
 * Lê o corpo de uma resposta de erro com segurança. O backend nem sempre
 * devolve JSON (ex: erros de middleware vazam HTML/stack trace cru quando
 * não há um error handler customizado), então tentamos JSON e caímos para
 * uma mensagem genérica em vez de propagar o conteúdo cru.
 * (mesma lógica usada em OpenChestModal, mantida idêntica por consistência)
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
 * Formata o tempo restante até `targetDate` (a partir de `now`) no formato HH:MM:SS.
 */
function formatCountdown(targetDate, now) {
    const diff = targetDate.getTime() - now;
    if (diff <= 0) return '00:00:00';
    const totalSeconds = Math.floor(diff / 1000);
    const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

/**
 * Modal de resgate da recompensa diária (3 Baús Hextech + 1 Chave por dia).
 *
 * Props:
 * - isOpen: bool
 * - onClose: () => void
 * - isLoggedIn: bool — usuário tem JWT válido
 * - discordError: bool — true quando a conta Discord não está vinculada
 * - loginWithDiscord: () => void — reaproveita o fluxo já existente no InventoryPage
 * - onRewardClaimed: (result) => void — callback opcional pra reagir ao resgate
 */
export default function DailyRewardModal({
    isOpen,
    onClose,
    isLoggedIn,
    discordError,
    loginWithDiscord,
    onRewardClaimed,
}) {
    const [status, setStatus] = useState(null);
    const [statusLoading, setStatusLoading] = useState(false);
    const [statusError, setStatusError] = useState(null);

    const [claiming, setClaiming] = useState(false);
    const [claimError, setClaimError] = useState(null);
    const [result, setResult] = useState(null);

    // Usado só pra forçar re-render do contador a cada segundo
    const [now, setNow] = useState(Date.now());

    const fetchStatus = useCallback(async () => {
        setStatusLoading(true);
        setStatusError(null);
        const token = localStorage.getItem('token');
        try {
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}expapi/v1/myinventory`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) {
                const message = await readErrorMessage(response, 'Não foi possível carregar sua diária');
                throw new Error(message);
            }
            const data = await response.json();
            setStatus(data);
        } catch (err) {
            setStatusError(err.message);
        } finally {
            setStatusLoading(false);
        }
    }, []);

    // Recarrega o status sempre que o modal é aberto (e o usuário está apto)
    useEffect(() => {
        if (isOpen && isLoggedIn && !discordError) {
            setResult(null);
            setClaimError(null);
            fetchStatus();
        }
    }, [isOpen, isLoggedIn, discordError, fetchStatus]);

    // Atualiza o contador a cada segundo enquanto o modal estiver aberto
    useEffect(() => {
        if (!isOpen) return;
        const interval = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(interval);
    }, [isOpen]);

    if (!isOpen) return null;

    const nextDailyReward = status?.nextDailyReward ? new Date(status.nextDailyReward) : null;
    const canClaim = !!status && (status.dailyRewardAvailable || (nextDailyReward && now >= nextDailyReward.getTime()));

    const handleClaim = async () => {
        setClaiming(true);
        setClaimError(null);
        const token = localStorage.getItem('token');
        const baseUrl = import.meta.env.VITE_API_BASE_URL;
        try {
            const csrfToken = await fetchCsrfToken(baseUrl);

            const response = await fetch(`${baseUrl}expapi/v1/dailyreward`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                    'X-CSRF-Token': csrfToken,
                },
                body: JSON.stringify({}),
            });

            if (!response.ok) {
                const message = await readErrorMessage(
                    response,
                    'Não foi possível resgatar sua diária agora.'
                );
                throw new Error(message);
            }

            const data = await response.json();
            setResult(data);
            onRewardClaimed?.(data);
        } catch (err) {
            setClaimError(err.message);
            // Recarrega o status pra garantir que o contador fique correto
            // mesmo se o erro foi "ainda em cooldown" (ex: clique duplicado).
            fetchStatus();
        } finally {
            setClaiming(false);
        }
    };

    const handleClose = () => {
        setResult(null);
        setClaimError(null);
        onClose();
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
        >
            <div
                className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-5 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <span className="text-2xl">🎁</span>
                        Recompensa diária
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
                            description="Você precisa estar logado no dashboard para resgatar sua diária."
                        />
                    ) : discordError ? (
                        <EmptyState
                            emoji="🔗"
                            title="Conecte sua conta Discord"
                            description="Resgatar a diária pelo dashboard exige que sua conta esteja vinculada ao Discord, já que seu inventário vive lá. Você também pode resgatar usando /daily direto no Discord."
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
                        <ClaimedView result={result} />
                    ) : (
                        <StatusView
                            status={status}
                            statusLoading={statusLoading}
                            statusError={statusError}
                            canClaim={canClaim}
                            nextDailyReward={nextDailyReward}
                            now={now}
                            claiming={claiming}
                            claimError={claimError}
                            onClaim={handleClaim}
                            onRetry={fetchStatus}
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

function StatusView({
    status,
    statusLoading,
    statusError,
    canClaim,
    nextDailyReward,
    now,
    claiming,
    claimError,
    onClaim,
    onRetry,
}) {
    if (statusLoading) {
        return (
            <div className="flex flex-col items-center py-10">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-600 mb-3"></div>
                <span className="text-gray-600">Carregando sua diária...</span>
            </div>
        );
    }

    if (statusError) {
        return (
            <EmptyState
                emoji="⚠️"
                title="Erro ao carregar"
                description={statusError}
                action={
                    <button
                        onClick={onRetry}
                        className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                    >
                        Tentar novamente
                    </button>
                }
            />
        );
    }

    if (!status) return null;

    const countdown = !canClaim && nextDailyReward ? formatCountdown(nextDailyReward, now) : null;

    return (
        <>
            <div className="text-center mb-6">
                <div className="text-5xl mb-3">📦🔑</div>
                <p className="text-gray-700">
                    Resgate <span className="font-semibold">3 Baús Hextech</span> e{' '}
                    <span className="font-semibold">1 Chave</span> grátis todos os dias!
                </p>
                {status.dailyRewardStreak > 0 && (
                    <p className="text-sm text-amber-600 font-medium mt-2">
                        🔥 Sequência atual: {status.dailyRewardStreak} dia{status.dailyRewardStreak !== 1 ? 's' : ''}
                    </p>
                )}
            </div>

            {claimError && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                    {claimError}
                </div>
            )}

            {countdown && (
                <p className="text-center text-sm text-gray-500 mb-4">
                    Próxima diária disponível em{' '}
                    <span className="font-mono font-semibold">{countdown}</span>
                </p>
            )}

            <button
                onClick={onClaim}
                disabled={!canClaim || claiming}
                className={`w-full py-3 rounded-lg font-semibold text-white transition-all ${
                    canClaim && !claiming
                        ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-lg'
                        : 'bg-gray-300 cursor-not-allowed'
                }`}
            >
                {claiming ? (
                    <span className="flex items-center justify-center gap-2">
                        <span className="inline-block h-5 w-5 border-b-2 border-white rounded-full animate-spin"></span>
                        Resgatando...
                    </span>
                ) : canClaim ? (
                    'Resgatar diária'
                ) : (
                    'Já resgatada hoje'
                )}
            </button>
        </>
    );
}

function ClaimedView({ result }) {
    return (
        <div className="text-center py-4 animate-[fadeIn_0.4s_ease-out]">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Diária resgatada!</h3>
            <p className="text-gray-600 mb-4">
                Você recebeu{' '}
                <span className="font-semibold">{result.reward.hextechChests} Baú(s) Hextech</span> e{' '}
                <span className="font-semibold">{result.reward.keys} Chave(s)</span>.
            </p>
            <p className="text-sm text-amber-600 font-medium mb-6">
                🔥 Sequência: {result.streak} dia{result.streak !== 1 ? 's' : ''} consecutivo{result.streak !== 1 ? 's' : ''}
            </p>
            <p className="text-xs text-gray-400">
                Use <span className="font-mono">/openchest</span> no Discord ou o botão &quot;Abrir baú&quot; aqui no
                dashboard pra abrir seus baús.
            </p>
        </div>
    );
}
