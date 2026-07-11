import { useState, useEffect, useCallback } from 'react';
import {
  GiftIcon, TicketIcon, CheckCircleIcon, ExclamationTriangleIcon,
  ArrowPathIcon, SparklesIcon,
} from '@heroicons/react/24/outline';
import { useT } from '../../../i18n/LanguageContext.jsx';
import { translateApiError } from '../../../i18n/apiErrors.js';
import ErrorState from '../../../components/ui/ErrorState.jsx';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/';

const RARITY_STYLES = {
  common:     { border: 'border-gray-300',    bg: 'bg-gray-50',      text: 'text-gray-700',      glow: '' },
  rare:       { border: 'border-blue-300',    bg: 'bg-blue-50',      text: 'text-blue-700',      glow: 'shadow-blue-100' },
  epic:       { border: 'border-purple-300',  bg: 'bg-purple-50',    text: 'text-purple-700',    glow: 'shadow-purple-100' },
  legendary:  { border: 'border-orange-300',  bg: 'bg-orange-50',    text: 'text-orange-700',    glow: 'shadow-orange-100' },
  mythic:     { border: 'border-pink-300',    bg: 'bg-pink-50',      text: 'text-pink-700',      glow: 'shadow-pink-100' },
};

function BadgeCard({ badge }) {
  const t = useT();
  const style = RARITY_STYLES[badge.rarity] || RARITY_STYLES.common;

  return (
    <div className={`relative rounded-xl border-2 ${style.border} ${style.bg} p-4 ${style.glow} shadow-sm hover:shadow-md transition-shadow`}>
      {/* Rarity ribbon */}
      <div className={`absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${style.text} bg-white border ${style.border}`}>
        {t(`badges.rarity.${badge.rarity}`)}
      </div>

      {/* Badge image */}
      <div className="flex justify-center mb-3">
        {badge.imageUrl ? (
          <img
            src={badge.imageUrl}
            alt={badge.name}
            className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md"
            style={{ boxShadow: `0 0 12px ${badge.highlightColor}40` }}
            onError={(e) => {
              e.target.style.display = 'none';
              if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
            }}
          />
        ) : null}
        <div
          className={`w-20 h-20 rounded-full flex items-center justify-center ${badge.imageUrl ? 'hidden' : ''}`}
          style={{ backgroundColor: badge.highlightColor || '#8B5CF6' }}
        >
          <GiftIcon className="h-10 w-10 text-white" />
        </div>
      </div>

      {/* Badge info */}
      <div className="text-center">
        <h4 className="text-sm font-bold text-gray-900 truncate">{badge.name}</h4>
        {badge.description && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{badge.description}</p>
        )}
        <p className="text-[10px] text-gray-400 mt-2">
          {t('badges.redeemedAt')}: {new Date(badge.redeemedAt).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}

export default function BadgesTab() {
  const t = useT();
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Redeem form state
  const [code, setCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [redeemMsg, setRedeemMsg] = useState(null);

  const loadBadges = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}expapi/v1/badges/my`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setBadges(data.badges || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadBadges(); }, [loadBadges]);

  const handleRedeem = async (e) => {
    e.preventDefault();
    if (!code.trim() || redeeming) return;

    setRedeeming(true);
    setRedeemMsg(null);
    try {
      const csrfRes = await fetch(`${API_BASE}expapi/v1/csrf-token`, { credentials: 'include' });
      const { csrfToken } = await csrfRes.json();

      const res = await fetch(`${API_BASE}expapi/v1/badges/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
        credentials: 'include',
        body: JSON.stringify({ code: code.trim() }),
      });

      const data = await res.json();
      if (res.ok) {
        setRedeemMsg({ type: 'success', text: t('badges.redeemSuccess') });
        setCode('');
        await loadBadges();
      } else {
        setRedeemMsg({ type: 'error', text: data?.code ? translateApiError(data, t) : (data?.error || t('apiError.generic')) });
      }
    } catch (e) {
      setRedeemMsg({ type: 'error', text: t('apiError.generic') });
    } finally {
      setRedeeming(false);
      setTimeout(() => setRedeemMsg(null), 5000);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-48 bg-gray-200 rounded" />
          <div className="h-10 w-full bg-gray-100 rounded" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-40 bg-gray-100 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorState title={t('common.loadError')} message={error} onRetry={loadBadges} />;
  }

  return (
    <div className="space-y-4">
      {/* Redeem code form */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <TicketIcon className="h-5 w-5 text-purple-600" />
          <h3 className="text-sm font-semibold text-gray-900">{t('badges.redeemCode')}</h3>
        </div>
        <form onSubmit={handleRedeem} className="flex gap-2">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={t('badges.redeemPlaceholder')}
            disabled={redeeming}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:opacity-50"
            maxLength={50}
          />
          <button
            type="submit"
            disabled={redeeming || !code.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {redeeming ? (
              <>
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
                {t('badges.redeeming')}
              </>
            ) : (
              t('badges.redeem')
            )}
          </button>
        </form>
        {redeemMsg && (
          <div className={`mt-3 flex items-start gap-2 text-sm ${redeemMsg.type === 'success' ? 'text-green-700' : 'text-red-700'}`}>
            {redeemMsg.type === 'success' ? (
              <CheckCircleIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />
            ) : (
              <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />
            )}
            <span>{redeemMsg.text}</span>
          </div>
        )}
      </div>

      {/* My badges grid */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <GiftIcon className="h-5 w-5 text-purple-600" />
            <h3 className="text-sm font-semibold text-gray-900">{t('badges.myBadges')}</h3>
            {badges.length > 0 && (
              <span className="text-xs text-gray-400">({badges.length})</span>
            )}
          </div>
          <button
            onClick={loadBadges}
            className="text-gray-400 hover:text-purple-600 transition-colors"
            title={t('common.refresh')}
          >
            <ArrowPathIcon className="h-4 w-4" />
          </button>
        </div>

        {badges.length === 0 ? (
          <div className="text-center py-12">
            <SparklesIcon className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">{t('badges.noBadges')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {badges.map((badge) => (
              <BadgeCard key={badge.code} badge={badge} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
