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
    'https://api-bot.luminasink.com',
    // API Vercel
    'https://lumina-api-tau.vercel.app',
    // Dev local / Docker
    'http://localhost',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5179',
    'http://localhost:5180',
    'http://localhost:8080',
    'http://127.0.0.1',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5179',
    'http://127.0.0.1:5180',
    'http://127.0.0.1:8080',
];
const PRODUCTION_ORIGINS=['https://bot.luminasink.com','https://api-bot.luminasink.com'];
function configuredOrigins(){
    return (process.env.ADDITIONAL_ALLOWED_ORIGINS||'').split(',').map(value=>value.trim()).filter(value=>{
        try{const url=new URL(value);return url.protocol==='https:'&&url.origin===value&&!url.username&&!url.password;}catch{return false;}
    });
}

/**
 * Verifica se uma origin está na allow-list.
 * Em desenvolvimento, também aceita previews Vercel do projeto (regex).
 */
function isAllowedOrigin(origin) {
    if (!origin) return false;
    if(process.env.NODE_ENV==='production')return PRODUCTION_ORIGINS.includes(origin)||configuredOrigins().includes(origin);
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
    return process.env.NODE_ENV==='production'?[...PRODUCTION_ORIGINS,...configuredOrigins()]:[...ALLOWED_ORIGINS];
}

module.exports = {
    ALLOWED_ORIGINS,
    isAllowedOrigin,
    getAllowedOrigins,
};
