const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
} = require('discord.js');
const axios = require('axios');
const gems = require('../../assets/rarityGem');

// ─── Configuração ────────────────────────────────────────────────────────────

const COLLECTOR_TIME_MS = 3 * 60 * 1000; // 3 minutos
const REQUEST_TIMEOUT_MS = 10_000;

const CHEST_INFO = {
    hextechChests: {
        customId: 'openchest_hextech',
        label: 'Baú Hextech',
        emoji: '📦',
        description: 'Qualquer raridade possível',
    },
    masterWorkChests: {
        customId: 'openchest_masterwork',
        label: 'Baú do Mestre Artesão',
        emoji: '🏆',
        description: 'Garante raridade épica ou superior',
    },
};

// Chaves correspondem ao campo `rarity` retornado por /expapi/internal/rollskin
// (categoria do sorteio: legacy, epic, legendary, ultimate, transcendent, mythic).
const RARITY_INFO = {
    legacy:       { label: 'Legado',        color: 0xB45309 },
    epic:         { label: 'Épica',         color: 0xA855F7 },
    legendary:    { label: 'Lendária',      color: 0xF97316 },
    ultimate:     { label: 'Ultimate',      color: 0x06B6D4 },
    mythic:       { label: 'Mítica',        color: 0xF43F5E },
    transcendent: { label: 'Transcendente', color: 0xE879F9 },
};
const DEFAULT_RARITY_INFO = { label: 'Desconhecida', color: 0x6B7280 };

const CHEST_THUMBNAIL =
    'https://conteudo.imguol.com.br/c/entretenimento/f7/2022/01/21/cblol-2022-drop-bau-lol-league-of-legends-1642796580165_v2_1x1.png';

// ─── Helpers de API ──────────────────────────────────────────────────────────

const apiClient = axios.create({
    baseURL: process.env.API_BASE_URL,
    timeout: REQUEST_TIMEOUT_MS,
});

async function fetchUserInventory(userId) {
    const { data } = await apiClient.post('/expapi/internal/fetchinventory', { userId });
    return {
        keys: data.keys ?? 0,
        hextechChests: data.hextechChests ?? 0,
        masterWorkChests: data.masterWorkChests ?? 0,
    };
}

async function rollSkin(userId, chestType) {
    const { data } = await apiClient.post(
        '/expapi/internal/rollskin',
        { userId, chestType },
        { headers: { 'internal-key': process.env.INTERNAL_API_KEY } },
    );
    return data;
}

/**
 * Traduz erros de axios/API em mensagens compreensíveis para o usuário,
 * em vez de sempre mostrar um genérico "tente novamente mais tarde".
 */
function describeApiError(error, fallback) {
    const status = error?.response?.status;
    const apiMessage = typeof error?.response?.data === 'string'
        ? error.response.data
        : error?.response?.data?.error;

    if (status === 400) {
        return apiMessage || 'Você não possui chaves ou baús suficientes para isso.';
    }
    if (status === 401) {
        return 'Erro de autenticação interna da API. Avise um administrador.';
    }
    if (error?.code === 'ECONNABORTED') {
        return 'A API demorou demais para responder. Tente novamente em alguns instantes.';
    }
    return fallback;
}

// ─── Helpers de UI ───────────────────────────────────────────────────────────

function buildInventoryEmbed(interaction, inventory) {
    return new EmbedBuilder()
        .setTitle('🎁 Inventário de Baús')
        .setColor('Gold')
        .setAuthor({
            name: interaction.user.username,
            iconURL: interaction.user.displayAvatarURL(),
        })
        .addFields(
            { name: '🔑 Chaves', value: `${inventory.keys}`, inline: true },
            { name: '📦 Baús Hextech', value: `${inventory.hextechChests}`, inline: true },
            { name: '🏆 Baús do Mestre Artesão', value: `${inventory.masterWorkChests}`, inline: true },
        )
        .setThumbnail(CHEST_THUMBNAIL)
        .setFooter({ text: hasAnyChestToOpen(inventory)
            ? 'Escolha um baú abaixo para abrir.'
            : 'Você precisa de chaves e baús para abrir. Use /daily para resgatar sua recompensa diária!' })
        .setTimestamp();
}

function hasAnyChestToOpen(inventory) {
    return inventory.keys > 0 && (inventory.hextechChests > 0 || inventory.masterWorkChests > 0);
}

function canOpen(inventory, chestType) {
    return inventory.keys > 0 && inventory[chestType] > 0;
}

/**
 * @param {object} inventory
 * @param {boolean} forceDisabled Desabilita os dois botões independente do inventário (ex: enquanto um roll está em andamento).
 */
function buildChestButtons(inventory, forceDisabled = false) {
    const row = new ActionRowBuilder();
    for (const [chestType, info] of Object.entries(CHEST_INFO)) {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(info.customId)
                .setLabel(`Abrir ${info.label}`)
                .setEmoji(info.emoji)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(forceDisabled || !canOpen(inventory, chestType)),
        );
    }
    return row;
}

function buildResultEmbed(interaction, skin, chestType, inventoryAfter) {
    const rarity = RARITY_INFO[skin.rarity] || DEFAULT_RARITY_INFO;
    const skinNumber = skin.skinId?.toString().slice(-3).replace(/^0+/, '') || '0';
    const splashUrl = `https://ddragon.leagueoflegends.com/cdn/img/champion/centered/${encodeURIComponent(skin.championId)}_${skinNumber}.jpg`;

    return new EmbedBuilder()
        .setTitle(`${CHEST_INFO[chestType].emoji} Baú aberto!`)
        .setColor(rarity.color)
        .setAuthor({
            name: interaction.user.username,
            iconURL: interaction.user.displayAvatarURL(),
        })
        .setDescription(`Você recebeu **${skin.skinName}**!`)
        .addFields(
            { name: 'Campeão', value: skin.championName, inline: true },
            { name: 'Raridade', value: rarity.label, inline: true },
            { name: 'Restante', value: `🔑 ${inventoryAfter.keys} · 📦 ${inventoryAfter.hextechChests} · 🏆 ${inventoryAfter.masterWorkChests}`, inline: true },
        )
        .setImage(splashUrl)
        .setThumbnail(gems[skin.rarity] || gems.default || null)
        .setTimestamp();
}

function buildLoadingEmbed(interaction, chestType) {
    return new EmbedBuilder()
        .setTitle(`${CHEST_INFO[chestType].emoji} Abrindo ${CHEST_INFO[chestType].label}...`)
        .setColor('Grey')
        .setDescription('Sorteando sua skin, aguarde um instante.');
}

function buildErrorEmbed(message) {
    return new EmbedBuilder()
        .setTitle('❌ Algo deu errado')
        .setColor('Red')
        .setDescription(message);
}

// ─── Comando ──────────────────────────────────────────────────────────────────

module.exports = {
    permission: 'default',
    category: 'chests',
    data: new SlashCommandBuilder()
        .setName('openchest')
        .setDescription('Abra um baú e tente sua sorte por uma nova skin.'),

    async execute(interaction) {
        await interaction.deferReply();

        let inventory;
        try {
            inventory = await fetchUserInventory(interaction.user.id);
        } catch (error) {
            console.error('[openchest] Erro ao buscar inventário do usuário:', error);
            return interaction.editReply({
                embeds: [buildErrorEmbed(describeApiError(error, 'Não foi possível buscar seu inventário. Tente novamente mais tarde.'))],
            });
        }

        const reply = await interaction.editReply({
            embeds: [buildInventoryEmbed(interaction, inventory)],
            components: [buildChestButtons(inventory)],
        });

        // Coletor preso a esta mensagem específica — evita que cliques em
        // outro /openchest aberto no mesmo canal (mesmos customId) acabem
        // sendo capturados pelo coletor errado.
        const collector = reply.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: COLLECTOR_TIME_MS,
        });

        let chestsRemaining = true;

        collector.on('collect', async (buttonInteraction) => {
            if (buttonInteraction.user.id !== interaction.user.id) {
                return buttonInteraction.reply({
                    content: 'Você não pode interagir com o baú de outra pessoa.',
                    ephemeral: true,
                });
            }

            const chestType = buttonInteraction.customId === CHEST_INFO.hextechChests.customId
                ? 'hextechChests'
                : 'masterWorkChests';

            await buttonInteraction.deferUpdate();

            // Trava os dois botões enquanto o roll está em andamento, evitando
            // cliques duplicados/duas requisições simultâneas pro mesmo usuário.
            await buttonInteraction.editReply({
                embeds: [buildLoadingEmbed(interaction, chestType)],
                components: [buildChestButtons(inventory, true)],
            });

            try {
                const skin = await rollSkin(interaction.user.id, chestType);

                inventory = {
                    ...inventory,
                    keys: inventory.keys - 1,
                    [chestType]: inventory[chestType] - 1,
                };

                chestsRemaining = hasAnyChestToOpen(inventory);

                await buttonInteraction.editReply({
                    embeds: [buildResultEmbed(interaction, skin, chestType, inventory)],
                    components: [buildChestButtons(inventory)],
                });

                if (!chestsRemaining) {
                    collector.stop('no_chests_left');
                }
            } catch (error) {
                console.error('[openchest] Erro ao abrir o baú:', error);

                // Re-sincroniza com a API em caso de erro, pra não deixar os
                // botões com um estado que não reflete mais a realidade.
                try {
                    inventory = await fetchUserInventory(interaction.user.id);
                } catch {
                    // Mantém o inventário local conhecido se a re-sincronização falhar.
                }

                await buttonInteraction.editReply({
                    embeds: [buildErrorEmbed(describeApiError(error, 'Erro ao abrir o baú. Tente novamente mais tarde.'))],
                    components: [buildChestButtons(inventory)],
                });
            }
        });

        collector.on('end', async (collected, reason) => {
            if (reason === 'no_chests_left') return; // já tratado acima

            try {
                if (collected.size === 0) {
                    await interaction.editReply({
                        embeds: [buildInventoryEmbed(interaction, inventory).setFooter({ text: 'Tempo esgotado — use /openchest novamente quando quiser.' })],
                        components: [buildChestButtons(inventory, true)],
                    });
                } else {
                    // Apenas desabilita os botões da última mensagem, mantendo o embed do último resultado.
                    await interaction.editReply({ components: [buildChestButtons(inventory, true)] });
                }
            } catch (error) {
                console.error('[openchest] Erro ao finalizar coletor:', error);
            }
        });
    },
};
