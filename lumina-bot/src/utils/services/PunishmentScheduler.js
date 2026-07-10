'use strict';

/**
 * Sistema de fila de jobs persistente baseado em MongoDB.
 *
 * Resolve o problema de punições temporárias (mute/ban/warn) que eram agendadas
 * com setTimeout() e perdidas quando o processo do bot era reiniciado.
 *
 * Como funciona:
 *   1. As rotas internas (newPunishRecord) salvam a punição no MongoDB com
 *      `endTime` (quando deve expirar).
 *   2. Este serviço faz polling a cada 30s procurando punições onde
 *      `endTime <= now` e `endTime > startTime` (ainda não expirou).
 *   3. Para cada punição expirada, executa o callback de remoção e marca
 *      `endTime = startTime` (sinaliza que já foi processada).
 *
 * Vantagens sobre setTimeout:
 *   - Sobrevive a restarts do processo
 *   - Escala horizontalmente (múltiplas instâncias não duplicam — usa
 *     findOneAndUpdate atômico para "claim" o job)
 *   - Não consome memória enquanto espera
 */

const mongoose = require('mongoose');

const PUNISH_TYPES = ['mute', 'ban', 'warn'];

// Schema inline — não precisa estar no schema.js principal porque é derivado
// do punishList existente. Usamos a mesma collection.
const punishSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    targetId: { type: String, required: true },
    staffId: { type: String, required: true },
    reason: { type: String, default: '' },
    startTime: { type: Date, default: Date.now },
    endTime: { type: Date, default: null },
}, { collection: 'punishlists' });

const PunishModel = mongoose.models.punishlists
    ? mongoose.models.punishlists
    : mongoose.model('punishlists', punishSchema);

let pollInterval = null;
let isPolling = false;

/**
 * Inicia o polling de jobs de punição.
 * Deve ser chamado uma vez no boot do bot (events/ready.js).
 *
 * @param {object} client - Instância do client Discord.js
 * @param {number} intervalMs - Intervalo de polling (default: 30s)
 */
function startPunishmentScheduler(client, intervalMs = 30000) {
    if (pollInterval) {
        console.log('[Scheduler] Punishment scheduler already running');
        return;
    }

    console.log(`[Scheduler] Starting punishment scheduler (poll every ${intervalMs / 1000}s)`);
    pollInterval = setInterval(() => pollExpiredPunishments(client).catch(console.error), intervalMs);

    // Executa imediatamente no boot para pegar punições que expiraram
    // enquanto o bot estava offline
    pollExpiredPunishments(client).catch(console.error);
}

/**
 * Para o scheduler (usado em testes/shutdown).
 */
function stopPunishmentScheduler() {
    if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
        console.log('[Scheduler] Punishment scheduler stopped');
    }
}

/**
 * Busca e processa punições expiradas.
 * Usa findOneAndUpdate atômico para "claim" cada job — garante que
 * múltiplas instâncias do bot não processem o mesmo job.
 */
async function pollExpiredPunishments(client) {
    if (isPolling) return; // Evita overlap
    isPolling = true;

    try {
        if (mongoose.connection.readyState !== 1) {
            return; // DB não conectado
        }

        const now = new Date();

        // Busca punições onde endTime <= now e endTime > startTime
        // (endTime > startTime significa que ainda não foi processada)
        const expired = await PunishModel.find({
            endTime: { $lte: now, $gt: new Date(0) },
        }).limit(50).lean();

        if (expired.length === 0) return;

        console.log(`[Scheduler] Found ${expired.length} expired punishment(s) to process`);

        for (const punish of expired) {
            try {
                // Tenta "claim" o job atomicamente — seta endTime para epoch 0
                // para que outras instâncias não peguem
                const claimed = await PunishModel.findOneAndUpdate(
                    { _id: punish._id, endTime: punish.endTime },
                    { $set: { endTime: new Date(0) } }
                ).lean();

                if (!claimed) {
                    // Outra instância pegou primeiro
                    continue;
                }

                await processPunishment(client, punish);
                console.log(`[Scheduler] Processed ${punish.guildId}/${punish.targetId} (${punish._id})`);
            } catch (err) {
                console.error(`[Scheduler] Error processing punishment ${punish._id}:`, err.message);
                // Restaura endTime para tentar novamente no próximo ciclo
                await PunishModel.updateOne(
                    { _id: punish._id },
                    { $set: { endTime: new Date(Date.now() + 60000) } } // retry em 1min
                ).catch(() => {});
            }
        }
    } catch (err) {
        console.error('[Scheduler] Error in pollExpiredPunishments:', err.message);
    } finally {
        isPolling = false;
    }
}

/**
 * Processa uma punição expirada — remove o role/ban do usuário.
 */
async function processPunishment(client, punish) {
    const guild = client.guilds.cache.get(punish.guildId);
    if (!guild) {
        console.log(`[Scheduler] Guild ${punish.guildId} not in cache, skipping`);
        return;
    }

    // Determina o tipo pela collection/documento
    // O punishList não tem campo "type" — inferimos pelo que existe
    // Mute: tem muteRoleId no guildData
    // Ban: usuário não está mais no servidor
    // Warn: não tem ação automática (warns são contadores)

    try {
        const member = await guild.members.fetch(punish.targetId).catch(() => null);

        if (member) {
            // Tenta remover role de mute
            const GuildService = require('../utils/services/LuminaApiService');
            // Busca guild data para pegar muteRoleId
            const guildData = await GuildService.getGuildData(guild.id);
            if (guildData && guildData.muteRoleId) {
                const muteRole = guild.roles.cache.get(guildData.muteRoleId);
                if (muteRole && member.roles.cache.has(muteRole.id)) {
                    await member.roles.remove(muteRole, `Auto-unmute: punishment expired (scheduled by PunishmentScheduler)`);
                    console.log(`[Scheduler] Removed mute role from ${punish.targetId} in ${guild.name}`);
                }
            }
        }

        // Tenta remover ban (se o usuário estava banido)
        const banInfo = await guild.bans.fetch(punish.targetId).catch(() => null);
        if (banInfo) {
            await guild.members.unban(punish.targetId, `Auto-unban: punishment expired (scheduled by PunishmentScheduler)`);
            console.log(`[Scheduler] Unbanned ${punish.targetId} in ${guild.name}`);
        }
    } catch (err) {
        console.error(`[Scheduler] Error in processPunishment for ${punish.targetId}:`, err.message);
        throw err;
    }
}

module.exports = {
    startPunishmentScheduler,
    stopPunishmentScheduler,
    pollExpiredPunishments,
};
