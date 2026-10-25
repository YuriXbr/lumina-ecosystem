/**
 * Helpers de API para os novos endpoints do redesign.
 *
 * Após a migração para cookie httpOnly, não usamos mais Authorization: Bearer.
 * Todas as chamadas usam `credentials: 'include'` para enviar o cookie automaticamente.
 */

import { apiGetJson,apiPost,apiDelete } from './apiFetch';
export const fetchMyGuilds=()=>apiGetJson('expapi/v1/my-guilds');
export function fetchNews({limit=20,offset=0}={}) {
 const params=new URLSearchParams({limit:String(limit),offset:String(offset)});
 return apiGetJson(`expapi/v1/news?${params}`);
}
export const createNewsPost=body=>apiPost('expapi/v1/admin/news',body);
export const deleteNewsPost=id=>apiDelete(`expapi/v1/admin/news?id=${encodeURIComponent(id)}`);

/**
 * Helpers para URLs de avatar/banner do Discord.
 */
export function getDiscordAvatarUrl(user) {
  if (!user) return null;
  const id = user.id || user.discordOauth2Id;
  const avatar = user.avatar || user.discordAvatar;
  if (id && avatar) {
    if (/^https:\/\/cdn\.discordapp\.com\/avatars\//.test(avatar)) return avatar;
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
