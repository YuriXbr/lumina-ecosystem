import { useState, useEffect, useCallback } from 'react';
import { XMarkIcon, GiftIcon, FireIcon, KeyIcon, CubeIcon } from '@heroicons/react/24/outline';

/**
 * URL base da API.
 * Em dev: o proxy do Vite encaminha /expapi → localhost:3000.
 * Em prod: VITE_API_BASE_URL configurado no painel da Vercel.
 */
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/';

// ─── Estilos / Keyframes (CSS-only) ──────────────────────────────────────────
function ModalStyles() {
  return (
    <style>{`
      @keyframes drmOverlayIn {
        0%   { opacity: 0; }
        100% { opacity: 1; }
      }
      @keyframes drmModalIn {
        0%   { opacity: 0; transform: scale(0.92) translateY(16px); }
        100% { opacity: 1; transform: scale(1) translateY(0); }
      }
      @keyframes drmChestGlow {
        0%, 100% { box-shadow: 0 0 24px rgba(168,85,247,0.55), 0 0 56px rgba(168,85,247,0.3); }
        50%      { box-shadow: 0 0 44px rgba(168,85,247,0.9),  0 0 100px rgba(168,85,247,0.6); }
      }
      @keyframes drmChestPulse {
        0%, 100% { transform: scale(1); }
        50%      { transform: scale(1.05); }
      }
      @keyframes drmRingPulse {
        0%   { transform: scale(0.85); opacity: 0.55; }
        100% { transform: scale(1.9);  opacity: 0; }
      }
      @keyframes drmBounceIn {
        0%   { opacity: 0; transform: scale(0.5) translateY(24px); }
        60%  { transform: scale(1.08) translateY(-6px); }
        100% { opacity: 1; transform: scale(1) translateY(0); }
      }
      @keyframes drmFadeUp {
        0%   { opacity: 0; transform: translateY(12px); }
        100% { opacity: 1; transform: translateY(0); }
      }
      @keyframes drmConfettiFall {
        0%   { transform: translateY(-15vh) rotate(0deg);   opacity: 1; }
        100% { transform: translateY(105vh) rotate(720deg); opacity: 0; }
      }
      @keyframes drmSpin {
        to { transform: rotate(360deg); }
      }
    `}</style>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Lê mensagem de erro de uma Response (JSON ou texto), com fallback seguro.
 * O backend nem sempre devolve JSON em erros de middleware, então tentamos
 * JSON primeiro e caímos para uma mensagem genérica.
 */
async function readErrorMessage(response, fallback) {
  try {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await response.json();
      return body.error || body.message || fallback;
    }
  } catch {
    // corpo não era JSON, cai no fallback
  }
  return fallback;
}

/**
 * Busca um token CSRF fresco em /expapi/v1/csrf-token. Essa rota seta um
 * cookie httpOnly no navegador (por isso credentials: 'include' é obrigatório)
 * e devolve o token que deve ser ecoado de volta no header X-CSRF-Token nas
 * próximas requisições que mudam estado.
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
 * Formata o tempo restante até `targetDate` no formato HH:MM:SS.
 */
function formatCountdown(targetDate, now) {
  if (!targetDate) return '00:00:00';
  const diff = targetDate.getTime() - now;
  if (diff <= 0) return '00:00:00';
  const totalSeconds = Math.floor(diff / 1000);
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

// ─── Componentes auxiliares ──────────────────────────────────────────────────

function Confetti() {
  // 24 pedaços de confete com cores, tamanhos e delays aleatórios.
  const colors = ['#a855f7', '#f59e0b', '#ec4899', '#22c55e', '#3b82f6', '#ef4444', '#f97316'];
  const pieces = Array.from({ length: 24 }, (_, i) => {
    const left = Math.random() * 100;
    const delay = Math.random() * 0.6;
    const duration = 2.4 + Math.random() * 1.6;
    const size = 6 + Math.random() * 8;
    const color = colors[i % colors.length];
    const rounded = Math.random() > 0.5;
    return (
      <span
        key={i}
        style={{
          position: 'absolute',
          top: 0,
          left: `${left}%`,
          width: `${size}px`,
          height: `${size * (rounded ? 1 : 1.6)}px`,
          backgroundColor: color,
          borderRadius: rounded ? '50%' : '2px',
          animation: `drmConfettiFall ${duration}s ${delay}s linear forwards`,
          pointerEvents: 'none',
        }}
      />
    );
  });
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 60,
      }}
    >
      {pieces}
    </div>
  );
}

function ChestAnimation() {
  // Baú CSS-only: glow pulsante + anel expansivo. Sem a animação completa
  // do OpenChestModal (shake / flash / partículas) — fica mais leve.
  return (
    <div className="relative flex items-center justify-center py-6">
      {/* Anel expansivo */}
      <span
        className="absolute h-28 w-28 rounded-full border-2 border-purple-400"
        style={{ animation: 'drmRingPulse 1.8s ease-out infinite' }}
      />
      <span
        className="absolute h-28 w-28 rounded-full border-2 border-fuchsia-400"
        style={{ animation: 'drmRingPulse 1.8s ease-out infinite 0.9s' }}
      />

      {/* Baú */}
      <div
        className="relative h-24 w-24 rounded-2xl bg-gradient-to-br from-purple-500 via-fuchsia-500 to-indigo-500 flex items-center justify-center"
        style={{
          animation: 'drmChestGlow 2s ease-in-out infinite, drmChestPulse 2s ease-in-out infinite',
        }}
      >
        <GiftIcon className="h-12 w-12 text-white drop-shadow-lg" />
      </div>
    </div>
  );
}

function RewardCard({ icon: Icon, label, value, delay, gradient }) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl p-4 text-white bg-gradient-to-br ${gradient} shadow-md`}
      style={{
        animation: `drmBounceIn 0.5s ${delay}s cubic-bezier(0.34, 1.56, 0.64, 1) both`,
      }}
    >
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div className="min-w-0">
          <div className="text-2xl font-bold leading-none">{value}</div>
          <div className="text-[11px] opacity-90 mt-1 leading-tight">{label}</div>
        </div>
      </div>
    </div>
  );
}

function ClaimedView({ result }) {
  // A resposta do /expapi/v1/dailyreward é flat:
  // { keys, hextechChests, masterWorkChests, dailyRewardStreak, nextDailyReward }
  const keys = result?.keys ?? 0;
  const hextech = result?.hextechChests ?? 0;
  const masterwork = result?.masterWorkChests ?? 0;
  const streak = result?.dailyRewardStreak ?? 0;

  return (
    <>
      <Confetti />

      <div
        className="text-center"
        style={{ animation: 'drmFadeUp 0.4s ease-out both' }}
      >
        <div className="text-5xl mb-2">🎉</div>
        <h3 className="text-xl font-bold text-gray-900">Recompensa resgatada!</h3>
        <p className="text-sm text-gray-600 mt-1">
          Você recebeu os seguintes itens:
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
        <RewardCard
          icon={KeyIcon}
          label="Chaves"
          value={keys}
          delay={0.1}
          gradient="from-yellow-400 to-amber-500"
        />
        <RewardCard
          icon={CubeIcon}
          label="Baús Hextech"
          value={hextech}
          delay={0.2}
          gradient="from-indigo-500 to-purple-600"
        />
        {masterwork > 0 && (
          <RewardCard
            icon={CubeIcon}
            label="Baús Masterwork"
            value={masterwork}
            delay={0.3}
            gradient="from-amber-400 to-orange-500"
          />
        )}
      </div>

      {streak > 0 && (
        <div
          className="mt-5 flex items-center justify-center gap-1.5 text-sm text-orange-600 font-medium"
          style={{ animation: 'drmFadeUp 0.4s 0.35s ease-out both' }}
        >
          <FireIcon className="h-4 w-4" />
          Sequência: {streak} dia{streak !== 1 ? 's' : ''} consecutivo{streak !== 1 ? 's' : ''}
        </div>
      )}

      <p className="mt-4 text-xs text-gray-400 text-center">
        Use o comando <span className="font-mono">/openchest</span> no Discord ou acesse o
        inventário para abrir seus baús.
      </p>
    </>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────

/**
 * Modal de resgate da recompensa diária.
 *
 * Props:
 *  - isOpen: bool — controla a visibilidade do modal.
 *  - onClose: () => void — fecha o modal.
 *  - onClaimed: (result) => void — callback chamado em caso de sucesso com a
 *    resposta do backend ({ keys, hextechChests, masterWorkChests,
 *    dailyRewardStreak, nextDailyReward }). Útil para o pai atualizar o
 *    inventário sem precisar de um novo fetch.
 *
 * Fluxo:
 *  1. Ao abrir, busca o status atual em /expapi/v1/myinventory (streak +
 *     próxima disponibilidade).
 *  2. Se a recompensa estiver disponível, mostra o baú animado + botão
 *     "Resgatar Recompensa".
 *  3. Click no botão → busca CSRF token → POST /expapi/v1/dailyreward.
 *  4. Em caso de sucesso, mostra a celebração (confetti + bounce-in) e
 *     dispara onClaimed.
 *  5. Em caso de erro, mostra mensagem inline.
 */
export default function DailyRewardModal({ isOpen, onClose, onClaimed }) {
  const [status, setStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState(null);

  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState(null);
  const [result, setResult] = useState(null);

  // Tick a cada segundo para o countdown.
  const [now, setNow] = useState(Date.now());

  const fetchStatus = useCallback(async () => {
    setStatusLoading(true);
    setStatusError(null);
    try {
      const res = await fetch(`${API_BASE}expapi/v1/myinventory`, {
        credentials: 'include',
      });
      if (!res.ok) {
        const msg = await readErrorMessage(res, 'Não foi possível carregar sua recompensa diária.');
        throw new Error(msg);
      }
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      setStatusError(err.message);
    } finally {
      setStatusLoading(false);
    }
  }, []);

  // Reset + busca status sempre que o modal abre.
  useEffect(() => {
    if (isOpen) {
      setResult(null);
      setClaimError(null);
      fetchStatus();
    }
  }, [isOpen, fetchStatus]);

  // Countdown.
  useEffect(() => {
    if (!isOpen) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isOpen]);

  // ESC para fechar.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Bloqueia scroll do body quando aberto.
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const nextDailyReward = status?.nextDailyReward ? new Date(status.nextDailyReward) : null;
  const canClaim =
    !!status &&
    (status.dailyRewardAvailable || (nextDailyReward && now >= nextDailyReward.getTime()));

  const handleClaim = async () => {
    setClaiming(true);
    setClaimError(null);
    try {
      const csrfToken = await fetchCsrfToken(API_BASE);

      const res = await fetch(`${API_BASE}expapi/v1/dailyreward`, {
        method: 'POST',
        headers: {
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
      });

      if (!res.ok) {
        const msg = await readErrorMessage(res, 'Não foi possível resgatar sua recompensa agora.');
        throw new Error(msg);
      }

      const data = await res.json();
      setResult(data);
      onClaimed?.(data);
    } catch (err) {
      setClaimError(err.message);
      // Recarrega o status para garantir que o contador fique correto
      // mesmo se o erro foi "ainda em cooldown".
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

  const streak = status?.dailyRewardStreak ?? result?.dailyRewardStreak ?? 0;
  const countdown = nextDailyReward && !canClaim ? formatCountdown(nextDailyReward, now) : null;

  return (
    <>
      <ModalStyles />

      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        style={{ animation: 'drmOverlayIn 0.2s ease-out' }}
        onClick={handleClose}
        role="dialog"
        aria-modal="true"
        aria-label="Recompensa diária"
      >
        <div
          className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
          style={{ animation: 'drmModalIn 0.25s cubic-bezier(0.34, 1.2, 0.64, 1)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header com gradiente roxo */}
          <div className="relative bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
            <div className="absolute inset-0 opacity-25 pointer-events-none"
              style={{
                background: 'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.4) 50%, transparent 70%)',
                backgroundSize: '200% 100%',
                animation: 'drmOverlayIn 0.2s ease-out',
              }}
            />
            <h2 className="relative text-lg font-bold text-white flex items-center gap-2">
              <GiftIcon className="h-5 w-5" />
              Recompensa Diária
            </h2>
            <button
              onClick={handleClose}
              className="relative text-white/80 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
              aria-label="Fechar"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Corpo */}
          <div className="p-6">
            {/* Erro de carregamento do status — não bloqueia o resgate se
                o usuário souber que tem direito. */}
            {statusError && !status && !result && (
              <div className="text-center py-6">
                <div className="text-4xl mb-3">⚠️</div>
                <h3 className="text-base font-semibold text-gray-900 mb-1">Erro ao carregar</h3>
                <p className="text-sm text-gray-600 mb-4">{statusError}</p>
                <button
                  onClick={fetchStatus}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 transition-colors"
                >
                  Tentar novamente
                </button>
              </div>
            )}

            {/* Loading inicial */}
            {statusLoading && !status && !result && (
              <div className="flex flex-col items-center py-10">
                <div
                  className="rounded-full h-10 w-10 border-4 border-purple-200 border-t-purple-600"
                  style={{ animation: 'drmSpin 0.8s linear infinite' }}
                />
                <span className="text-gray-600 mt-3 text-sm">Carregando...</span>
              </div>
            )}

            {/* Sucesso — celebração */}
            {result && <ClaimedView result={result} />}

            {/* Estado padrão — resgate */}
            {!result && status && (
              <>
                <ChestAnimation />

                <div className="text-center mb-5">
                  <p className="text-gray-700 text-sm">
                    Resgate <span className="font-semibold">3 Baús Hextech</span> e{' '}
                    <span className="font-semibold">1 Chave</span> grátis todos os dias!
                  </p>
                  {streak > 0 && (
                    <p className="inline-flex items-center gap-1 text-sm text-orange-600 font-medium mt-2">
                      <FireIcon className="h-4 w-4" />
                      Sequência atual: {streak} dia{streak !== 1 ? 's' : ''}
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
                    Próxima recompensa em{' '}
                    <span className="font-mono font-semibold text-gray-700">{countdown}</span>
                  </p>
                )}

                <button
                  onClick={handleClaim}
                  disabled={!canClaim || claiming}
                  className={`w-full py-3 rounded-lg font-semibold text-white transition-all flex items-center justify-center gap-2 ${
                    canClaim && !claiming
                      ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 shadow-lg hover:shadow-xl active:scale-[0.98]'
                      : 'bg-gray-300 cursor-not-allowed'
                  }`}
                >
                  {claiming ? (
                    <>
                      <span
                        className="inline-block h-5 w-5 border-2 border-white/40 border-t-white rounded-full"
                        style={{ animation: 'drmSpin 0.8s linear infinite' }}
                      />
                      Resgatando...
                    </>
                  ) : (
                    <>
                      <GiftIcon className="h-5 w-5" />
                      Resgatar Recompensa
                    </>
                  )}
                </button>

                {!canClaim && !claiming && (
                  <p className="text-center text-xs text-gray-400 mt-3">
                    Você já resgatou sua recompensa hoje. Volte amanhã!
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
