import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  SparklesIcon, ServerIcon, GiftIcon, TicketIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import { useUser } from '../../contexts/UserContext'
import { useT } from '../../i18n/LanguageContext.jsx';
import { fetchNews } from '../../utils/membersApi';
import AppShell from '../../components/AppShell';
import PageState from '../../components/PageState';
import DiscordBanner from '../../components/DiscordBanner';
import MutualGuildsList from '../../components/MutualGuildsList';
import InventoryPreview from '../../components/InventoryPreview';
import NewsFeed from '../../components/NewsFeed';
import UsernameOnboardingModal from './components/UsernameOnboardingModal';
import ReauthModal from './components/ReauthModal';
import BadgesTab from './components/BadgesTab';

import { API_BASE } from '../../utils/apiBase';

// ─── Tabs da coluna principal ────────────────────────────────────────────────
const TABS = [
  { id: 'servers',  labelKey: 'members.tabs.servers', icon: ServerIcon },
  { id: 'badges',   labelKey: 'members.tabs.badges',   icon: GiftIcon },
  { id: 'raffles',  labelKey: 'members.tabs.raffles',  icon: TicketIcon },
];

// ─── Estado "Em breve" genérico ──────────────────────────────────────────────
function ComingSoon({ icon: Icon, title, description }) {
  const t = useT();
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
      <div className="mx-auto w-14 h-14 rounded-full bg-purple-50 flex items-center justify-center mb-4">
        <Icon className="h-7 w-7 text-purple-500" />
      </div>
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">{description}</p>
      <span className="inline-block mt-4 px-3 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">
        {t('common.comingSoon')}
      </span>
    </div>
  );
}

// ─── Hero anônima (não logado) ───────────────────────────────────────────────
function AnonymousHero({ news, newsLoading, newsError, onRetryNews }) {
  const t = useT();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-purple-50">


      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-medium mb-6">
            <SparklesIcon className="h-3.5 w-3.5" />
            {t('members.title')}
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-gray-900">
            {t('members.heroTitle')}<br />
            <span className="text-purple-600">{t('members.heroHighlight')}</span>
          </h1>
          <p className="mt-6 text-lg text-gray-600">
            {t('members.heroSubtitle')}
          </p>
          <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
            <button
              onClick={() => navigate('/login')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white font-medium rounded-md hover:bg-purple-700 transition-colors"
            >
              {t('nav.login')}
              <ArrowRightIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => navigate('/register')}
              className="px-6 py-3 text-gray-700 font-medium hover:text-purple-700 transition-colors"
            >
              {t('members.createAccount')}
            </button>
          </div>
        </div>
      </section>

      {/* Feed de novidades (público) */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{t("members.latestNews")}</h2>
          <p className="text-sm text-gray-500 mt-1">{t("members.newsSubtitle")}</p>
        </div>
        <div className="space-y-3">
          {newsLoading && (
            <>
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse h-24" />
              ))}
            </>
          )}
          {newsError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700 text-center">
              {t("members.newsLoadError")}
              <button onClick={onRetryNews} className="ml-2 underline">{t("common.tryAgain")}</button>
            </div>
          )}
          {!newsLoading && !newsError && news.length === 0 && (
            <p className="text-center text-gray-400 py-10">{t("members.noNews")}</p>
          )}
          {!newsLoading && !newsError && news.map(p => (
            <article key={p.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:border-purple-200 transition-colors">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded">{p.tag}</span>
                <span className="text-xs text-gray-400">{new Date(p.publishedAt).toLocaleDateString(undefined)}</span>
              </div>
              <h3 className="text-sm font-semibold text-gray-900">{p.title}</h3>
              {p.excerpt && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{p.excerpt}</p>}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

// ─── Área de Membros logada ──────────────────────────────────────────────────
function MembersContent() {
  const t = useT();
  const { user } = useUser();
  const hasDiscord = !!(user?.discordOauth2Id || user?.id);
  const [activeTab, setActiveTab] = useState('servers');

  // Inventário
  const [inventory, setInventory] = useState(null);
  const [invLoading, setInvLoading] = useState(true);
  const [invError, setInvError] = useState(null);

  const loadInventory = useCallback(async () => {
    if (!hasDiscord) { setInvLoading(false); return; }
    setInvLoading(true);
    setInvError(null);
    try {
      const res = await fetch(`${API_BASE}expapi/v1/myinventory`, {
        headers: {},
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setInventory(data);
    } catch (e) {
      setInvError(e.message);
    } finally {
      setInvLoading(false);
    }
  }, [hasDiscord]);

  useEffect(() => { loadInventory(); }, [loadInventory]);

  // Modal de onboarding para username (usuários sem username definido)
  const [showOnboarding, setShowOnboarding] = useState(false);
  useEffect(() => {
    if (user && !user.username) {
      const timer = setTimeout(() => setShowOnboarding(true), 600);
      return () => clearTimeout(timer);
    }
  }, [user]);

  // Reconnection is explicit; an absent DTO field must never interrupt login.
  const [showReauth, setShowReauth] = useState(false);

  return (
    <AppShell maxWidth="max-w-7xl">
      <div className="space-y-6">
        {/* Banner Discord no topo */}
        <DiscordBanner user={user} />
        {!hasDiscord && <div role="status" className="lumina-card p-4 text-sm text-gray-700 flex flex-wrap items-center justify-between gap-3">
          <p>{t('apiError.discordNotLinked')}</p>
          <Link to="/settings" className="lumina-button">{t('inventory.connectDiscord')}</Link>
        </div>}
        {hasDiscord && user?.discordNeedsReauth && <div role="status" className="lumina-card p-4 text-sm text-gray-700 flex flex-wrap items-center justify-between gap-3">
          <p>Autorize o acesso aos seus servidores para gerenciá-los no dashboard.</p>
          <button className="lumina-button" onClick={()=>setShowReauth(true)}>Reconectar Discord</button>
        </div>}

        {/* Aviso de exclusão agendada */}
        {user?.deletionScheduledFor && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start justify-between gap-3">
            <div className="text-sm text-red-800">
              <strong>{t('settings.account.closeAccount', { defaultValue: 'Close account' })}.</strong> {t('account.deletionScheduled', { defaultValue: 'Sua conta será permanentemente excluída em' })}{' '}
              {new Date(user.deletionScheduledFor).toLocaleDateString(t('common.locale', { defaultValue: 'pt-BR' }))}.
              {t('account.deletionCancel', { defaultValue: 'Faça login regularmente para cancelar esta ação.' })}
            </div>
          </div>
        )}

        {/* Layout 2 colunas: principal (servidores/badges/sorteios) + sidebar (feed) */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* Coluna principal */}
          <div className="space-y-4 min-w-0">
            {/* Tabs */}
            <div className="bg-white border border-gray-200 rounded-xl p-1 flex gap-1">
              {TABS.map(tab => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      active ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {t(tab.labelKey)}
                  </button>
                );
              })}
            </div>

            {/* Conteúdo da tab */}
            {activeTab === 'servers' && hasDiscord && <MutualGuildsList />}

            {activeTab === 'badges' && <BadgesTab />}

            {activeTab === 'raffles' && (
              <ComingSoon
                icon={TicketIcon}
                title={t("members.tabs.raffles")}
                description={t("members.rafflesDesc", { defaultValue: "Participe de sorteios de skins, baús e outros prêmios. Esta funcionalidade está chegando!" })}
              />
            )}

            {/* Inventário preview (só na tab de servidores) */}
            {activeTab === 'servers' && hasDiscord && (
              <InventoryPreview
                inventory={inventory}
                loading={invLoading}
                error={invError}
                onRetry={loadInventory}
              />
            )}
          </div>

          {/* Sidebar: feed de novidades */}
          <div className="lg:sticky lg:top-32 lg:self-start">
            <NewsFeed limit={15} />
          </div>
        </div>
      </div>

      {showOnboarding && (
        <UsernameOnboardingModal
          onClose={() => setShowOnboarding(false)}
          onSuccess={() => setShowOnboarding(false)}
        />
      )}

      {showReauth && (
        <ReauthModal onClose={() => setShowReauth(false)} />
      )}
    </AppShell>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────
export default function MembersAreaPage() {
  const t = useT();
  const { user, loading, error, refreshUser } = useUser();
  const isAuthenticated = !!user;
  const [news, setNews] = useState([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [newsError, setNewsError] = useState(null);

  const loadNews = useCallback(async () => {
    setNewsLoading(true);
    setNewsError(null);
    try {
      const data = await fetchNews({ limit: 5 });
      setNews(data.posts || []);
    } catch (e) {
      setNewsError(e.message);
    } finally {
      setNewsLoading(false);
    }
  }, []);

  useEffect(() => { if (!loading && !error && !isAuthenticated) loadNews(); }, [loadNews, loading, error, isAuthenticated]);

  if (loading) return <PageState title={t('common.loading')} loading />;
  if (error) return <AppShell><PageState title="Não foi possível verificar sua sessão" message={error} onRetry={() => refreshUser().catch(() => {})} /></AppShell>;

  // Não logado → hero anônima + feed público
  if (!user) {
    return <AnonymousHero news={news} newsLoading={newsLoading} newsError={newsError} onRetryNews={loadNews} />;
  }

  // Logado → área de membros completa
  return <MembersContent />;
}
