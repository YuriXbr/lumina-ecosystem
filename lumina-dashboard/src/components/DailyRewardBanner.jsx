import { useState, useEffect, useCallback } from 'react';
import { GiftIcon, FireIcon, ClockIcon } from '@heroicons/react/24/outline';

/**
 * URL base da API.
 * Em dev: o proxy do Vite encaminha /expapi → localhost:3000.
 * Em prod: VITE_API_BASE_URL configurado no painel da Vercel.
 */
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/';

/**
 * Formata o tempo restante até `targetDate` no formato HH:MM:SS.
 */
function formatCountdown(targetDate, now) {
  if (!targetDate) return '';
  const diff = targetDate.getTime() - now;
  if (diff <= 0) return '00:00:00';
  const totalSeconds = Math.floor(diff / 1000);
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

/**
 * Lê uma mensagem de erro de uma Response com segurança (JSON ou texto).
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
 * Banner da recompensa diária exibido no topo da Área de Membros.
 *
 * Comportamento:
 *  - Se a recompensa diária estiver disponível: banner roxo em gradiente com
 *    ícone de presente + mensagem + botão "Resgatar" (chama `onClaim`).
 *  - Se já foi resgatada hoje: banner cinza sutil com streak + próxima
 *    disponibilidade (countdown HH:MM:SS).
 *
 * Props:
 *  - onClaim: () => void — callback para abrir o modal de resgate.
 *  - inventory: objeto opcional do /expapi/v1/myinventory. Se não for passado,
 *    o banner busca o inventário por conta própria.
 */
export default function DailyRewardBanner({ onClaim, inventory: inventoryProp }) {
  // Estado local só é usado quando o pai não passa `inventory`.
  const [localInventory, setLocalInventory] = useState(null);
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState(null);

  // Tick a cada segundo para atualizar o countdown.
  const [now, setNow] = useState(Date.now());

  const fetchInventory = useCallback(async () => {
    setLocalLoading(true);
    setLocalError(null);
    try {
      const res = await fetch(`${API_BASE}expapi/v1/myinventory`, {
        credentials: 'include',
      });
      if (!res.ok) {
        const msg = await readErrorMessage(res, 'Não foi possível carregar sua recompensa diária.');
        throw new Error(msg);
      }
      const data = await res.json();
      setLocalInventory(data);
    } catch (e) {
      setLocalError(e.message);
    } finally {
      setLocalLoading(false);
    }
  }, []);

  useEffect(() => {
    // Só busca localmente se o pai não tiver passado um inventário.
    if (inventoryProp === undefined) {
      fetchInventory();
    }
  }, [inventoryProp, fetchInventory]);

  // Atualiza o relógio a cada segundo (apenas quando há cooldown para mostrar).
  const inventory = inventoryProp !== undefined ? inventoryProp : localInventory;
  const showCountdown = inventory && !inventory.dailyRewardAvailable && inventory.nextDailyReward;
  useEffect(() => {
    if (!showCountdown) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [showCountdown]);

  // Loading state — esqueleto sutil.
  if (inventoryProp === undefined && localLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 animate-pulse h-16" />
    );
  }

  // Erro silencioso: não bloqueia a UI, apenas não mostra o banner.
  if (inventoryProp === undefined && localError && !localInventory) {
    return null;
  }

  if (!inventory) return null;

  const available = !!inventory.dailyRewardAvailable;
  const streak = inventory.dailyRewardStreak ?? 0;
  const nextDailyReward = inventory.nextDailyReward ? new Date(inventory.nextDailyReward) : null;
  const countdown = nextDailyReward ? formatCountdown(nextDailyReward, now) : '';

  if (available) {
    // ─── Banner roxo: recompensa disponível ────────────────────────────────
    return (
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 shadow-lg">
        {/* Brilho animado de fundo */}
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            background:
              'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.25) 50%, transparent 70%)',
            backgroundSize: '200% 100%',
            animation: 'drmBannerShimmer 3s linear infinite',
          }}
        />
        <style>{`
          @keyframes drmBannerShimmer {
            0%   { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
          @keyframes drmBannerGiftPulse {
            0%, 100% { transform: scale(1) rotate(0deg); }
            50%      { transform: scale(1.12) rotate(-3deg); }
          }
        `}</style>

        <div className="relative flex items-center gap-4 p-4 sm:p-5">
          {/* Ícone de presente */}
          <div className="flex-shrink-0">
            <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center"
              style={{ animation: 'drmBannerGiftPulse 1.6s ease-in-out infinite' }}
            >
              <GiftIcon className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
            </div>
          </div>

          {/* Texto */}
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm sm:text-base">
              Recompensa diária disponível!
            </p>
            <p className="text-white/80 text-xs sm:text-sm mt-0.5">
              Resgate 3 Baús Hextech e 1 Chave grátis.
              {streak > 0 && (
                <span className="inline-flex items-center gap-1 ml-1.5 text-amber-200">
                  <FireIcon className="h-3.5 w-3.5" />
                  {streak} dia{streak !== 1 ? 's' : ''} seguidos
                </span>
              )}
            </p>
          </div>

          {/* Botão Resgatar */}
          <button
            onClick={onClaim}
            className="flex-shrink-0 inline-flex items-center gap-1.5 px-4 sm:px-5 py-2 sm:py-2.5 bg-white text-purple-700 font-semibold text-sm rounded-lg shadow-sm hover:bg-purple-50 hover:shadow-md active:scale-95 transition-all"
          >
            <GiftIcon className="h-4 w-4" />
            Resgatar
          </button>
        </div>
      </div>
    );
  }

  // ─── Banner cinza: já resgatado ──────────────────────────────────────────
  if (streak > 0 || nextDailyReward) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 sm:p-4">
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Ícone */}
          <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-gray-200 flex items-center justify-center">
            <FireIcon className="h-5 w-5 text-orange-500" />
          </div>

          {/* Texto */}
          <div className="flex-1 min-w-0">
            <p className="text-gray-700 text-sm font-medium">
              {streak > 0 ? (
                <>
                  Sequência de <span className="text-orange-600 font-semibold">{streak} dia{streak !== 1 ? 's' : ''}</span> consecutivos!
                </>
              ) : (
                'Recompensa diária já resgatada hoje.'
              )}
            </p>
            {countdown && (
              <p className="text-gray-500 text-xs mt-0.5 flex items-center gap-1">
                <ClockIcon className="h-3.5 w-3.5" />
                Próxima em <span className="font-mono font-semibold text-gray-700">{countdown}</span>
              </p>
            )}
          </div>

          {/* Link para o inventário */}
          <a
            href="/inventory"
            className="flex-shrink-0 text-xs sm:text-sm text-purple-600 hover:text-purple-700 font-medium"
          >
            Inventário →
          </a>
        </div>
      </div>
    );
  }

  return null;
}
