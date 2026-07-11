import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { useT } from '../i18n/LanguageContext.jsx';

/**
 * Banner no topo da Área de Membros mostrando o perfil do usuário.
 * Inclui banner do Discord (ou gradiente), avatar, nome e badges de status.
 *
 * Layout: o avatar fica em um wrapper com `relative z-10` para garantir que
 * aparece acima do banner quando sobrepõe. O conteúdo abaixo do banner tem
 * padding-top suficiente para acomodar o avatar sem overlap.
 */
export default function DiscordBanner({ user }) {
  const t = useT();
  if (!user) return null;

  const discordId = user.id || user.discordOauth2Id;
  const avatarHash = user.avatar || user.discordAvatar;
  const avatarUrl = discordId && avatarHash
    ? `https://cdn.discordapp.com/avatars/${discordId}/${avatarHash}.png?size=128`
    : null;

  const bannerHash = user.discordBanner || user.banner;
  const bannerUrl = discordId && bannerHash
    ? `https://cdn.discordapp.com/banners/${discordId}/${bannerHash}.png?size=1024`
    : null;

  const accentColor = user.discordAccentColor || '#7C3AED';

  // Nome de exibição: prioriza displayName, depois nome completo, depois username
  const displayName = user.displayName
    || `${user.firstName || ''} ${user.lastName || ''}`.trim()
    || user.username
    || user.email?.split('@')[0]
    || t('common.user');

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Banner — altura fixa, sem conteúdo sobreposto */}
      <div
        className="h-28 sm:h-36 relative"
        style={bannerUrl
          ? { backgroundImage: `url(${bannerUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
          : { background: `linear-gradient(135deg, ${accentColor}, #A855F7)` }
        }
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
      </div>

      {/* Conteúdo: avatar + info, lado a lado, com padding-top para não sobrepor o banner */}
      <div className="px-4 sm:px-6 pb-4 sm:pb-5">
        <div className="flex items-end gap-4 -mt-12 sm:-mt-14">
          {/* Avatar — wrapper com z-10 para garantir que aparece acima de qualquer elemento */}
          <div className="flex-shrink-0 relative z-10">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                className="h-20 w-20 sm:h-24 sm:w-24 rounded-full border-4 border-white shadow-lg bg-white object-cover relative z-20"
                onError={(e) => {
                  e.target.style.display = 'none';
                  const sib = e.target.nextElementSibling;
                  if (sib) sib.style.display = 'flex';
                }}
              />
            ) : null}
            <div
              className={`h-20 w-20 sm:h-24 sm:w-24 rounded-full border-4 border-white shadow-lg bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-2xl relative z-20 ${avatarUrl ? 'hidden' : ''}`}
            >
              {(displayName?.[0] || '?').toUpperCase()}
            </div>
          </div>

          {/* Nome + badges — relative z-10 para garantir que aparece acima do banner */}
          <div className="flex-1 min-w-0 pb-1 relative z-10">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">{displayName}</h1>
            {user.username && (
              <p className="text-xs text-gray-500 truncate">@{user.username}</p>
            )}
            <div className="flex flex-wrap gap-1 mt-1.5">
              {user.emailVerified ? (
                <span className="inline-flex items-center gap-1 text-[10px] text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                  <CheckCircleIcon className="h-3 w-3" /> {t("common.verified")}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                  <XCircleIcon className="h-3 w-3" /> {t("common.notVerified")}
                </span>
              )}
              {discordId && (
                <span className="inline-flex items-center gap-1 text-[10px] text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                  {t("settings.account.discordConnected")}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
