require('@dotenvx/dotenvx').config();
const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const c = require('./src/utils/colorCodes.js');
const LuminaApiService = require('./src/utils/services/LuminaApiService.js');
const EncryptionService = require('./src/utils/services/EncryptionService.js');

const luminaApi = new LuminaApiService();
let deployGuilds = [];

if (!process.env.DISCORD_BOT_TOKEN) {
    console.error(c.error + " DISCORD_BOT_TOKEN is not defined in the environment variables. Please set it up in the .env file.");
    process.exit(1); // Exit the process if the token is not defined
}

if (!process.env.DISCORD_CLIENT_ID) {
    console.error(c.error + " DISCORD_CLIENT_ID is not defined in the environment variables. Please set it up in the .env file.");
    process.exit(1); // Exit the process if the client ID is not defined
}

if (!process.env.API_BASE_URL || !process.env.INTERNAL_API_KEY || !process.env.LUMINA_API_kEY) {
    console.error(c.error + " One or more API environment variables are not defined. Please set them up in the .env file.");
    process.exit(1);
}

try {
    luminaApi.get('/expapi/internal/fetchbot').then(botConfig => {
        console.log(c.arrow + c.verdebold(`[SUCCESS] Bot configuration fetched successfully.`));
        const encryptionService = new EncryptionService(luminaApi);
        //Decrypt the bot configuration
        const decryptedBotConfig = JSON.parse(encryptionService.decrypt(botConfig));
        console.log(c.arrow + c.verdebold(`[SUCCESS] Bot configuration decrypted successfully.`));
        deployGuilds = decryptedBotConfig.deployGuilds || [];
    }).catch(error => {
        console.error(c.error + " " + error);
        process.exit(1); // Exit the process if the bot configuration cannot be fetched
    });
} catch (error) {
    console.error(c.error + " " + error);
    console.error(c.error + " Failed to fetch bot configuration. Ensure the API is running and the bot is configured correctly.");
    process.exit(1); // Exit the process if there's an error during the API call
}


const globalCommands = [];
const localCommands = [];
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
            if (folder === 'admin') {
                localCommands.push(command.data.toJSON());
                console.log(c.arrow + c.alerta(`[WARNING] The command ${command.data.name} is admin only.`));
                console.log(c.arrow + c.verdebold(`[SUCCESS] The command ${command.data.name} was added to the LOCAL commands.`));
            } else {
                globalCommands.push(command.data.toJSON());
                console.log(c.arrow + c.verdebold(`[SUCCESS] The command ${command.data.name} was added to the GLOBAL commands.`));
            }
        } else {
            console.log(c.arrow + c.alerta(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`));
        }
    }
}

const rest = new REST().setToken(process.env.DISCORD_BOT_TOKEN);

(async () => {
    try {
        console.log(c.arrow + c.verde('Started refreshing application (/) commands.'));

        if (process.env.ENV != 'production') {

            for (const guildId of deployGuilds) {
                await rest.put(
                    Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, guildId),
                    { body: [...localCommands, ...globalCommands] },
                );
                console.log(c.arrow + c.verde(`Successfully reloaded application (/) commands for guild ${guildId}.`));
            }
        } else {
            // Deploy new global commands without removing existing ones
            await rest.put(
                Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
                { body: globalCommands },
            );
            console.log(c.arrow + c.verde('Successfully reloaded global application (/) commands.'));
        }

        console.log(c.arrow + c.verde('Successfully reloaded application (/) commands.'));
    } catch (error) {
        console.error(c.error + " " + error);
    }
})();