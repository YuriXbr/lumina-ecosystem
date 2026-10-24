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
        this.pending = new Map();
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

        if (!this.pending.has(guildId)) {
            const pending = this._fetchFromApi(guildId).then(config => {
                this.cache.set(guildId, {config, fetchedAt: Date.now()});
                if (config) this.knownMissing.delete(guildId);
                else this.knownMissing.add(guildId);
                return config;
            }).finally(() => this.pending.delete(guildId));
            this.pending.set(guildId, pending);
        }
        // Expired permissions cannot authorize commands during an API outage.
        return this.pending.get(guildId);
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
