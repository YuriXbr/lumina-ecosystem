/**
 * URL base da API.
 *
 * Em desenvolvimento: '' (vazio) — o proxy do Vite encaminha /expapi e /api
 * para localhost:3000.
 *
 * Em produção: 'https://api.bot.luminasink.com/' — configurado via
 * VITE_API_BASE_URL no painel da Vercel ou .env.production.
 *
 * Fallback: se VITE_API_BASE_URL não estiver definido (build sem env),
 * usa a origem atual + /api/ como fallback para evitar que fetches
 * caiam no catch-all do SPA.
 */
export const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
