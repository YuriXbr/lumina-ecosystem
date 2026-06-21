const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');
const gems = require('../../assets/rarityGem');


module.exports = {
    permission: 'default',
    category: 'chests',
    data: new SlashCommandBuilder()
        .setName('openchest')
        .setDescription('Open a chest.'),
    async execute(interaction) {
        await interaction.deferReply();
        try {

            let userInventory;
            try {
                userInventory = await axios.post(process.env.API_BASE_URL + '/expapi/internal/fetchinventory', {
                    userId: interaction.user.id
                },
                { headers: { 'Content-Type': 'application/json' }}
            );
            userInventory = userInventory.data;
            } catch (error) {
                console.error('Erro ao buscar inventário do usuário:', error);
                return interaction.editReply({ content: 'Erro ao buscar inventário do usuário. Tente novamente mais tarde.', ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setTitle('**[ALPHA]** Inventory')
                .setDescription(`Hextech Chests: ${userInventory.hextechChests}\nMasterwork Chests: ${userInventory.masterWorkChests}\nKeys: ${userInventory.keys}`)
                .setColor('Yellow')
                .setThumbnail('https://conteudo.imguol.com.br/c/entretenimento/f7/2022/01/21/cblol-2022-drop-bau-lol-league-of-legends-1642796580165_v2_1x1.png')
                .setFooter({ text: 'O comando está em teste' });

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('openchest_hextech')
                        .setLabel('Open Hextech Chest')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(userInventory.hextechChests < 1 || userInventory.keys < 1),
                    new ButtonBuilder()
                        .setCustomId('openchest_masterwork')
                        .setLabel('Open Masterwork Chest')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(userInventory.masterWorkChests < 1 || userInventory.keys < 1)
                );

            await interaction.editReply({ embeds: [embed], components: [row] });

            const filter = i => i.customId === 'openchest_hextech' || i.customId === 'openchest_masterwork';
            const collector = interaction.channel.createMessageComponentCollector({ filter, time: 180000 });

            collector.on('collect', async i => {
                try{
                if (i.user.id !== interaction.user.id) {
                    return i.reply({ content: 'Você não pode interagir com este botão.', ephemeral: true });
                }

                await i.deferUpdate();

                const chestType = i.customId === 'openchest_hextech' ? 'hextechChests' : 'masterWorkChests';

                const response = await axios.post(process.env.API_BASE_URL + '/expapi/internal/rollskin',
                    {
                        userId: interaction.user.id,
                        chestType: chestType
                    },
                    { headers: 
                        { 
                            'internal-key': "lumyYpomO1f3sk2fmOtlgMOLXTOujHQX5iLvEXE0tYrjctjpDIVfODiSOHiHSdncR9Iba1NrariICEpVByLHwoayA51FPNOsxAGuINvhS6v19zCnoB3Th4ze8hJzu8FO-i"
                        } 
                    }
                )
                const selectedSkin = response.data;

                const rarityGemImg = gems[selectedSkin.rarity];
                const skinId = selectedSkin.skinId.toString().slice(-3).replace(/^0+/, '');

                const newEmbed = new EmbedBuilder()
                    .setTitle('**[ALPHA]** You opened a chest!')
                    .setDescription(`You received: ${selectedSkin.championName} - ${selectedSkin.skinName}`)
                    .setColor('Green')
                    .setImage('https://ddragon.leagueoflegends.com/cdn/img/champion/centered/' + selectedSkin.championName + '_' + skinId + '.jpg')
                    .setThumbnail(rarityGemImg)
                    .setFooter({ text: 'O comando está em teste.'});

                // Update user inventory locally
                if (chestType === 'hextechChests') {
                    userInventory.hextechChests -= 1;
                } else {
                    userInventory.masterWorkChests -= 1;
                }
                userInventory.keys -= 1;

                // Check if user still has chests and keys
                const hasHextechChest = userInventory.hextechChests > 0 && userInventory.keys > 0;
                const hasMasterworkChest = userInventory.masterWorkChests > 0 && userInventory.keys > 0;

                if (!hasHextechChest && !hasMasterworkChest) {
                    newEmbed.setFooter({ text: 'Você não possui mais baús ou chaves.' });
                } else if (!hasHextechChest) {
                    newEmbed.setFooter({ text: 'Você não possui mais Hextech Chests.' });
                } else if (!hasMasterworkChest) {
                    newEmbed.setFooter({ text: 'Você não possui mais Masterwork Chests.' });
                }

                const newRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('openchest_hextech')
                            .setLabel('Open Hextech Chest')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(!hasHextechChest),
                        new ButtonBuilder()
                            .setCustomId('openchest_masterwork')
                            .setLabel('Open Masterwork Chest')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(!hasMasterworkChest)
                    );

                await i.editReply({ embeds: [newEmbed], components: [newRow] });

                if (!hasHextechChest && !hasMasterworkChest) {
                    collector.stop();
                }
            } catch (error) {
                console.error('Erro ao abrir o baú:', error);
                return i.editReply({ content: 'Erro ao abrir o baú. Tente novamente mais tarde.', ephemeral: true });
            }
            });

            collector.on('end', collected => {
                if (collected.size === 0) {
                    interaction.editReply({ content: 'No chests were opened.', components: [] });
                }
            });
        } catch (err) {
            console.error(err);
        }
    }
};