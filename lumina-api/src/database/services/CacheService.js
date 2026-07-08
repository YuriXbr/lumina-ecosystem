/**
 * src/database/services/CacheService.js
 *
 * Cache persistente baseado em MongoDB — serverless-safe.
 * Substitui o cache em memória que foi adicionado em SkinService.js, que
 * é ineficaz em ambiente serverless (cada invocação é um processo novo,
 * o Map em memória é sempre vazio) e potencialmente perigoso em ambientes
 * multi-instância (cache stale por instância).
 *
 * Os TTLs são gerenciados pelo MongoDB nativo via índice { expiresAt: 1 }
 * com expireAfterSeconds: 0 — o próprio MongoDB remove entradas expiradas.
 */

'use strict';

const DatabaseService = require('./DataBaseService');
const { mongoSchema } = require('../schema');

class CacheService extends DatabaseService {
    constructor() {
        super('apicache', mongoSchema.apiCache);
        this._indexEnsured = false;
    }

    async _ensureIndex() {
        if (this._indexEnsured) return;
        try {
            await this.connect();
            await this.model.collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, background: true });
            await this.model.collection.createIndex({ key: 1 }, { unique: true, background: true });
            this._indexEnsured = true;
        } catch (e) {
            console.error('[CacheService] Falha ao criar índices:', e.message);
        }
    }

    /**
     * Busca um valor do cache. Retorna null se inexistente ou expirado.
     */
    async get(key) {
        try {
            await this._ensureIndex();
            const doc = await this.model.findOne({ key, expiresAt: { $gt: new Date() } }).lean();
            return doc ? doc.value : null;
        } catch (e) {
            console.error('[CacheService] get error:', e.message);
            return null;
        }
    }

    /**
     * Armazena um valor no cache com TTL em ms.
     * Usa upsert para sobrescrever entradas existentes.
     */
    async set(key, value, ttlMs) {
        try {
            await this._ensureIndex();
            const expiresAt = new Date(Date.now() + ttlMs);
            await this.model.findOneAndUpdate(
                { key },
                { $set: { value, expiresAt, createdAt: new Date() } },
                { upsert: true, new: true }
            );
        } catch (e) {
            console.error('[CacheService] set error:', e.message);
        }
    }

    /**
     * Remove uma entrada explicitamente do cache.
     */
    async invalidate(key) {
        try {
            await this.connect();
            await this.model.deleteOne({ key });
        } catch (e) {
            console.error('[CacheService] invalidate error:', e.message);
        }
    }

    /**
     * Remove todas as entradas cujo key começa com prefix.
     * Útil para invalidar grupos de cache (ex: 'skins:*').
     */
    async invalidateByPrefix(prefix) {
        try {
            await this.connect();
            await this.model.deleteMany({ key: { $regex: `^${prefix}` } });
        } catch (e) {
            console.error('[CacheService] invalidateByPrefix error:', e.message);
        }
    }
}

module.exports = new CacheService();
