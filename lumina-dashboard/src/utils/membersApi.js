/**
 * Helpers de API para os novos endpoints do redesign.
 *
 * Após a migração para cookie httpOnly, não usamos mais Authorization: Bearer.
 * Todas as chamadas usam `credentials: 'include'` para enviar o cookie automaticamente.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/';

/**
 * Busca as guildas (servidores) do usuário logado no Discord, marcando
 * quais têm o bot e quais o usuário pode gerenciar.
 */
export async function fetchMyGuilds() {
  const res = await fetch(`${API_BASE}expapi/v1/my-guilds`, {
    credentials: 'include',
  });
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) detail = body.error;
    } catch { /* corpo não-JSON */ }
    throw new Error(detail);
  }
  return res.json();
}

/**
 * Busca o feed de novidades (público — não exige auth).
 */
export async function fetchNews({ limit = 20, offset = 0 } = {}) {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  const res = await fetch(`${API_BASE}expapi/v1/news?${params.toString()}`, {
    credentials: 'include',
  });
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) detail = body.error;
    } catch { /* corpo não-JSON */ }
    throw new Error(detail);
  }
  return res.json();
}

/**
 * Cria um post no feed de novidades (admin only).
 */
export async function createNewsPost({ title, body, excerpt, imageUrl, tag, pinned }) {
  const csrfToken = await getCsrfToken();
  const res = await fetch(`${API_BASE}expapi/v1/admin/news`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    credentials: 'include',
    body: JSON.stringify({ title, body, excerpt, imageUrl, tag, pinned }),
  });
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) detail = body.error;
    } catch { /* corpo não-JSON */ }
    throw new Error(detail);
  }
  return res.json();
}

/**
 * Remove um post do feed de novidades (admin only).
 */
export async function deleteNewsPost(id) {
  const csrfToken = await getCsrfToken();
  const res = await fetch(`${API_BASE}expapi/v1/admin/news?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { 'X-CSRF-Token': csrfToken },
    credentials: 'include',
  });
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) detail = body.error;
    } catch { /* corpo não-JSON */ }
    throw new Error(detail);
  }
  return res.json();
}

// Helper local para CSRF token
let csrfCache = null;
async function getCsrfToken() {
  if (csrfCache) return csrfCache;
  const res = await fetch(`${API_BASE}expapi/v1/csrf-token`, { credentials: 'include' });
  const data = await res.json();
  csrfCache = data.csrfToken || '';
  return csrfCache;
}

/**
 * Reseta o cache interno do CSRF token. Usado apenas em testes.
 */
export function _resetCsrfCacheForTests() {
  csrfCache = null;
}

/**
 * Helpers para URLs de avatar/banner do Discord.
 */
export function getDiscordAvatarUrl(user) {
  if (!user) return null;
  const id = user.id || user.discordOauth2Id;
  const avatar = user.avatar || user.discordAvatar;
  if (id && avatar) {
    return `https://cdn.discordapp.com/avatars/${id}/${avatar}.png?size=256`;
  }
  return null;
}

export function getDiscordBannerUrl(user) {
  if (!user) return null;
  const id = user.id || user.discordOauth2Id;
  const banner = user.discordBanner;
  if (id && banner) {
    return `https://cdn.discordapp.com/banners/${id}/${banner}.png?size=1024`;
  }
  return null;
}
