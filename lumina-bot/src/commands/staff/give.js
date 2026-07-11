const axios = require('axios');
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const i18n = require('../../utils/i18n/index.js');
const { loc, PT, ES } = require('../../utils/i18n/commandLocales.js');

module.exports = {
    permission: 'admin',
    category: 'staff',
    cooldown: 15,
    data: new SlashCommandBuilder()
        .setName('give')
        .setDescription('Give a user an item.')
        .setDescriptionLocalizations(loc('Dá um item a um usuário.', 'Da un item a un usuario.'))
        .addUserOption(option => option
            .setName('user')
            .setDescription('The user to give the item.')
            .setDescriptionLocalizations(loc('O usuário para dar o item.', 'El usuario para dar el item.'))
            .setRequired(true))
        .addStringOption(option => option
            .setName('item')
            .setDescription('The item to give.')
            .setDescriptionLocalizations(loc('O item para dar.', 'El item para dar.'))
            .setRequired(true)
            .addChoices(
                { name: 'Hextech Chest',       name_localizations: loc('Baú Hextech', 'Cofre Hextech'),       value: 'hextechChest' },
                { name: 'Masterwork Chest',    name_localizations: loc('Baú do Mestre Artesão', 'Cofre de Maestro Artesano'), value: 'masterWorkChest' },
                { name: 'Key',                  name_localizations: loc('Chave', 'Llave'),                       value: 'key' },
            ))
        .addIntegerOption(option => option
            .setName('amount')
            .setDescription('The amount of the item to give.')
            .setDescriptionLocalizations(loc('A quantidade do item para dar.', 'La cantidad del item para dar.'))
            .setRequired(true)
            .setMinValue(1)
                    .setMaxValue(100)),

    async execute(interaction, t) {
        const translator = t || i18n.getTranslator(i18n.resolveFromInteraction(interaction));

        if (interaction.options.getInteger('amount') < 1) {
            return interaction.reply({ content: translator('cmd.give.invalidItem'), ephemeral: true });
        }

        const user = interaction.options.getUser('user').id;
        const item = interaction.options.getString('item');
        const amount = interaction.options.getInteger('amount');

        // Mapeia o valor interno do choice para a chave de tradução
        const itemKeyMap = {
            hextechChest: 'cmd.give.items.hextech',
            masterWorkChest: 'cmd.give.items.masterwork',
            key: 'cmd.give.items.key',
        };
        const itemLabel = itemKeyMap[item] ? translator(itemKeyMap[item]) : item;

        const success = await addToInventory(user, item, amount);
        if (success) {
            const embed = new EmbedBuilder()
                .setTitle(translator('cmd.give.title'))
                .setDescription(translator('cmd.give.description', { amount, item: itemLabel, user: `<@${user}>` }))
                .setColor('Green');
            return interaction.reply({ embeds: [embed], ephemeral: true });
        } else {
            return interaction.reply({ content: translator('common.commandError'), ephemeral: true });
        }

        async function addToInventory(user, item, quantity) {
            try {
                const response = await axios.post(process.env.API_BASE_URL + '/expapi/internal/addinventory',
                    {
                        userId: user,
                        item: item,
                        amount: quantity,
                    },
                    {
                        headers: {
                            'internal-key': process.env.INTERNAL_API_KEY,
                        },
                    }
                );
                return true;
            } catch (err) {
                console.error('Erro ao adicionar item ao inventário:', err);
                return false;
            }
        }
    },
};
