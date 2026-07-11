require('@dotenvx/dotenvx').config();
const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const c = require('./src/utils/colorCodes.js');
const LuminaApiService = require('./src/utils/services/LuminaApiService.js');
const EncryptionService = require('./src/utils/services/EncryptionService.js');
const botConfigService = require('./src/utils/services/EncryptionService');

const luminaApi = new LuminaApiService();
let deployGuilds = [];

process.on('unhandledRejection', (reason) => {
    console.error('[UNHANDLED REJECTION]', reason);
});

process.on('uncaughtException', (err) => {
    console.error('[UNCAUGHT EXCEPTION]', err);
});

if (!process.env.DISCORD_BOT_TOKEN) {
    console.error(c.error + " DISCORD_BOT_TOKEN is not defined in the environment variables. Please set it up in the .env file.");
    process.exit(1); // Exit the process if the token is not defined
}

if (!process.env.DISCORD_CLIENT_ID) {
    console.error(c.error + " DISCORD_CLIENT_ID is not defined in the environment variables. Please set it up in the .env file.");
    process.exit(1); // Exit the process if the client ID is not defined
}

if (!process.env.API_BASE_URL || !process.env.INTERNAL_API_KEY || !process.env.LUMINA_API_KEY) {
    console.error(c.error + " One or more API environment variables are not defined. Please set them up in the .env file.");
    process.exit(1);
}

async function bootstrap() {
    try {
        await botConfigService.setupConfig();
        console.log(c.arrow + c.verdebold('[SUCCESS] Bot configuration loaded successfully'));
    } catch (err) {
        console.error(c.error + " Failed to load bot configuration. Ensure the .env file is set up correctly and the API is accessible.");
        console.error(c.error + " Error details: ", err);
        process.exit(1);
    }
}


async function fetchBotConfig() {
    try {
        mainGuild = botConfigService.bot.mainGuild;
        deployGuilds = botConfigService.bot.deployGuilds || [];
        console.log(c.arrow + c.verdebold('[SUCCESS] MainGuild: ' + mainGuild));
        console.log(c.arrow + c.verdebold('[SUCCESS] DeployGuilds: ' + deployGuilds.join(', ')));
        console.log(c.arrow + c.verdebold('[SUCCESS] Bot configuration fetched successfully'));
        return;
    } catch (error) {
        console.error(c.error + " Failed to fetch bot configuration. Ensure the API is running and the bot is configured correctly.");
        console.error(c.error + " " + error);
        process.exit(1); // Exit the process if there's an error during the API call
    }
}

let globalCommands = [];
let localCommands = [];

async function deployCommands() {

    const foldersPath = path.join(__dirname, 'src', 'commands');
    const commandFolders = fs.readdirSync(foldersPath);

    console.log(c.arrow + c.alerta('[WARNING] Local commands are only available in deployGuilds. Be sure to add the guilds in the config file.'));
    console.log(c.arrow + c.verde('Started refreshing application (/) commands.'));

    for (const folder of commandFolders) {
        const commandsPath = path.join(foldersPath, folder);
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            const command = require(filePath);
            if ('data' in command && 'execute' in command) {
                const cmdJson = command.data.toJSON();

                // Comandos que funcionam em DM (GUILD=0, BOT_DM=1, PRIVATE_CHANNEL=2)
                const DM_CATEGORIES = ['social', 'chests', 'league'];
                if (DM_CATEGORIES.includes(command.category)) {
                    cmdJson.contexts = [0, 1, 2];
                    cmdJson.integration_types = [0, 1];
                }

                if (folder === 'admin') {
                    localCommands.push(cmdJson);
                    console.log(c.arrow + c.alerta(`[WARNING] The command ${command.data.name} is admin only.`));
                    console.log(c.arrow + c.verdebold(`[SUCCESS] The command ${command.data.name} was added to the LOCAL commands.`));
                } else {
                    globalCommands.push(cmdJson);
                    const dmInfo = cmdJson.contexts ? ' [DM+Guild]' : '';
                    console.log(c.arrow + c.verdebold(`[SUCCESS] The command ${command.data.name} was added to the GLOBAL commands.${dmInfo}`));
                }
            } else {
                console.log(c.arrow + c.alerta(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`));
            }
        }
    }

}

const rest = new REST().setToken(process.env.DISCORD_BOT_TOKEN);
(async () => {
    try{
        await bootstrap();
        await fetchBotConfig();
        await deployCommands();
    } catch (error) {
        console.error(c.error + " An error occurred during the initialization process. Please check the configuration and try again.");
        console.error(c.error + " " + error);
        process.exit(1); // Exit the process if there's an error during bootstrap
    }

    try {
        console.log(c.arrow + c.verde('Started refreshing application (/) commands.'));

        if (process.env.NODE_ENV !== 'production') {

            // Em desenvolvimento: registra comandos de DM como GLOBAIS (necessário
            // para aparecerem em DMs) e o resto como GUILD (propagação instantânea).
            const dmCommands = globalCommands.filter(c => c.contexts);
            const nonDmCommands = globalCommands.filter(c => !c.contexts);

            if (dmCommands.length > 0) {
                await rest.put(
                    Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
                    { body: dmCommands },
                );
                console.log(c.arrow + c.verde(`Successfully deployed ${dmCommands.length} GLOBAL (DM) commands.`));
            }

            for (const guildId of deployGuilds) {
                await rest.put(
                    Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, guildId),
                    { body: [...localCommands, ...nonDmCommands] },
                );
                console.log(c.arrow + c.verde(`Successfully reloaded application (/) commands for guild ${guildId}.`));
            }
        } else {
            // Produção: todos os comandos como globais
            await rest.put(
                Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
                { body: globalCommands },
            );
            console.log(c.arrow + c.verde('Successfully reloaded global application (/) commands.'));
        }

        console.log(c.arrow + c.verde('Successfully reloaded application (/) commands.'));
    } catch (error) {
        console.error(c.error + " An error occurred while reloading application (/) commands.");
        console.error(c.error + " " + error);
        process.exit(1); // Exit the process if there's an error during command deployment
    }
})();