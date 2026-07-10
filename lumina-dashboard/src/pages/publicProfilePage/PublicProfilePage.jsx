import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeftIcon, ExclamationTriangleIcon, ArrowPathIcon,
  CheckCircleIcon, GiftIcon, CalendarIcon, ServerIcon,
} from '@heroicons/react/24/outline';
import Header from '../../components/Header';
import ErrorState from '../../components/ui/ErrorState';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export default function PublicProfilePage() {
  const { identifier } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}expapi/v1/public-profile/${encodeURIComponent(identifier)}`);
      if (!res.ok) {
        let detail = `HTTP ${res.status}`;
        try {
          const body = await res.json();
          if (body?.error) detail = body.error;
        } catch {}
        throw new Error(detail);
      }
      const data = await res.json();
      setProfile(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [identifier]);

  useEffect(() => { load(); }, [load]);

  const avatarUrl = profile?.discordOauth2Id && profile?.avatar
    ? `https://cdn.discordapp.com/avatars/${profile.discordOauth2Id}/${profile.avatar}.png?size=256`
    : null;

  const displayName = profile?.displayName
    || profile?.username
    || 'Usuário';

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Voltar */}
        <Link
          to="/members"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-purple-700 mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Voltar
        </Link>

        {loading && (
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden animate-pulse">
            <div className="h-32 bg-gray-200" />
            <div className="px-6 pb-6 -mt-12">
              <div className="h-24 w-24 rounded-full bg-gray-200 border-4 border-white" />
              <div className="h-6 w-40 bg-gray-200 rounded mt-3" />
              <div className="h-4 w-24 bg-gray-100 rounded mt-2" />
            </div>
          </div>
        )}

        {!loading && error && (
          <ErrorState
            title="Perfil não encontrado"
            message={error === 'HTTP 404' || error.includes('não encontrado')
              ? 'Este usuário não existe ou o identificador está incorreto.'
              : 'Erro ao carregar o perfil.'}
            detail={error}
            onRetry={load}
          />
        )}

        {!loading && !error && profile && (
          <div className="space-y-4">
            {/* Banner + avatar */}
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
              <div
                className="h-28 sm:h-36"
                style={{ background: 'linear-gradient(135deg, #7C3AED, #A855F7)' }}
              />
              <div className="px-4 sm:px-6 pb-5 -mt-12 sm:-mt-14">
                <div className="flex items-end gap-4">
                  <div className="flex-shrink-0 relative z-10">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={displayName}
                        className="h-20 w-20 sm:h-24 sm:w-24 rounded-full border-4 border-white shadow-lg bg-white object-cover relative z-20"
                        onError={(e) => { e.target.style.display = 'none'; if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex'; }}
                      />
                    ) : null}
                    <div className={`h-20 w-20 sm:h-24 sm:w-24 rounded-full border-4 border-white shadow-lg bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-2xl relative z-20 ${avatarUrl ? 'hidden' : ''}`}>
                      {displayName[0]?.toUpperCase()}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 pb-1 relative z-10">
                    <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">{displayName}</h1>
                    {profile.username && (
                      <p className="text-xs text-gray-500 truncate">@{profile.username}</p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {profile.publicProfile ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                          <CheckCircleIcon className="h-3 w-3" /> Perfil público
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                          Perfil privado
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Detalhes (se público) */}
            {profile.publicProfile && (
              <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
                <h2 className="text-sm font-semibold text-gray-900">Informações</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {profile.registrationDate && (
                    <InfoBox icon={CalendarIcon} label="Membro desde" value={new Date(profile.registrationDate).toLocaleDateString('pt-BR', { year: 'numeric', month: 'long' })} />
                  )}
                  <InfoBox icon={ServerIcon} label="Status" value={profile.accessType || 'Membro'} />
                </div>
              </div>
            )}

            {/* Placeholder badges */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
              <GiftIcon className="h-8 w-8 mx-auto text-gray-300 mb-2" />
              <h3 className="text-sm font-medium text-gray-900">Badges</h3>
              <p className="text-xs text-gray-500 mt-1">Badges de eventos aparecerão aqui em breve.</p>
              <span className="inline-block mt-3 px-3 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">
                Em breve
              </span>
            </div>

            {/* Identificadores (apenas se o viewer for o dono — mas não temos como saber; mostrar para todos) */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-2">Identificadores</p>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Username</span>
                  <code className="text-xs font-mono text-gray-700">@{profile.username || '—'}</code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Discord ID</span>
                  <code className="text-xs font-mono text-gray-700">{profile.discordOauth2Id || '—'}</code>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function InfoBox({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
      <Icon className="h-5 w-5 text-purple-600 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-900 truncate">{value}</p>
      </div>
    </div>
  );
}
