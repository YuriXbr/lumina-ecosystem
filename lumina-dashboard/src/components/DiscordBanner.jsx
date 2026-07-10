import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

/**
 * Banner no topo da Área de Membros mostrando o perfil do usuário.
 *
 * Usa o banner real do Discord (se disponível) com fallback para gradiente roxo.
 * O texto do nome/username usa text-shadow para garantir legibilidade sobre
 * qualquer cor de fundo do banner.
 */
export default function DiscordBanner({ user }) {
  if (!user) return null;

  const discordId = user.id || user.discordOauth2Id;
  const avatarHash = user.avatar || user.discordAvatar;
  const avatarUrl = discordId && avatarHash
    ? `https://cdn.discordapp.com/avatars/${discordId}/${avatarHash}.png?size=128`
    : null;

  // Banner do Discord — retornado por discordInfo.js
  const bannerHash = user.discordBanner || user.banner;
  const bannerUrl = discordId && bannerHash
    ? `https://cdn.discordapp.com/banners/${discordId}/${bannerHash}.png?size=1024`
    : null;

  // Accent color do Discord (int → hex)
  const accentInt = user.discordAccentColor || user.accentColor;
  const accentColor = accentInt ? `#${accentInt.toString(16).padStart(6, '0')}` : '#7C3AED';

  const displayName = user.displayName
    || user.globalName
    || `${user.firstName || ''} ${user.lastName || ''}`.trim()
    || user.username
    || user.email?.split('@')[0]
    || 'Usuário';

  // Texto sempre branco com sombra para legibilidade sobre qualquer fundo
  const textShadow = '0 1px 3px rgba(0,0,0,0.8), 0 0 8px rgba(0,0,0,0.5)';

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Banner do Discord ou gradiente */}
      <div
        className="h-28 sm:h-36 relative"
        style={bannerUrl
          ? { backgroundImage: `url(${bannerUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
          : { background: `linear-gradient(135deg, ${accentColor}, #A855F7)` }
        }
      >
        {/* Gradiente escuro no topo para o nome ser visível */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
      </div>

      {/* Conteúdo: avatar + info */}
      <div className="px-4 sm:px-6 pb-4 sm:pb-5">
        <div className="flex items-end gap-4 -mt-12 sm:-mt-14">
          {/* Avatar */}
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

          {/* Nome + badges — relative z-10 para garantir visibilidade */}
          <div className="flex-1 min-w-0 pb-1 relative z-10">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">{displayName}</h1>
            {user.username && (
              <p className="text-xs text-gray-500 truncate">@{user.username}</p>
            )}
            <div className="flex flex-wrap gap-1 mt-1.5">
              {user.emailVerified ? (
                <span className="inline-flex items-center gap-1 text-[10px] text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                  <CheckCircleIcon className="h-3 w-3" /> Email verificado
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                  <XCircleIcon className="h-3 w-3" /> Email não verificado
                </span>
              )}
              {discordId && (
                <span className="inline-flex items-center gap-1 text-[10px] text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                  Discord vinculado
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
