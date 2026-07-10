/**
 * Lista centralizada de origens permitidas para CORS e OAuth state.
 *
 * Usada por:
 *   - index.js (middleware CORS)
 *   - oauthProviders/state.js (isAllowedOrigin)
 *
 * Manter em um único lugar evita dessincronização entre as duas allow-lists
 * (que historicamente tinham entradas diferentes).
 */

'use strict';

const ALLOWED_ORIGINS = [
    // Produção
    'https://luminasink.me',
    'https://www.luminasink.me',
    'https://bot.luminasink.com',
    'https://api.bot.luminasink.com',
    // API Vercel
    'https://lumina-api-tau.vercel.app',
    // Dev local
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
];

/**
 * Verifica se uma origin está na allow-list.
 * Em desenvolvimento, também aceita previews Vercel do projeto (regex).
 */
function isAllowedOrigin(origin) {
    if (!origin) return false;
    if (ALLOWED_ORIGINS.includes(origin)) return true;

    // Preview deployments do Vercel — apenas em não-produção
    if (process.env.NODE_ENV !== 'production') {
        const vercelRegex = /^https:\/\/[a-zA-Z0-9-]+-yurixbrs-projects\.vercel\.app$/;
        if (vercelRegex.test(origin)) return true;
    }

    return false;
}

/**
 * Retorna a array de origins para o middleware cors() do Express.
 */
function getAllowedOrigins() {
    return [...ALLOWED_ORIGINS];
}

module.exports = {
    ALLOWED_ORIGINS,
    isAllowedOrigin,
    getAllowedOrigins,
};
