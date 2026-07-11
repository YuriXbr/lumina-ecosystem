'use strict';

const LuminaApiService = require('./LuminaApiService');

class GuildConfigCache {
    static TTL_CRITICAL_MS = 60 * 1000;
    static TTL_NON_CRITICAL_MS = 5 * 60 * 1000;

    constructor() {
        this.cache = new Map();
        this.api = new LuminaApiService();
        // Track guilds that returned 404 to avoid retrying every 60s
        this.knownMissing = new Set();
    }

    async getCachedGuildConfig(guildId, isCritical = false) {
        if (!guildId) throw new Error('guildId é obrigatório.');

        // Skip API call if we know this guild isn't registered
        // Re-check every 5 minutes in case it gets registered
        if (this.knownMissing.has(guildId)) {
            const entry = this.cache.get(guildId);
            if (entry && Date.now() - entry.fetchedAt < 5 * 60 * 1000) {
                return entry.config;
            }
        }

        const ttl = isCritical ? GuildConfigCache.TTL_CRITICAL_MS : GuildConfigCache.TTL_NON_CRITICAL_MS;
        const entry = this.cache.get(guildId);
        const now = Date.now();

        if (entry && (now - entry.fetchedAt) < ttl) {
            return entry.config;
        }

        let config;
        try {
            config = await this._fetchFromApi(guildId);
            this.knownMissing.delete(guildId);
        } catch (error) {
            if (entry) return entry.config;
            const status = error?.status || error?.response?.status;
            if (status === 404) {
                this.knownMissing.add(guildId);
                return null;
            }
            throw error;
        }

        if (config) {
            this.cache.set(guildId, { config, fetchedAt: now });
        } else if (entry) {
            return entry.config;
        }
        return config;
    }

    invalidateCache(guildId) {
        this.cache.delete(guildId);
        this.knownMissing.delete(guildId);
    }

    invalidateAll() {
        this.cache.clear();
        this.knownMissing.clear();
    }

    peek(guildId) {
        const entry = this.cache.get(guildId);
        return entry ? entry.config : null;
    }

    async _fetchFromApi(guildId) {
        try {
            return await this.api.post('/expapi/internal/fetchguilddata', { guildId });
        } catch (err) {
            const status = err?.status || err?.response?.status;
            if (status === 404) return null;
            throw err;
        }
    }
}

module.exports = new GuildConfigCache();
