const { Events, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const i18n  = require('../utils/i18n/index.js');

module.exports = {
    name: Events.MessageCreate,
    once: false,
    async execute(message) {
        if (message.author.bot) return;

        // Resolve locale do servidor para traduzir as mensagens de drop.
        // message.guild.preferredLocale é o idioma configurado pelo Discord
        // para o servidor — fallback en-US se não disponível (ex: DM).
        const locale = i18n.normalizeLocale(message.guild?.preferredLocale);
        const t = i18n.getTranslator(locale);

        const random = Math.random();

        if (random <= 0.0015) {
            // 0.15% — Masterwork Chest
            const success = await addToInventory('masterWorkChests', 1);
            if (!success) return console.error('Erro ao adicionar baú do mestre artesão ao inventário de ', message.author.id);

            const embed = new EmbedBuilder()
                .setTitle(t('event.dropChest', { username: message.author.username }))
                .setDescription(t('event.dropChestFooter'))
                .setThumbnail('https://www.unrankedsmurfs.com/storage/YYs4U0GEgTMgfEE5WsNHzIJBsgXFKVQ4bs9Za2RL.png')
                .setColor('Yellow');

            message.reply({ embeds: [embed] });

        } else if (random <= 0.02) {
            // 2% — Hextech Chest
            const success = await addToInventory('hextechChests', 1);
            if (!success) return console.error('Erro ao adicionar baú Hextec ao inventário de ', message.author.id);

            const embed = new EmbedBuilder()
                .setTitle(t('event.dropChest', { username: message.author.username }))
                .setDescription(t('event.dropChestFooter'))
                .setThumbnail('https://static.wikia.nocookie.net/leagueoflegends/images/6/60/Hextech_Crafting_Chest.png/revision/latest/scale-to-width-down/250?cb=20191203123712')
                .setColor('Yellow');

            message.reply({ embeds: [embed] });

        } else if (random <= 0.05) {
            // 5% — Hextech Key
            const success = await addToInventory('keys', 1);
            if (!success) return console.error('Erro ao adicionar chave Hextec ao inventário de ', message.author.id);

            const embed = new EmbedBuilder()
                .setTitle(t('event.dropKey', { username: message.author.username }))
                .setDescription(t('event.dropKeyFooter'))
                .setThumbnail('https://static.wikia.nocookie.net/leagueoflegends/images/3/3e/Hextech_Crafting_Key.png/revision/latest/scale-to-width-down/250?cb=20191203123712')
                .setColor('Yellow');

            message.reply({ embeds: [embed] });
        }

        async function addToInventory(item, quantity) {
            try {
                const response = await axios.post(process.env.API_BASE_URL + '/expapi/internal/addinventory',
                    {
                        userId: message.author.id,
                        item,
                        amount: quantity
                    },
                    {
                        headers: {
                            'internal-key': process.env.INTERNAL_API_KEY,
                        }
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
