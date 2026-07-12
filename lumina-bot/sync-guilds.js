/**
 * sync-guilds.js
 * --------------------------------------------------------------------------
 * Script standalone que sincroniza o banco da Lumina API com as guildas
 * reais que o bot está neste momento.
 *
 * O que faz:
 *  1. Loga no Discord com o token do bot (Client mínimo, intent Guilds).
 *  2. Para cada guild do cache:
 *     - GET  /expapi/internal/fetchguilddata  (checa se está cadastrada)
 *     - Se NÃO existe (404):
 *         POST /expapi/internal/newguild  (cadastra)
 *         + importa bans herdados (igual ao evento guildCreate)
 *     - Se JÁ existe (200):
 *         POST /expapi/internal/updateguilddata  (sincroniza name/memberCount)
 *  3. Imprime um resumo final e encerra.
 *
 * Flags:
 *  --dry-run        Apenas simula; não escreve nada na API.
 *  --guild=<id>     Processa só a guild informada (debug).
 *  --skip-bans      Pula a importação de bans herdados das guildas novas.
 *  --verbose        Logs detalhados por chamada.
 *
 * Uso:
 *  node sync-guilds.js
 *  node sync-guilds.js --dry-run
 *  node sync-guilds.js --guild=123456789 --verbose
 *
 * Pré-requisitos (env):
 *  - DISCORD_BOT_TOKEN
 *  - API_BASE_URL
 *  - INTERNAL_API_KEY
 *  - LUMINA_API_KEY
 *  - ENCRYPTION_KEY
 *
 * Roda exatamente no mesmo ambiente do bot; reaproveita LuminaApiService
 * e EncryptionService para manter paridade de auth/headers.
 * --------------------------------------------------------------------------
 */

'use strict';

// ============================
// 0. ENV (mesmo padrão do index.js)
// ============================
if (process.env.NODE_ENV !== 'production') {
    require('@dotenvx/dotenvx').config({ path: '.env.dev' });
    console.log('[sync-guilds] Running in development mode (.env.dev)');
} else {
    require('@dotenvx/dotenvx').config({ path: '.env' });
    console.log('[sync-guilds] Running in production mode (.env)');
}

const { Client, GatewayIntentBits } = require('discord.js');

const c = require('./src/utils/colorCodes.js');
const botConfigService = require('./src/utils/services/EncryptionService.js');
const LuminaApiService = require('./src/utils/services/LuminaApiService.js');


// ============================
// 1. Parse de flags CLI
// ============================
const args = process.argv.slice(2);
const FLAG_DRY_RUN = args.includes('--dry-run');
const FLAG_SKIP_BANS = args.includes('--skip-bans');
const FLAG_VERBOSE = args.includes('--verbose') || args.includes('-v');

const GUILD_FILTER = (() => {
    const found = args.find(a => a.startsWith('--guild='));
    return found ? found.split('=')[1] : null;
})();

// ============================
// 2. Guards de ambiente
// ============================
process.on('unhandledRejection', (reason) => {
    console.error('[UNHANDLED REJECTION]', reason);
});
process.on('uncaughtException', (err) => {
    console.error('[UNCAUGHT EXCEPTION]', err);
    process.exit(1);
});

const REQUIRED_ENV = [
    'DISCORD_BOT_TOKEN',
    'API_BASE_URL',
    'INTERNAL_API_KEY',
    'LUMINA_API_KEY',
    'ENCRYPTION_KEY',
];
for (const key of REQUIRED_ENV) {
    if (!process.env[key]) {
        console.error(c.error + `Missing env var: ${key}`);
        process.exit(1);
    }
}

// ============================
// 3. Constantes
// ============================
// Pequeno delay entre chamadas à API para ser educado com o servidor
// (evita estourar eventuais rate limits do Express/Mongo).
const API_DELAY_MS = 250;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ============================
// 4. Cliente API (mesma instância usada pelo bot)
// ============================
let api;
try {
    api = new LuminaApiService();
} catch (err) {
    console.error(c.error + 'Failed to instantiate LuminaApiService:', err.message);
    process.exit(1);
}

// ============================
// 5. Bootstrap (carrega config do bot via API — garante auth)
// ============================
async function bootstrap() {
    try {
        await botConfigService.setupConfig();
        console.log(c.arrow + c.verdebold('[sync-guilds] Bot configuration loaded successfully'));
    } catch (err) {
        console.error(c.error + 'Failed to load bot configuration:', err.message);
        process.exit(1);
    }
}

// ============================
// 6. Estado da guilda na API
// =================-----------

/**
 * Checa se a guilda está cadastrada na API.
 * Retorna { exists: boolean, data?: object }
 */
async function fetchGuildState(guildId) {
    try {
        const data = await api.post('/expapi/internal/fetchguilddata', { guildId });
        return { exists: true, data };
    } catch (err) {
        const status = err?.response?.status ?? err?.apiContext?.status;
        if (status === 404) {
            return { exists: false, data: null };
        }
        throw err; // outros erros propagam
    }
}

/**
 * Cadastra uma guilda nova.
 */
async function createGuild({ guildId, ownerId, guildName }) {
    // O endpoint é idempotente (upsert), mas só o chamamos quando sabemos
    // que a guilda não existe — mantém o log limpo.
    return api.post('/expapi/internal/newguild', {
        guildId,
        ownerId,
        guildName,
    });
}

/**
 * Atualiza campos sincronizáveis de uma guilda existente.
 * Não tocamos em campos que o dono configurou (muteRoleId, etc.).
 */
async function updateGuild({ guildId, guildName, memberCount }) {
    return api.post('/expapi/internal/updateguilddata', {
        guildId,
        guildReferenceName: guildName,
        memberCount,
    });
}

/**
 * Importa bans herdados — replica o comportamento do guildCreate.js.
 * Retorna o número de bans importados (0 se não tiver permissão).
 */
async function importInheritedBans(guild) {
    try {
        const bans = await guild.bans.fetch();
        let count = 0;
        for (const [userId, banInfo] of bans) {
            const staffId = banInfo.executor ? banInfo.executor.id : 'unknown';
            const reason = banInfo.reason ? `${banInfo.reason} (herdado)` : 'Sem motivo (herdado)';
            try {
                await api.post('/expapi/internal/newpunishrecord', {
                    type: 'ban',
                    guildId: guild.id,
                    targetId: userId,
                    staffId,
                    reason,
                    endTime: null,
                });
                count++;
            } catch (err) {
                // 409 / duplicate — silencioso para não poluir o log
                const status = err?.response?.status ?? err?.apiContext?.status;
                if (FLAG_VERBOSE && status !== 409) {
                    console.error(c.error + `  ban import failed for ${userId} in ${guild.id}: ${err.message}`);
                }
            }
        }
        return count;
    } catch (err) {
        // Sem permissão BanMembers, ou Discord rate limit — não é fatal
        if (FLAG_VERBOSE) {
            console.error(c.alerta(`  could not fetch bans for ${guild.name} (${guild.id}): ${err.message}`));
        }
        return 0;
    }
}

// ============================
// 7. Processamento principal
// ============================
async function processGuild(guild, stats) {
    const tag = `${guild.name} (${guild.id})`;

    if (FLAG_DRY_RUN) {
        console.log(c.alerta(`[DRY-RUN] Would check ${tag} — memberCount=${guild.memberCount}`));
        stats.skipped++;
        return;
    }

    // 7.1 Checa estado atual
    let state;
    try {
        state = await fetchGuildState(guild.id);
    } catch (err) {
        console.error(c.error + `Failed to fetch state for ${tag}: ${err.message}`);
        stats.failed++;
        return;
    }
    await sleep(API_DELAY_MS);

    // 7.2 Novo cadastro
    if (!state.exists) {
        console.log(c.arrow + `New guild: ${tag} — creating...`);
        try {
            await createGuild({
                guildId: guild.id,
                ownerId: guild.ownerId,
                guildName: guild.name,
            });
            console.log(c.verdebold(`  ✓ Registered ${tag}`));
            stats.created++;

            // Importa bans herdados (igual guildCreate.js)
            if (!FLAG_SKIP_BANS) {
                const bans = await importInheritedBans(guild);
                if (bans > 0) {
                    console.log(c.verde(`  ↳ Imported ${bans} inherited ban(s)`));
                }
            }
        } catch (err) {
            console.error(c.error + `Failed to register ${tag}: ${err.message}`);
            stats.failed++;
        }
        return;
    }

    // 7.3 Update de guilda existente — só sincroniza campos "ao vivo"
    // (nome do servidor pode ter mudado, memberCount muda o tempo todo).
    // Não sobrescreve nenhuma config feita pelo dono no dashboard.
    const needsNameUpdate = state.data.guildReferenceName !== guild.name;
    const currentMemberCount = state.data.memberCount;
    const needsMemberUpdate =
        typeof currentMemberCount !== 'number' || currentMemberCount !== guild.memberCount;

    if (!needsNameUpdate && !needsMemberUpdate) {
        if (FLAG_VERBOSE) {
            console.log(c.arrow + `Up to date: ${tag}`);
        }
        stats.upToDate++;
        return;
    }

    if (FLAG_VERBOSE) {
        const changes = [];
        if (needsNameUpdate) changes.push(`name: "${state.data.guildReferenceName}" → "${guild.name}"`);
        if (needsMemberUpdate) changes.push(`memberCount: ${currentMemberCount} → ${guild.memberCount}`);
        console.log(c.arrow + `Updating ${tag} — ${changes.join(', ')}`);
    } else {
        console.log(c.arrow + `Updating ${tag}`);
    }

    try {
        await updateGuild({
            guildId: guild.id,
            guildName: guild.name,
            memberCount: guild.memberCount,
        });
        console.log(c.verdebold(`  ✓ Updated ${tag}`));
        stats.updated++;
    } catch (err) {
        console.error(c.error + `Failed to update ${tag}: ${err.message}`);
        stats.failed++;
    }
}

// ============================
// 8. Resumo final
// ============================
function printSummary(stats, elapsedMs) {
    console.log('\n' + c.bold('─────────────────────────────────────────────'));
    console.log(c.bold(' SYNC-GUILDS SUMMARY'));
    console.log(c.bold('─────────────────────────────────────────────'));
    console.log(`  Total processed : ${stats.total}`);
    console.log(c.verde(`  Created         : ${stats.created}`));
    console.log(c.verde(`  Updated         : ${stats.updated}`));
    console.log(`  Up to date      : ${stats.upToDate}`);
    if (FLAG_DRY_RUN) {
        console.log(c.alerta(`  Skipped (dry)   : ${stats.skipped}`));
    }
    console.error(c.vermelho(`  Failed          : ${stats.failed}`));
    console.log(`  Elapsed         : ${(elapsedMs / 1000).toFixed(2)}s`);
    console.log(c.bold('─────────────────────────────────────────────') + '\n');
}

// ============================
// 9. Entry point
// ============================
(async () => {
    const startedAt = Date.now();

    console.log(c.arrow + c.bold('sync-guilds starting...'));
    if (FLAG_DRY_RUN)   console.log(c.alerta('  mode: DRY-RUN (no writes)'));
    if (GUILD_FILTER)   console.log(c.arrow + `  filter: guild=${GUILD_FILTER}`);
    if (FLAG_SKIP_BANS) console.log(c.arrow + '  inherited bans: SKIP');

    // 9.1 Bootstrap (auth + config)
    await bootstrap();

    // 9.2 Login no Discord — Client mínimo, só intent Guilds
    //     (não carrega comandos, eventos, voice, etc.)
    const client = new Client({
        intents: [GatewayIntentBits.Guilds],
    });

    console.log(c.arrow + 'Logging in to Discord...');
    await client.login(process.env.DISCORD_BOT_TOKEN);
    console.log(c.verdebold(`  ✓ Logged in as ${client.user.tag}`));

    // 9.3 Espera o cache de guilds estar populado.
    //     Em bots em muitas guildas, o READY pode não trazer todas as
    //     guildas imediatamente; aguarda estabilizar.
    console.log(c.arrow + `Waiting for guild cache (currently ${client.guilds.cache.size})...`);
    await client.guilds.fetch();
    // Pequeno sleep para o cache interno estabilizar após o fetch
    await sleep(1500);
    console.log(c.verdebold(`  ✓ Guild cache ready: ${client.guilds.cache.size} guild(s)`));

    // 9.4 Filtra (se --guild=...)
    let guildsToProcess = [...client.guilds.cache.values()];
    if (GUILD_FILTER) {
        guildsToProcess = guildsToProcess.filter(g => g.id === GUILD_FILTER);
        if (guildsToProcess.length === 0) {
            console.error(c.error + `Guild ${GUILD_FILTER} not found in cache.`);
            client.destroy();
            process.exit(1);
        }
    }

    // 9.5 Itera
    const stats = {
        total: guildsToProcess.length,
        created: 0,
        updated: 0,
        upToDate: 0,
        failed: 0,
        skipped: 0,
    };

    console.log(c.arrow + `Processing ${stats.total} guild(s)...\n`);

    for (const guild of guildsToProcess) {
        try {
            await processGuild(guild, stats);
        } catch (err) {
            console.error(c.error + `Unexpected error on ${guild.name} (${guild.id}): ${err.message}`);
            stats.failed++;
        }
        await sleep(API_DELAY_MS);
    }

    // 9.6 Resumo + saída limpa
    printSummary(stats, Date.now() - startedAt);

    client.destroy();
    process.exit(stats.failed > 0 ? 1 : 0);
})();