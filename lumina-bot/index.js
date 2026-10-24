console.clear();

if (process.env.NODE_ENV !== 'production') {
    console.log('Running in development mode');
    require('@dotenvx/dotenvx').config({ path: '.env.dev' });
} else {
    console.log('Running in production mode');
    require('@dotenvx/dotenvx').config({ path: '.env' });
}

const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');
const c = require('./src/utils/colorCodes.js');
const botConfigService = require('./src/utils/services/EncryptionService.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
		GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
    ],
	 partials: [Partials.Channel]
});

client.commands = new Collection();
client.events = new Collection();
client._cooldowns = new Collection();

let shuttingDown = false;
function shutdown(error) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.error('[FATAL]', error?.code || error?.name || 'UNEXPECTED_FAILURE');
    require('./src/utils/services/PunishmentScheduler').stopPunishmentScheduler();
    require('./src/utils/services/GuildSyncService').getGuildSync().stop();
    require('./src/utils/services/BotConsoleService').getBotConsole().stop();
    const timeout = setTimeout(() => process.exit(1), 10000);
    timeout.unref();
    Promise.resolve().then(() => client.destroy()).finally(() => process.exit(1));
}
process.on('unhandledRejection', shutdown);
process.on('uncaughtException', shutdown);
for (const signal of ['SIGTERM','SIGINT']) process.once(signal, () => {
    require('./src/utils/services/PunishmentScheduler').stopPunishmentScheduler();
    require('./src/utils/services/GuildSyncService').getGuildSync().stop();
    require('./src/utils/services/BotConsoleService').getBotConsole().stop();
    Promise.resolve().then(() => client.destroy()).finally(() => process.exit(0));
});

// ==========================
// BOOTSTRAP CORRETO
// ==========================
async function bootstrap() {
    try {
        // 1. CONFIG PRIMEIRO (OBRIGATÓRIO)
        await botConfigService.setupConfig();
        require('./src/utils/services/BotConsoleService').getBotConsole().start(client);
        console.log(c.arrow + c.verdebold('[SUCCESS] Bot configuration loaded successfully'));

        // 2. CARREGA COMANDOS
        const foldersPath = path.join(__dirname, 'src', 'commands');
        const commandFolders = fs.readdirSync(foldersPath);

        for (const folder of commandFolders) {
            const commandsPath = path.join(foldersPath, folder);
            const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

            for (const file of commandFiles) {
                const command = require(path.join(commandsPath, file));
                console.log(c.arrow + c.verdebold(`[SUCCESS] Command loaded: ${command.data.name}`));

                if (command.data && command.execute) {
                    client.commands.set(command.data.name, command);
                }
            }
        }

        // 3. CARREGA EVENTOS (AGORA SEGURO)
        const eventsPath = path.join(__dirname, 'src', 'events');
        const eventFiles = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));

        for (const file of eventFiles) {
            const event = require(path.join(eventsPath, file));
            console.log(c.arrow + c.verdebold(`[SUCCESS] Event loaded: ${event.name}`));

            if (event.once) {
                client.once(event.name, (...args) => event.execute(...args));
            } else {
                client.on(event.name, (...args) => event.execute(...args));
            }
        }

        // 4. LOGIN POR ÚLTIMO
        await client.login(process.env.DISCORD_BOT_TOKEN);
        console.log(c.arrow + c.verdebold('[SUCCESS] Bot logged in successfully'));

    } catch (err) {
        console.error('[BOOT ERROR]', err);
        process.exit(1);
    }
}

bootstrap();

module.exports = { client };
