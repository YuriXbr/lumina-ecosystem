import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeftIcon, ServerIcon, CheckIcon, ArrowPathIcon,
  ExclamationTriangleIcon, Cog6ToothIcon
} from '@heroicons/react/24/outline';
import AppShell from '../../components/AppShell';
import ErrorState from '../../components/ui/ErrorState';
import { SkeletonLine } from '../../components/ui/Skeleton';
import { useT } from '../../i18n/LanguageContext.jsx';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

function GuildIcon({ guild, size = 48 }) {
  if (guild?.icon) {
    return (
      <img
        src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=64`}
        alt={guild.name}
        className="rounded-full"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {guild?.name?.[0]?.toUpperCase() || '?'}
    </div>
  );
}

export default function ServerSettingsPage() {
  const t = useT();
  const { guildId } = useParams();
  const navigate = useNavigate();

  const [guild, setGuild] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);

  // Configurações editáveis
  const [config, setConfig] = useState({
    prefix: 'l!',
    language: 'pt-BR',
    welcomeEnabled: false,
    moderationEnabled: false,
    musicEnabled: false,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Busca dados da guilda do Discord
      const res = await fetch(`${API_BASE}expapi/v1/discord/guild/${guildId}`, {
        headers: {},
        credentials: 'include',
      });
      if (!res.ok) {
        let detail = `HTTP ${res.status}`;
        try {
          const body = await res.json();
          if (body?.error) detail = body.error;
        } catch {}
        throw new Error(detail);
      }
      const data = await res.json();

      // Busca config atual do bot nesta guilda (via admin/guilds se for admin,
      // ou usa os dados do my-guilds que já incluem botConfig)
      const myGuildsRes = await fetch(`${API_BASE}expapi/v1/my-guilds`, {
        headers: {},
        credentials: 'include',
      });
      let botConfig = null;
      if (myGuildsRes.ok) {
        const myGuildsData = await myGuildsRes.json();
        const found = (myGuildsData.guilds || []).find(g => g.id === guildId);
        if (found) botConfig = found.botConfig;
      }

      setGuild({ id: data.id, name: data.name, icon: data.icon, memberCount: data.approximate_member_count || data.member_count || 0 });

      if (botConfig) {
        setConfig({
          prefix: botConfig.prefix || 'l!',
          language: botConfig.language || 'pt-BR',
          welcomeEnabled: botConfig.welcomeEnabled || false,
          moderationEnabled: botConfig.moderationEnabled || false,
          musicEnabled: botConfig.musicEnabled || false,
        });
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const csrfRes = await fetch(`${API_BASE}expapi/v1/csrf-token`, { credentials: 'include' });
      const { csrfToken } = await csrfRes.json();

      const res = await fetch(`${API_BASE}expapi/v1/admin/guilds/${guildId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        credentials: 'include',
        body: JSON.stringify({
          prefix: config.prefix,
          guildLocale: config.language,
          memberWelcomeToggle: config.welcomeEnabled,
          moderationChannelId: config.moderationEnabled ? 'configured' : '',
          djEnabled: config.musicEnabled,
        }),
      });

      if (res.ok) {
        setSaveMsg({ type: 'success', text: t('serverSettings.saved') });
      } else {
        const err = await res.json().catch(() => ({}));
        setSaveMsg({ type: 'error', text: err.error || `HTTP ${res.status}` });
      }
    } catch (e) {
      setSaveMsg({ type: 'error', text: t('common.connectionError') });
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 4000);
    }
  };

  if (loading) {
    return (
      <AppShell maxWidth="max-w-4xl" title={t("guild.loadingServer")} backTo="/members" backLabel={t("nav.members")}>
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
            <div className="h-16 w-16 rounded-full bg-gray-200 animate-pulse" />
            <SkeletonLine width="40%" height="1.5rem" />
            <div className="h-10 w-full bg-gray-100 rounded animate-pulse" />
            <div className="h-10 w-full bg-gray-100 rounded animate-pulse" />
          </div>
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell maxWidth="max-w-4xl" title={t("guild.error")} backTo="/members" backLabel={t("nav.members")}>
        <ErrorState
          title={t("guild.loadServerError")}
          message={t("guild.loadSettingsErrorDesc")}
          detail={error}
          onRetry={load}
        />
      </AppShell>
    );
  }

  return (
    <AppShell maxWidth="max-w-4xl" title={guild?.name || t("serverSettings.title")} subtitle={t("serverSettings.subtitle")} backTo="/members" backLabel={t("nav.members")}>
      <div className="space-y-6">
        {/* Cabeçalho do servidor */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 flex items-center gap-4">
          <GuildIcon guild={guild} size={64} />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 font-mono">{guild?.id}</p>
            <p className="text-xs text-gray-500 mt-1">
              {t('guild.memberCount', { count: (guild?.memberCount || 0).toLocaleString(undefined) })}
            </p>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-md text-xs font-medium">
            <CheckIcon className="h-3 w-3" />
            {t('guild.botActive')}
          </div>
        </div>

        {/* Mensagem de save */}
        {saveMsg && (
          <div className={`px-4 py-2.5 rounded-md text-sm flex items-center gap-2 ${
            saveMsg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {saveMsg.type === 'success' ? <CheckIcon className="h-4 w-4" /> : <ExclamationTriangleIcon className="h-4 w-4" />}
            {saveMsg.text}
          </div>
        )}

        {/* Configurações */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Cog6ToothIcon className="h-5 w-5 text-purple-600" />
            <h3 className="text-base font-semibold text-gray-900">{t("serverSettings.title")}</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t("serverSettings.general.prefix")}</label>
              <input
                type="text"
                value={config.prefix}
                onChange={(e) => setConfig(c => ({ ...c, prefix: e.target.value }))}
                className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-mono"
                maxLength={5}
              />
              <p className="text-[10px] text-gray-400 mt-1">{t("guild.prefixHint")}</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t("serverSettings.general.language")}</label>
              <select
                value={config.language}
                onChange={(e) => setConfig(c => ({ ...c, language: e.target.value }))}
                className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="pt-BR">Português (Brasil)</option>
                <option value="en-US">English (US)</option>
                <option value="es-ES">Español</option>
              </select>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-gray-100">
            <h4 className="text-sm font-medium text-gray-900">{t("guild.modules")}</h4>
            <ToggleRow
              label={t('guild.welcome')}
              desc={t('guild.welcomeDesc')}
              checked={config.welcomeEnabled}
              onChange={(v) => setConfig(c => ({ ...c, welcomeEnabled: v }))}
            />
            <ToggleRow
              label={t('guild.moderation')}
              desc={t('guild.moderationDesc')}
              checked={config.moderationEnabled}
              onChange={(v) => setConfig(c => ({ ...c, moderationEnabled: v }))}
            />
            <ToggleRow
              label={t('guild.music')}
              desc={t('guild.musicDesc')}
              checked={config.musicEnabled}
              onChange={(v) => setConfig(c => ({ ...c, musicEnabled: v }))}
            />
          </div>

          <div className="pt-4 border-t border-gray-100">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
            >
              {saving ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <CheckIcon className="h-4 w-4" />}
              {t("serverSettings.save")}
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function ToggleRow({ label, desc, checked, onChange }) {
  return (
    <div className="flex items-start justify-between gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors ${
          checked ? 'bg-purple-600' : 'bg-gray-200'
        }`}
      >
        <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`} />
      </button>
    </div>
  );
}
