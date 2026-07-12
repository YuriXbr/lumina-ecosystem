import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  ArrowPathIcon, CheckIcon, ChevronDownIcon, ExclamationTriangleIcon,
  Cog6ToothIcon, CommandLineIcon, GiftIcon, ChatBubbleLeftRightIcon,
  NoSymbolIcon, ShieldExclamationIcon, PlusIcon, TrashIcon,
  InformationCircleIcon, XMarkIcon,
} from '@heroicons/react/24/outline';
import AppShell from '../../components/AppShell';
import ErrorState from '../../components/ui/ErrorState';
import { SkeletonLine } from '../../components/ui/Skeleton';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/';

// ─────────────────────────────────────────────────────────────────────────────
// Static configuration
// ─────────────────────────────────────────────────────────────────────────────

const SECTIONS = [
  { id: 'geral',     label: 'Geral',                 desc: 'Prefixo, idioma e módulos do bot',       icon: Cog6ToothIcon },
  { id: 'comandos',  label: 'Comandos',              desc: 'Ativar ou desativar comandos individuais', icon: CommandLineIcon },
  { id: 'gacha',     label: 'Gacha & Baús',          desc: 'Sistema de gacha e aquisição de baús',   icon: GiftIcon },
  { id: 'automsg',   label: 'Mensagens Automáticas', desc: 'Mensagens recorrentes em canais',        icon: ChatBubbleLeftRightIcon },
  { id: 'bloqueios', label: 'Bloqueios',             desc: 'Usuários e cargos bloqueados do bot',    icon: NoSymbolIcon },
  { id: 'moderacao', label: 'Moderação',             desc: 'Limites de advertências e punições',     icon: ShieldExclamationIcon },
];

const LANGUAGES = [
  { value: 'pt-BR', label: 'Português (Brasil)' },
  { value: 'en-US', label: 'English (US)' },
  { value: 'es-ES', label: 'Español' },
];

// Lista de comandos suportados pelo bot (espelha /commands no front público).
// Cada comando tem um id estável "<group>.<slug>" usado como chave no mapa
// `commandsEnabled`. Ausência da chave = comando habilitado (default true).
const COMMAND_GROUPS = [
  {
    id: 'league', name: 'League of Legends', icon: '🎮',
    commands: [
      { id: 'league.profile',           name: '/leagueprofile',          desc: 'Exibe o perfil de um jogador' },
      { id: 'league.matchhistory',      name: '/leaguematchhistory',     desc: 'Histórico de partidas' },
      { id: 'league.mastery',           name: '/leaguemastery',          desc: 'Maestria de campeões' },
      { id: 'league.championrotation',  name: '/leaguechampionrotation', desc: 'Rotação gratuita de campeões' },
      { id: 'league.queuesearch',       name: '/leaguequeuesearch',      desc: 'Busca por filas ranqueadas' },
    ],
  },
  {
    id: 'moderation', name: 'Moderação', icon: '🛡️',
    commands: [
      { id: 'moderation.ban',    name: '/ban',    desc: 'Banir usuário' },
      { id: 'moderation.unban',  name: '/unban',  desc: 'Revogar banimento' },
      { id: 'moderation.mute',   name: '/mute',   desc: 'Silenciar usuário' },
      { id: 'moderation.unmute', name: '/unmute', desc: 'Remover silêncio' },
      { id: 'moderation.warn',   name: '/warn',   desc: 'Aplicar advertência' },
      { id: 'moderation.unwarn', name: '/unwarn', desc: 'Remover advertência' },
    ],
  },
  {
    id: 'skins', name: 'Sistema de Skins', icon: '💎',
    commands: [
      { id: 'skins.openchest',  name: '/openchest',  desc: 'Abrir baús' },
      { id: 'skins.daily',      name: '/daily',      desc: 'Recompensa diária' },
      { id: 'skins.inventory',  name: '/inventory',  desc: 'Ver inventário' },
    ],
  },
  {
    id: 'util', name: 'Utilidades', icon: '🔧',
    commands: [
      { id: 'util.ping',      name: '/ping',      desc: 'Latência do bot' },
      { id: 'util.server',    name: '/server',    desc: 'Informações do servidor' },
      { id: 'util.user',      name: '/user',      desc: 'Informações de usuário' },
      { id: 'util.help',      name: '/help',      desc: 'Lista de comandos' },
      { id: 'util.dashboard', name: '/dashboard', desc: 'Link do dashboard' },
    ],
  },
];

const DEFAULT_CONFIG = {
  // Geral
  prefix: 'l!',
  language: 'pt-BR',
  welcomeEnabled: false,
  moderationEnabled: false,
  musicEnabled: false,

  // Comandos — mapa commandId -> boolean (ausente = habilitado)
  commandsEnabled: {},

  // Gacha & Baús
  gachaEnabled: true,
  gachaChestsEnabled: true,
  gachaMaxRolls: 8,
  gachaRefreshInterval: 180, // minutos (3h por padrão, conforme schema)

  // Mensagens automáticas
  // [{ id, channelId, message, intervalMinutes, enabled }]
  autoMessages: [],

  // Bloqueios — IDs do Discord (17-19 dígitos)
  blockedUsers: [],
  blockedRoles: [],

  // Moderação — limites de advertências
  warnsToMute: 3,
  warnsToTimeOut: 5,
  warnsToKick: 6,
  warnsToBan: 7,
  persistentMute: true,
  autoWarnPunishment: false,
  muteRoleId: '',
  banRoleId: '',
};

// Campos do frontend rastreados por seção (para detectar dirty state).
const SECTION_FIELDS = {
  geral:     ['prefix', 'language', 'welcomeEnabled', 'moderationEnabled', 'musicEnabled'],
  comandos:  ['commandsEnabled'],
  gacha:     ['gachaEnabled', 'gachaChestsEnabled', 'gachaMaxRolls', 'gachaRefreshInterval'],
  automsg:   ['autoMessages'],
  bloqueios: ['blockedUsers', 'blockedRoles'],
  moderacao: ['warnsToMute', 'warnsToTimeOut', 'warnsToKick', 'warnsToBan', 'persistentMute', 'autoWarnPunishment', 'muteRoleId', 'banRoleId'],
};

// Mapeia o estado do frontend para o payload esperado pelo
// PUT /expapi/v1/admin/guilds/:guildId. Nem todos os campos abaixo têm
// contrapartida direta no schema atual do backend — esses serão filtrados
// silenciosamente pela rota (allowedFields). A página trata o erro
// NO_ALLOWED_FIELDS exibindo um aviso amigável.
const SECTION_BACKEND_FIELDS = {
  geral: (cfg) => ({
    prefix: cfg.prefix,
    guildLocale: cfg.language,
    memberWelcomeToggle: cfg.welcomeEnabled,
    // O schema não tem toggle "moderationEnabled" — usamos o channelId como
    // flag (string não-vazia = módulo ativo), no mesmo espírito do código
    // original e do getGuilds.js (`!!guild.moderationChannelId`).
    moderationChannelId: cfg.moderationEnabled ? 'configured' : '',
    djEnabled: cfg.musicEnabled,
  }),
  comandos: (cfg) => ({
    commandsEnabled: cfg.commandsEnabled,
  }),
  gacha: (cfg) => ({
    gachaEnabled: cfg.gachaEnabled,
    gachaChestsEnabled: cfg.gachaChestsEnabled,
    gachaMaxRolls: Number(cfg.gachaMaxRolls) || 0,
    gachaRefreshInterval: Number(cfg.gachaRefreshInterval) || 0,
  }),
  automsg: (cfg) => ({
    autoMessages: cfg.autoMessages,
  }),
  bloqueios: (cfg) => ({
    blockedUsers: cfg.blockedUsers,
    blockedRoles: cfg.blockedRoles,
    // Aproveitamos o campo existente no schema (blockedChannels) para
    // persistir a lista combinada caso o backend queira consumir.
    blockedChannels: [...cfg.blockedUsers, ...cfg.blockedRoles],
  }),
  moderacao: (cfg) => ({
    warnsToMute: Number(cfg.warnsToMute) || 0,
    warnsToTimeOut: Number(cfg.warnsToTimeOut) || 0,
    warnsToKick: Number(cfg.warnsToKick) || 0,
    warnsToBan: Number(cfg.warnsToBan) || 0,
    persistentMute: cfg.persistentMute,
    autoWarnPunishment: cfg.autoWarnPunishment,
    muteRoleId: cfg.muteRoleId || '',
    banRoleId: cfg.banRoleId || '',
  }),
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function isDirty(cfg, original, fields) {
  for (const f of fields) {
    if (!deepEqual(cfg[f], original[f])) return true;
  }
  return false;
}

async function getCsrfToken() {
  const res = await fetch(`${API_BASE}expapi/v1/csrf-token`, { credentials: 'include' });
  if (!res.ok) throw new Error('Falha ao obter token CSRF');
  const data = await res.json();
  return data.csrfToken;
}

// Valida um ID do Discord (17-19 dígitos). Usado nos inputs de bloqueios.
function isValidDiscordId(id) {
  return /^\d{17,19}$/.test(id.trim());
}

// ─────────────────────────────────────────────────────────────────────────────
// Subcomponentes de UI
// ─────────────────────────────────────────────────────────────────────────────

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

function Toggle({ checked, onChange, disabled = false, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        checked ? 'bg-purple-600' : 'bg-gray-200'
      }`}
    >
      <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
        checked ? 'translate-x-5' : 'translate-x-0'
      }`} />
    </button>
  );
}

function Field({ label, hint, children, htmlFor }) {
  return (
    <div>
      {label && (
        <label htmlFor={htmlFor} className="block text-xs font-medium text-gray-600 mb-1">
          {label}
        </label>
      )}
      {children}
      {hint && <p className="text-[10px] text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

const inputClass =
  'block w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-50 disabled:text-gray-400';

function StatusBanner({ status }) {
  if (!status || status.saving) return null;
  const styles = {
    success: 'bg-green-50 text-green-700 border-green-200',
    error:   'bg-red-50 text-red-700 border-red-200',
    info:    'bg-blue-50 text-blue-700 border-blue-200',
  };
  const icons = {
    success: CheckIcon,
    error:   ExclamationTriangleIcon,
    info:    InformationCircleIcon,
  };
  const Icon = icons[status.type] || InformationCircleIcon;
  return (
    <div className={`mt-3 px-3 py-2 rounded-md text-xs flex items-start gap-2 border ${styles[status.type] || styles.info}`}>
      <Icon className="h-4 w-4 flex-shrink-0 mt-0.5" />
      <span className="flex-1">{status.text}</span>
    </div>
  );
}

function SaveBar({ onSave, saving, dirty, disabled }) {
  return (
    <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
      <button
        type="button"
        onClick={onSave}
        disabled={saving || !dirty || disabled}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {saving ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <CheckIcon className="h-4 w-4" />}
        {saving ? 'Salvando…' : 'Salvar'}
      </button>
      {dirty && !saving && (
        <span className="text-xs text-amber-600 inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          Alterações não salvas
        </span>
      )}
    </div>
  );
}

function Accordion({ section, open, onToggle, dirty, status, onSave, saving, disabled, children }) {
  const Icon = section.icon;
  const isSaving = !!status?.saving;
  return (
    <section className={`bg-white border rounded-xl overflow-hidden transition-shadow ${
      open ? 'border-purple-200 shadow-sm' : 'border-gray-200'
    }`}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
        aria-expanded={open}
      >
        <span className={`flex-shrink-0 inline-flex items-center justify-center h-9 w-9 rounded-lg ${
          open ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'
        }`}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900">{section.label}</h3>
            {dirty && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                não salvo
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5 truncate">{section.desc}</p>
        </div>
        <ChevronDownIcon className={`h-5 w-5 text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-5 pb-5 pt-1 border-t border-gray-100">
          {children}
          <StatusBanner status={status} />
          <SaveBar onSave={onSave} saving={isSaving} dirty={dirty} disabled={disabled} />
        </div>
      )}
    </section>
  );
}

// Linha de toggle reutilizável (label + descrição + switch).
function ToggleRow({ label, desc, checked, onChange, disabled }) {
  return (
    <div className="flex items-start justify-between gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        {desc && <p className="text-xs text-gray-500 mt-0.5">{desc}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} disabled={disabled} label={label} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Página principal
// ─────────────────────────────────────────────────────────────────────────────

export default function ServerSettingsPage() {
  const { guildId } = useParams();

  const [guild, setGuild] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [channels, setChannels] = useState([]);
  const [roles, setRoles] = useState([]);

  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [original, setOriginal] = useState(DEFAULT_CONFIG);
  const [openSections, setOpenSections] = useState({ geral: true });
  const [sectionStatus, setSectionStatus] = useState({}); // { [id]: { saving?, type?, text? } }

  // ─── Carregar dados ──────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1) Info da guilda via token OAuth2 do usuário (sem precisar do bot token).
      const guildRes = await fetch(`${API_BASE}expapi/v1/discord/guild/${guildId}`, {
        credentials: 'include',
      });
      if (!guildRes.ok) {
        let detail = `HTTP ${guildRes.status}`;
        try {
          const body = await guildRes.json();
          if (body?.error) detail = body.error;
        } catch {}
        throw new Error(detail);
      }
      const guildData = await guildRes.json();

      setGuild({
        id: guildData.id,
        name: guildData.name,
        icon: guildData.icon,
        memberCount: guildData.member?.approximate_member_count
          || guildData.approximate_member_count
          || guildData.botConfig?.memberCount
          || 0,
        canManage: guildData.canManage,
        hasBot: !!guildData.hasBot,
      });

      // Armazenar canais e roles da resposta da API
      setChannels(guildData.channels || []);
      setRoles(guildData.roles || []);

      // 2) Config básica do bot (do botConfig embutido na resposta).
      const botConfig = guildData.botConfig || {};
      const base = {
        ...DEFAULT_CONFIG,
        prefix: botConfig.prefix || DEFAULT_CONFIG.prefix,
        language: botConfig.language || DEFAULT_CONFIG.language,
        welcomeEnabled: !!botConfig.welcomeEnabled,
        moderationEnabled: !!botConfig.moderationEnabled,
        musicEnabled: !!botConfig.musicEnabled,
      };

      // 3) Tentamos buscar campos estendidos via /admin/guilds (requer admin
      //    level >= 7). Se o usuário não for admin, caímos silenciosamente nos
      //    defaults — a página ainda funciona para os campos básicos.
      try {
        const adminRes = await fetch(
          `${API_BASE}expapi/v1/admin/guilds?search=${encodeURIComponent(guildId)}&limit=1`,
          { credentials: 'include' }
        );
        if (adminRes.ok) {
          const adminData = await adminRes.json();
          const found = (adminData.guilds || []).find(g => g.guildId === guildId);
          if (found) {
            if (typeof found.persistentMute === 'boolean') base.persistentMute = found.persistentMute;
            if (typeof found.autoWarnPunishment === 'boolean') base.autoWarnPunishment = found.autoWarnPunishment;
            if (found.prefix) base.prefix = found.prefix;
            if (found.language) base.language = found.language;
            if (typeof found.welcomeEnabled === 'boolean') base.welcomeEnabled = found.welcomeEnabled;
            if (typeof found.moderationEnabled === 'boolean') base.moderationEnabled = found.moderationEnabled;
            if (typeof found.musicEnabled === 'boolean') base.musicEnabled = found.musicEnabled;
            // Extended fields from admin response
            if (Array.isArray(found.autoMessages)) base.autoMessages = found.autoMessages;
            if (found.commandsEnabled) base.commandsEnabled = found.commandsEnabled;
            if (Array.isArray(found.blockedUsers)) base.blockedUsers = found.blockedUsers;
            if (Array.isArray(found.blockedRoles)) base.blockedRoles = found.blockedRoles;
            if (typeof found.gachaEnabled === 'boolean') base.gachaEnabled = found.gachaEnabled;
            if (typeof found.gachaChestsEnabled === 'boolean') base.gachaChestsEnabled = found.gachaChestsEnabled;
            if (typeof found.gachaMaxRolls === 'number') base.gachaMaxRolls = found.gachaMaxRolls;
            if (typeof found.gachaRefreshInterval === 'number') base.gachaRefreshInterval = found.gachaRefreshInterval;
            if (typeof found.warnsToMute === 'number') base.warnsToMute = found.warnsToMute;
            if (typeof found.warnsToTimeOut === 'number') base.warnsToTimeOut = found.warnsToTimeOut;
            if (typeof found.warnsToKick === 'number') base.warnsToKick = found.warnsToKick;
            if (typeof found.warnsToBan === 'number') base.warnsToBan = found.warnsToBan;
            if (typeof found.persistentMute === 'boolean') base.persistentMute = found.persistentMute;
            if (typeof found.persistentWarns === 'boolean') base.persistentWarns = found.persistentWarns;
            if (typeof found.autoWarnPunishment === 'boolean') base.autoWarnPunishment = found.autoWarnPunishment;
            if (found.muteRoleId) base.muteRoleId = found.muteRoleId;
            if (found.banRoleId) base.banRoleId = found.banRoleId;
          }
        }
      } catch {
        // Ignora — não é crítico, fallback para defaults.
      }

      setConfig(base);
      setOriginal(base);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  useEffect(() => { load(); }, [load]);

  // ─── Helpers de estado ───────────────────────────────────────────────────
  const update = (patch) => setConfig(c => ({ ...c, ...patch }));

  const setStatus = (sectionId, value) =>
    setSectionStatus(prev => ({ ...prev, [sectionId]: value }));

  const clearStatusAfter = (sectionId, ms = 4500) => {
    setTimeout(() => {
      setSectionStatus(prev => {
        if (!prev[sectionId] || prev[sectionId].saving) return prev;
        const next = { ...prev };
        delete next[sectionId];
        return next;
      });
    }, ms);
  };

  // ─── Salvar seção ────────────────────────────────────────────────────────
  // Calcula diff apenas dos campos da seção e faz PUT. Atualiza o snapshot
  // `original` em caso de sucesso para limpar o estado dirty.
  const saveSection = async (sectionId) => {
    const fields = SECTION_FIELDS[sectionId];
    const toBackend = SECTION_BACKEND_FIELDS[sectionId];

    if (!isDirty(config, original, fields)) {
      setStatus(sectionId, { type: 'info', text: 'Nenhuma alteração para salvar.' });
      clearStatusAfter(sectionId, 2500);
      return;
    }

    setStatus(sectionId, { saving: true });
    try {
      const csrfToken = await getCsrfToken();

      // Payload apenas com campos alterados — evita sobrescrever seções
      // não relacionadas (o backend também faz whitelist, mas enviamos só
      // o necessário para reduzir risco e ruído em logs).
      const currentBackend = toBackend(config);
      const originalBackend = toBackend(original);
      const diff = {};
      for (const key of Object.keys(currentBackend)) {
        if (!deepEqual(currentBackend[key], originalBackend[key])) {
          diff[key] = currentBackend[key];
        }
      }

      if (Object.keys(diff).length === 0) {
        setStatus(sectionId, { type: 'info', text: 'Nenhuma alteração para salvar.' });
        clearStatusAfter(sectionId, 2500);
        return;
      }

      const res = await fetch(`${API_BASE}expapi/v1/admin/guilds/${guildId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify(diff),
      });

      if (res.ok) {
        // Snapshot dos campos da seção para limpar dirty state.
        setOriginal(prev => {
          const next = { ...prev };
          for (const f of fields) next[f] = config[f];
          return next;
        });
        setStatus(sectionId, { type: 'success', text: 'Configurações salvas! As mudanças podem levar até 5 minutos para entrar em vigor no bot (cache). Comandos de moderação aplicam em até 1 minuto.' });
      } else {
        const err = await res.json().catch(() => ({}));
        let text = err.error || `Erro HTTP ${res.status}`;
        if (err.code === 'NO_ALLOWED_FIELDS') {
          text = 'Esta seção ainda não é suportada pelo backend. As alterações não foram persistidas.';
        } else if (err.code === 'INSUFFICIENT_PERMISSION') {
          text = 'Você não tem permissão para alterar estas configurações.';
        } else if (err.code === 'GUILD_NOT_FOUND') {
          text = 'Servidor não encontrado no banco do bot.';
        } else if (err.code === 'ACCOUNT_NOT_FOUND') {
          text = 'Conta de administrador não encontrada.';
        }
        setStatus(sectionId, { type: 'error', text });
      }
    } catch {
      setStatus(sectionId, { type: 'error', text: 'Erro de conexão. Tente novamente.' });
    } finally {
      clearStatusAfter(sectionId, 4500);
    }
  };

  const toggleSection = (id) =>
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));

  // ─── Render: loading ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <AppShell maxWidth="max-w-4xl" title="Carregando servidor…" backTo="/members" backLabel="Membros">
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-gray-200 animate-pulse" />
              <div className="flex-1 space-y-2">
                <SkeletonLine width="40%" height="1.25rem" />
                <SkeletonLine width="25%" height="0.75rem" />
              </div>
            </div>
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
              <SkeletonLine width="30%" height="1rem" />
              <SkeletonLine width="100%" height="2.5rem" />
              <SkeletonLine width="100%" height="2.5rem" />
            </div>
          ))}
        </div>
      </AppShell>
    );
  }

  // ─── Render: erro ────────────────────────────────────────────────────────
  if (error) {
    return (
      <AppShell maxWidth="max-w-4xl" title="Erro" backTo="/members" backLabel="Membros">
        <ErrorState
          title="Erro ao carregar servidor"
          message="Não foi possível carregar as configurações deste servidor."
          detail={error}
          onRetry={load}
        />
      </AppShell>
    );
  }

  // ─── Render: página ──────────────────────────────────────────────────────
  const canEdit = guild?.canManage !== false;

  return (
    <AppShell
      maxWidth="max-w-4xl"
      title={guild?.name || 'Servidor'}
      subtitle="Configurações do bot"
      backTo="/members"
      backLabel="Membros"
    >
      <div className="space-y-5">
        {/* Cabeçalho do servidor */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center gap-4">
          <GuildIcon guild={guild} size={56} />
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-gray-900 truncate">{guild?.name}</h2>
            <p className="text-xs text-gray-500 font-mono mt-0.5">{guild?.id}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {(guild?.memberCount || 0).toLocaleString('pt-BR')} membros
            </p>
          </div>
          {guild?.hasBot ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 rounded-md text-xs font-medium">
              <CheckIcon className="h-3.5 w-3.5" />
              Bot ativo
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-600 rounded-md text-xs font-medium">
              <XMarkIcon className="h-3.5 w-3.5" />
              Sem bot
            </span>
          )}
        </div>

        {/* Aviso de permissão */}
        {!canEdit && (
          <div className="bg-amber-50 border border-amber-200 rounded-md px-4 py-2.5 text-xs text-amber-800 flex items-center gap-2">
            <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0" />
            Você não tem permissão para gerenciar este servidor. As alterações não poderão ser salvas.
          </div>
        )}

        {/* Seções acordeão */}
        {SECTIONS.map(section => {
          const dirty = isDirty(config, original, SECTION_FIELDS[section.id]);
          return (
            <Accordion
              key={section.id}
              section={section}
              open={!!openSections[section.id]}
              onToggle={() => toggleSection(section.id)}
              dirty={dirty}
              status={sectionStatus[section.id]}
              saving={!!sectionStatus[section.id]?.saving}
              disabled={!canEdit}
              onSave={() => saveSection(section.id)}
            >
              {renderSection(section.id, config, update, { disabled: !canEdit }, { channels, roles })}
            </Accordion>
          );
        })}
      </div>
    </AppShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Renderizador de seção
// ─────────────────────────────────────────────────────────────────────────────

function renderSection(id, config, update, opts, extra) {
  switch (id) {
    case 'geral':     return <GeralSection     config={config} update={update} opts={opts} />;
    case 'comandos':  return <ComandosSection  config={config} update={update} opts={opts} />;
    case 'gacha':     return <GachaSection     config={config} update={update} opts={opts} />;
    case 'automsg':   return <AutoMsgSection   config={config} update={update} opts={opts} channels={extra?.channels || []} />;
    case 'bloqueios': return <BloqueiosSection config={config} update={update} opts={opts} />;
    case 'moderacao': return <ModeracaoSection config={config} update={update} opts={opts} roles={extra?.roles || []} />;
    default:          return null;
  }
}

// ─── 1. Geral ───────────────────────────────────────────────────────────────
function GeralSection({ config, update, opts }) {
  return (
    <div className="space-y-5 pt-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Prefixo de comandos" hint="Caractere usado antes de comandos de texto.">
          <input
            type="text"
            value={config.prefix}
            onChange={(e) => update({ prefix: e.target.value })}
            className={`${inputClass} font-mono`}
            maxLength={5}
            disabled={opts.disabled}
          />
        </Field>
        <Field label="Idioma">
          <select
            value={config.language}
            onChange={(e) => update({ language: e.target.value })}
            className={`${inputClass} bg-white`}
            disabled={opts.disabled}
          >
            {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </Field>
      </div>

      <div className="space-y-1 pt-3 border-t border-gray-100">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Módulos</h4>
        <ToggleRow
          label="Boas-vindas"
          desc="Enviar mensagem automática quando alguém entra no servidor."
          checked={config.welcomeEnabled}
          onChange={(v) => update({ welcomeEnabled: v })}
          disabled={opts.disabled}
        />
        <ToggleRow
          label="Moderação"
          desc="Sistema de ban, mute, kick e warn com persistência."
          checked={config.moderationEnabled}
          onChange={(v) => update({ moderationEnabled: v })}
          disabled={opts.disabled}
        />
        <ToggleRow
          label="Música"
          desc="Player de música em canais de voz (DJ)."
          checked={config.musicEnabled}
          onChange={(v) => update({ musicEnabled: v })}
          disabled={opts.disabled}
        />
      </div>
    </div>
  );
}

// ─── 2. Comandos ────────────────────────────────────────────────────────────
function ComandosSection({ config, update, opts }) {
  const enabled = (cmdId) => config.commandsEnabled[cmdId] !== false;

  const setCmd = (cmdId, value) => {
    update({
      commandsEnabled: { ...config.commandsEnabled, [cmdId]: value },
    });
  };

  const setGroup = (group, value) => {
    const next = { ...config.commandsEnabled };
    for (const cmd of group.commands) next[cmd.id] = value;
    update({ commandsEnabled: next });
  };

  const groupState = (group) => {
    const states = group.commands.map(c => enabled(c.id));
    if (states.every(Boolean)) return 'on';
    if (states.every(v => !v)) return 'off';
    return 'mixed';
  };

  return (
    <div className="space-y-4 pt-4">
      <p className="text-xs text-gray-500">
        Ative ou desative comandos individuais. Quando desativado, o comando não responde neste servidor.
      </p>
      {COMMAND_GROUPS.map(group => {
        const state = groupState(group);
        return (
          <div key={group.id} className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Header do grupo */}
            <div className="flex items-center justify-between gap-3 px-4 py-3 bg-gray-50">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-lg">{group.icon}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{group.name}</p>
                  <p className="text-[11px] text-gray-500">
                    {group.commands.length} comando{group.commands.length > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setGroup(group, state !== 'on')}
                  disabled={opts.disabled}
                  className="text-[11px] font-medium text-purple-700 hover:text-purple-900 disabled:opacity-50"
                >
                  {state === 'on' ? 'Desativar todos' : 'Ativar todos'}
                </button>
                <Toggle
                  checked={state === 'on'}
                  onChange={(v) => setGroup(group, v)}
                  disabled={opts.disabled}
                  label={`Ativar todos de ${group.name}`}
                />
              </div>
            </div>
            {/* Lista de comandos */}
            <ul className="divide-y divide-gray-100">
              {group.commands.map(cmd => (
                <li key={cmd.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-mono text-gray-900">{cmd.name}</p>
                    <p className="text-xs text-gray-500 truncate">{cmd.desc}</p>
                  </div>
                  <Toggle
                    checked={enabled(cmd.id)}
                    onChange={(v) => setCmd(cmd.id, v)}
                    disabled={opts.disabled}
                    label={cmd.name}
                  />
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

// ─── 3. Gacha & Baús ────────────────────────────────────────────────────────
function GachaSection({ config, update, opts }) {
  return (
    <div className="space-y-5 pt-4">
      <div className="space-y-1">
        <ToggleRow
          label="Sistema de Gacha"
          desc="Permite que membros usem o sistema de gacha (rolls de skins)."
          checked={config.gachaEnabled}
          onChange={(v) => update({ gachaEnabled: v })}
          disabled={opts.disabled}
        />
        <ToggleRow
          label="Aquisição de Baús"
          desc="Permite que membros recebam e abram baús Hextech / Masterwork."
          checked={config.gachaChestsEnabled}
          onChange={(v) => update({ gachaChestsEnabled: v })}
          disabled={opts.disabled}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-gray-100">
        <Field
          label="Rolls máximos por ciclo"
          hint="Quantas vezes um membro pode rolar antes do reset."
        >
          <input
            type="number"
            min={0}
            max={1000}
            value={config.gachaMaxRolls}
            onChange={(e) => update({ gachaMaxRolls: e.target.value })}
            className={inputClass}
            disabled={opts.disabled || !config.gachaEnabled}
          />
        </Field>
        <Field
          label="Intervalo de refresh (minutos)"
          hint="A cada quantos minutos os rolls são resetados. Padrão: 180 (3h)."
        >
          <input
            type="number"
            min={1}
            max={20160}
            value={config.gachaRefreshInterval}
            onChange={(e) => update({ gachaRefreshInterval: e.target.value })}
            className={inputClass}
            disabled={opts.disabled || !config.gachaEnabled}
          />
        </Field>
      </div>
    </div>
  );
}

// ─── 4. Mensagens Automáticas ───────────────────────────────────────────────
function AutoMsgSection({ config, update, opts, channels = [] }) {
  const messages = config.autoMessages || [];

  const addMessage = () => {
    const next = [...messages, {
      id: uid(),
      channelId: '',
      message: '',
      intervalMinutes: 60,
      enabled: true,
    }];
    update({ autoMessages: next });
  };

  const updateMessage = (id, patch) => {
    update({
      autoMessages: messages.map(m => m.id === id ? { ...m, ...patch } : m),
    });
  };

  const removeMessage = (id) => {
    update({ autoMessages: messages.filter(m => m.id !== id) });
  };

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-gray-500">
          Mensagens enviadas automaticamente em um canal em intervalos regulares.
        </p>
        <button
          type="button"
          onClick={addMessage}
          disabled={opts.disabled}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-md hover:bg-purple-100 disabled:opacity-50"
        >
          <PlusIcon className="h-3.5 w-3.5" />
          Adicionar
        </button>
      </div>

      {messages.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-gray-200 rounded-lg">
          <ChatBubbleLeftRightIcon className="h-8 w-8 mx-auto text-gray-300 mb-1" />
          <p className="text-sm text-gray-500">Nenhuma mensagem automática configurada.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {messages.map((msg, idx) => (
            <li key={msg.id} className="border border-gray-200 rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-gray-500">Mensagem #{idx + 1}</span>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-gray-500">Ativa</span>
                    <Toggle
                      checked={msg.enabled}
                      onChange={(v) => updateMessage(msg.id, { enabled: v })}
                      disabled={opts.disabled}
                      label="Ativa"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeMessage(msg.id)}
                    disabled={opts.disabled}
                    className="text-gray-400 hover:text-red-600 disabled:opacity-50"
                    aria-label="Remover mensagem"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-2">
                <Field label="Canal" hint={channels.length === 0 ? 'Não foi possível carregar os canais. Verifique se o bot está no servidor.' : undefined}>
                  <select
                    value={msg.channelId}
                    onChange={(e) => updateMessage(msg.id, { channelId: e.target.value })}
                    className={`${inputClass} bg-white`}
                    disabled={opts.disabled || channels.length === 0}
                  >
                    <option value="">Selecione um canal…</option>
                    {channels.map(ch => (
                      <option
                        key={ch.id}
                        value={ch.id}
                        disabled={!ch.canSendMessages}
                      >
                        #{ch.name}{!ch.canSendMessages ? ' ⚠️ Sem permissão' : ''}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Intervalo (min)">
                  <input
                    type="number"
                    min={1}
                    value={msg.intervalMinutes}
                    onChange={(e) => updateMessage(msg.id, { intervalMinutes: Number(e.target.value) || 0 })}
                    className={inputClass}
                    disabled={opts.disabled}
                  />
                </Field>
              </div>
              <Field label="Mensagem">
                <textarea
                  value={msg.message}
                  onChange={(e) => updateMessage(msg.id, { message: e.target.value })}
                  rows={2}
                  placeholder="Conteúdo da mensagem automática…"
                  className={`${inputClass} resize-y`}
                  disabled={opts.disabled}
                />
              </Field>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── 5. Bloqueios ───────────────────────────────────────────────────────────
function BloqueiosSection({ config, update, opts }) {
  return (
    <div className="space-y-5 pt-4">
      <p className="text-xs text-gray-500">
        Usuários e cargos nesta lista não podem executar comandos do bot neste servidor.
      </p>
      <BlocklistEditor
        title="Usuários bloqueados"
        desc="IDs de usuários do Discord (17-19 dígitos)."
        items={config.blockedUsers}
        onChange={(items) => update({ blockedUsers: items })}
        placeholder="ID do usuário"
        disabled={opts.disabled}
        validate={isValidDiscordId}
      />
      <BlocklistEditor
        title="Cargos bloqueados"
        desc="IDs de cargos do Discord (17-19 dígitos)."
        items={config.blockedRoles}
        onChange={(items) => update({ blockedRoles: items })}
        placeholder="ID do cargo"
        disabled={opts.disabled}
        validate={isValidDiscordId}
      />
    </div>
  );
}

function BlocklistEditor({ title, desc, items, onChange, placeholder, disabled, validate }) {
  const [input, setInput] = useState('');
  const [touched, setTouched] = useState(false);

  const valid = input.trim() && validate(input);
  const duplicate = items.includes(input.trim());

  const add = () => {
    setTouched(true);
    if (!valid || duplicate) return;
    onChange([...items, input.trim()]);
    setInput('');
    setTouched(false);
  };

  const remove = (id) => onChange(items.filter(x => x !== id));

  return (
    <div className="border border-gray-200 rounded-lg p-3">
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <h4 className="text-sm font-medium text-gray-900">{title}</h4>
        <span className="text-[11px] text-gray-400">{items.length} entrada{items.length !== 1 ? 's' : ''}</span>
      </div>
      <p className="text-[11px] text-gray-500 mb-3">{desc}</p>

      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={placeholder}
          className={`${inputClass} font-mono ${touched && !valid ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''}`}
          disabled={disabled}
        />
        <button
          type="button"
          onClick={add}
          disabled={disabled || !valid || duplicate}
          className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          <PlusIcon className="h-3.5 w-3.5" />
          Adicionar
        </button>
      </div>
      {touched && input && !valid && (
        <p className="text-[11px] text-red-600 mb-2">ID inválido — deve ter 17 a 19 dígitos numéricos.</p>
      )}
      {touched && valid && duplicate && (
        <p className="text-[11px] text-amber-600 mb-2">Este ID já está na lista.</p>
      )}

      {items.length === 0 ? (
        <p className="text-xs text-gray-400 italic py-2">Nenhum item bloqueado.</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map(id => (
            <li key={id} className="flex items-center justify-between gap-2 px-3 py-1.5 bg-gray-50 rounded-md">
              <code className="text-xs text-gray-700 font-mono truncate">{id}</code>
              <button
                type="button"
                onClick={() => remove(id)}
                disabled={disabled}
                className="text-gray-400 hover:text-red-600 disabled:opacity-50 flex-shrink-0"
                aria-label="Remover"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── 6. Moderação ───────────────────────────────────────────────────────────
function ModeracaoSection({ config, update, opts, roles = [] }) {
  return (
    <div className="space-y-5 pt-4">
      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-2">Limites de advertências</h4>
        <p className="text-xs text-gray-500 mb-3">
          Quantas advertências acumuladas disparam cada punição automática. Use <code className="font-mono bg-gray-100 px-1 rounded">0</code> para desativar uma punição.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <WarnField label="Mute"    value={config.warnsToMute}    onChange={(v) => update({ warnsToMute: v })}    disabled={opts.disabled} />
          <WarnField label="Timeout" value={config.warnsToTimeOut} onChange={(v) => update({ warnsToTimeOut: v })} disabled={opts.disabled} />
          <WarnField label="Kick"    value={config.warnsToKick}    onChange={(v) => update({ warnsToKick: v })}    disabled={opts.disabled} />
          <WarnField label="Ban"     value={config.warnsToBan}     onChange={(v) => update({ warnsToBan: v })}     disabled={opts.disabled} />
        </div>
      </div>

      <div className="pt-3 border-t border-gray-100">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Cargos de punição</h4>
        <p className="text-xs text-gray-500 mb-3">
          Selecione os cargos que o bot aplicará ao mutar ou banir usuários. Cargos marcados com ⚠️ estão acima do cargo do bot e não podem ser aplicados.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Cargo de Mute" hint="Aplicado automaticamente ao silenciar um usuário.">
            <select
              value={config.muteRoleId}
              onChange={(e) => update({ muteRoleId: e.target.value })}
              className={`${inputClass} bg-white`}
              disabled={opts.disabled || roles.length === 0}
            >
              <option value="">Nenhum (sem cargo de mute)</option>
              {roles.map(r => (
                <option
                  key={r.id}
                  value={r.id}
                  disabled={!r.botCanManage}
                >
                  {r.name}{!r.botCanManage ? ' ⚠️ Acima do bot' : ''}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Cargo de Ban" hint="Aplicado automaticamente ao banir um usuário (opcional).">
            <select
              value={config.banRoleId}
              onChange={(e) => update({ banRoleId: e.target.value })}
              className={`${inputClass} bg-white`}
              disabled={opts.disabled || roles.length === 0}
            >
              <option value="">Nenhum (ban direto)</option>
              {roles.map(r => (
                <option
                  key={r.id}
                  value={r.id}
                  disabled={!r.botCanManage}
                >
                  {r.name}{!r.botCanManage ? ' ⚠️ Acima do bot' : ''}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      <div className="space-y-1 pt-3 border-t border-gray-100">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Comportamento</h4>
        <ToggleRow
          label="Mute persistente"
          desc="Reaplica o mute automaticamente se o usuário sair e voltar ao servidor."
          checked={config.persistentMute}
          onChange={(v) => update({ persistentMute: v })}
          disabled={opts.disabled}
        />
        <ToggleRow
          label="Punição automática por advertência"
          desc="Aplica automaticamente a punição quando o usuário atinge o limite de warns."
          checked={config.autoWarnPunishment}
          onChange={(v) => update({ autoWarnPunishment: v })}
          disabled={opts.disabled}
        />
      </div>
    </div>
  );
}

function WarnField({ label, value, onChange, disabled }) {
  return (
    <Field label={label}>
      <input
        type="number"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className={inputClass}
        disabled={disabled}
      />
    </Field>
  );
}
