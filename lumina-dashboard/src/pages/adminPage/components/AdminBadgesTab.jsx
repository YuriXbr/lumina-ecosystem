import { useState, useEffect, useCallback } from 'react';
import {
  PlusIcon, TrashIcon, ArrowPathIcon, CheckCircleIcon,
  ExclamationTriangleIcon, GiftIcon, XMarkIcon,
} from '@heroicons/react/24/outline';
import { useT } from '../../../i18n/LanguageContext.jsx';
import { translateApiError } from '../../../i18n/apiErrors.js';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/';

const RARITIES = ['common', 'rare', 'epic', 'legendary', 'mythic'];
const ACCESS_LEVELS = [
  { value: 'user',          label: 'User' },
  { value: 'vipUser',       label: 'VIP' },
  { value: 'enterpriseUser',label: 'Enterprise' },
  { value: 'contentCreator',label: 'Content Creator' },
  { value: 'tester',        label: 'Tester' },
  { value: 'support',       label: 'Support' },
  { value: 'moderator',     label: 'Moderator' },
  { value: 'admin',         label: 'Admin' },
  { value: 'headadmin',     label: 'Head Admin' },
  { value: 'developer',     label: 'Developer' },
  { value: 'coowner',       label: 'Co-Owner' },
  { value: 'owner',         label: 'Owner' },
];

const RARITY_STYLES = {
  common:     'bg-gray-100 text-gray-700',
  rare:       'bg-blue-100 text-blue-700',
  epic:       'bg-purple-100 text-purple-700',
  legendary:  'bg-orange-100 text-orange-700',
  mythic:     'bg-pink-100 text-pink-700',
};

function CreateBadgeModal({ onClose, onSuccess }) {
  const t = useT();
  const [form, setForm] = useState({
    code: '',
    name: '',
    description: '',
    imageUrl: '',
    rarity: 'common',
    highlightColor: '#8B5CF6',
    availableFrom: '',
    expiresAt: '',
    maxRedemptions: 0,
    minAccessLevel: 'user',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (!form.code.trim() || form.code.trim().length < 3) {
      setError(t('badges.admin.codeHint'));
      return;
    }
    if (!form.name.trim()) {
      setError(t('badges.admin.name'));
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const csrfRes = await fetch(`${API_BASE}expapi/v1/csrf-token`, { credentials: 'include' });
      const { csrfToken } = await csrfRes.json();

      const body = {
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        description: form.description.trim(),
        imageUrl: form.imageUrl.trim(),
        rarity: form.rarity,
        highlightColor: form.highlightColor,
        availableFrom: form.availableFrom ? new Date(form.availableFrom).toISOString() : undefined,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
        maxRedemptions: Number(form.maxRedemptions) || 0,
        minAccessLevel: form.minAccessLevel,
      };

      const res = await fetch(`${API_BASE}expapi/v1/admin/badges`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        setError(data?.code ? translateApiError(data, t) : (data?.error || t('apiError.generic')));
      }
    } catch (e) {
      setError(t('apiError.generic'));
    } finally {
      setSaving(false);
    }
  };

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl">
          <h2 className="text-lg font-semibold text-gray-900">{t('badges.admin.createNew')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleCreate} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center gap-2 text-sm text-red-700">
              <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('badges.admin.code')} *</label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => update('code', e.target.value.toUpperCase())}
                placeholder="BETA2025"
                maxLength={30}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md font-mono focus:ring-2 focus:ring-purple-500"
              />
              <p className="text-[10px] text-gray-400 mt-0.5">{t('badges.admin.codeHint')}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('badges.admin.name')} *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                maxLength={60}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">{t('badges.admin.description')}</label>
            <textarea
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              rows={2}
              maxLength={200}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">{t('badges.admin.imageUrl')}</label>
            <input
              type="url"
              value={form.imageUrl}
              onChange={(e) => update('imageUrl', e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('badges.admin.rarity')}</label>
              <select
                value={form.rarity}
                onChange={(e) => update('rarity', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
              >
                {RARITIES.map(r => (
                  <option key={r} value={r}>{t(`badges.rarity.${r}`)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('badges.admin.highlightColor')}</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={form.highlightColor}
                  onChange={(e) => update('highlightColor', e.target.value)}
                  className="h-9 w-12 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={form.highlightColor}
                  onChange={(e) => update('highlightColor', e.target.value)}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md font-mono focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('badges.admin.availableFrom')}</label>
              <input
                type="datetime-local"
                value={form.availableFrom}
                onChange={(e) => update('availableFrom', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('badges.admin.expiresAt')}</label>
              <input
                type="datetime-local"
                value={form.expiresAt}
                onChange={(e) => update('expiresAt', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
              />
              <p className="text-[10px] text-gray-400 mt-0.5">{t('badges.admin.expiresNever')}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('badges.admin.maxRedemptions')}</label>
              <input
                type="number"
                min="0"
                value={form.maxRedemptions}
                onChange={(e) => update('maxRedemptions', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
              />
              <p className="text-[10px] text-gray-400 mt-0.5">{t('badges.admin.maxRedemptionsHint')}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('badges.admin.minAccessLevel')}</label>
              <select
                value={form.minAccessLevel}
                onChange={(e) => update('minAccessLevel', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
              >
                {ACCESS_LEVELS.map(l => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
            >
              {saving ? t('badges.admin.creating') : t('badges.admin.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminBadgesTab() {
  const t = useT();
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [msg, setMsg] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}expapi/v1/admin/badges`, {
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

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (code) => {
    if (!window.confirm(t('badges.admin.deleteConfirm'))) return;
    try {
      const csrfRes = await fetch(`${API_BASE}expapi/v1/csrf-token`, { credentials: 'include' });
      const { csrfToken } = await csrfRes.json();
      const res = await fetch(`${API_BASE}expapi/v1/admin/badges/${code}`, {
        method: 'DELETE',
        headers: { 'X-CSRF-Token': csrfToken },
        credentials: 'include',
      });
      if (res.ok) {
        setMsg({ type: 'success', text: t('common.saveSuccess') });
        await load();
      } else {
        const err = await res.json().catch(() => ({}));
        setMsg({ type: 'error', text: err?.error || t('apiError.generic') });
      }
    } catch (e) {
      setMsg({ type: 'error', text: t('apiError.generic') });
    }
    setTimeout(() => setMsg(null), 4000);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GiftIcon className="h-5 w-5 text-purple-600" />
          <h3 className="text-sm font-semibold text-gray-900">{t('badges.admin.title')}</h3>
          {badges.length > 0 && (
            <span className="text-xs text-gray-400">({badges.length})</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="text-gray-400 hover:text-purple-600 transition-colors"
            title={t('common.refresh')}
          >
            <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
            {t('badges.admin.createNew')}
          </button>
        </div>
      </div>

      {/* Message */}
      {msg && (
        <div className={`rounded-lg px-4 py-3 flex items-center gap-2 text-sm ${msg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {msg.type === 'success' ? <CheckCircleIcon className="h-4 w-4" /> : <ExclamationTriangleIcon className="h-4 w-4" />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {t('common.loadError')}: {error}
        </div>
      )}

      {/* Badges table */}
      {loading ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8">
          <div className="animate-pulse space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded" />
            ))}
          </div>
        </div>
      ) : badges.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <GiftIcon className="h-12 w-12 mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">{t('badges.admin.noBadges')}</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('badges.admin.code')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('badges.admin.name')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('badges.admin.rarity')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('badges.admin.redemptions')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.status')}</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {badges.map(badge => (
                <tr key={badge.code} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono font-medium text-gray-900">{badge.code}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    <div className="flex items-center gap-2">
                      {badge.imageUrl && (
                        <img src={badge.imageUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                      )}
                      <div>
                        <div className="font-medium">{badge.name}</div>
                        {badge.description && (
                          <div className="text-xs text-gray-400 truncate max-w-xs">{badge.description}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${RARITY_STYLES[badge.rarity] || RARITY_STYLES.common}`}>
                      {t(`badges.rarity.${badge.rarity}`)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {badge.redemptionCount}
                    {badge.maxRedemptions > 0 && (
                      <span className="text-gray-400"> / {badge.maxRedemptions}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${badge.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {badge.active ? t('badges.admin.active') : t('badges.admin.inactive')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(badge.code)}
                      className="text-red-400 hover:text-red-600"
                      title={t('badges.admin.delete')}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <CreateBadgeModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => {
            setMsg({ type: 'success', text: t('badges.admin.createSuccess') });
            setTimeout(() => setMsg(null), 4000);
            load();
          }}
        />
      )}
    </div>
  );
}
