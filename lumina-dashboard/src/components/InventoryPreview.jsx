import { GiftIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { useT } from '../i18n/LanguageContext.jsx';

/**
 * Preview do inventário do usuário na Área de Membros.
 * Mostra baús, chaves e streak diário — clica para abrir o inventário completo.
 */
export default function InventoryPreview({ inventory, loading, error, onRetry }) {
  const t = useT();
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
          <GiftIcon className="h-4 w-4 text-purple-600" />
          {t('inventory.title')}
        </h3>
        <a href="/inventory" className="text-xs text-purple-600 hover:text-purple-700 font-medium">
          {t("common.viewAll")} →
        </a>
      </div>

      {loading && (
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 text-xs text-red-700">
          <p>{t("inventory.loadError", { defaultValue: t("common.loadError") })}</p>
          <button onClick={onRetry} className="text-red-700 underline mt-1 font-medium">
            {t('common.tryAgain')}
          </button>
        </div>
      )}

      {!loading && !error && inventory && (
        <div className="grid grid-cols-3 gap-2">
          <StatBox label={t("inventory.items.hextechChests")} value={inventory.hextechChests ?? 0} color="from-blue-400 to-blue-600" />
          <StatBox label={t("inventory.items.masterworkChests")} value={inventory.masterWorkChests ?? 0} color="from-purple-400 to-purple-600" />
          <StatBox label={t("inventory.items.keys")} value={inventory.keys ?? 0} color="from-yellow-400 to-yellow-600" />
        </div>
      )}

      {!loading && !error && inventory?.dailyRewardAvailable && (
        <a
          href="/inventory"
          className="mt-3 block w-full text-center py-2 text-sm font-medium bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
        >
          🎁 {t("inventory.daily.title")}
        </a>
      )}

      {!loading && !error && inventory && !inventory.dailyRewardAvailable && inventory.nextDailyReward && (
        <p className="mt-3 text-xs text-gray-500 text-center">
          {t('inventory.daily.nextDaily', { defaultValue: 'Next daily reward available in' })} {new Date(inventory.nextDailyReward).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
          {inventory.dailyRewardStreak > 0 && ` • 🔥 ${t('inventory.daily.daysInRow', { count: inventory.dailyRewardStreak, defaultValue: '{count} days in a row' })}`}
        </p>
      )}
    </div>
  );
}

function StatBox({ label, value, color }) {
  return (
    <div className={`relative overflow-hidden rounded-lg p-3 text-white bg-gradient-to-br ${color}`}>
      <div className="text-xl font-bold">{value}</div>
      <div className="text-[10px] opacity-90 leading-tight mt-0.5">{label}</div>
      <SparklesIcon className="absolute -bottom-1 -right-1 h-8 w-8 opacity-20" />
    </div>
  );
}
