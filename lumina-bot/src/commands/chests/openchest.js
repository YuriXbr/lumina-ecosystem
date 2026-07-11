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
const i18n = require('../../utils/i18n/index.js');
const { loc } = require('../../utils/i18n/commandLocales.js');

// ─── Configuração ────────────────────────────────────────────────────────────

const COLLECTOR_TIME_MS = 3 * 60 * 1000; // 3 minutos
const REQUEST_TIMEOUT_MS = 10_000;

// Metadata traduzida via i18n (os labels/descrições são resolvidos em runtime
// dentro das funções de build, que recebem o translator `t`).
const CHEST_INFO = {
    hextechChests: {
        customId: 'openchest_hextech',
        labelKey: 'cmd.openchest.chestInfo.hextech.label',
        descKey:  'cmd.openchest.chestInfo.hextech.description',
        emoji: '📦',
        fieldKey: 'cmd.openchest.hextechField',
    },
    masterWorkChests: {
        customId: 'openchest_masterwork',
        labelKey: 'cmd.openchest.chestInfo.masterwork.label',
        descKey:  'cmd.openchest.chestInfo.masterwork.description',
        emoji: '🏆',
        fieldKey: 'cmd.openchest.masterworkField',
    },
};

// Cores por raridade (não traduzidas — são valores hex)
const RARITY_COLORS = {
    legacy:       0xB45309,
    epic:         0xA855F7,
    legendary:    0xF97316,
    ultimate:     0x06B6D4,
    mythic:       0xF43F5E,
    transcendent: 0xE879F9,
};
const DEFAULT_RARITY_COLOR = 0x6B7280;

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
 * Traduz erros de axios/API em mensagens compreensíveis para o usuário.
 */
function describeApiError(error, t, fallback) {
    const status = error?.response?.status;
    const apiMessage = typeof error?.response?.data === 'string'
        ? error.response.data
        : error?.response?.data?.error;

    if (status === 400) {
        return apiMessage || t('common.insufficientResources');
    }
    if (status === 401) {
        return t('common.apiAuthError');
    }
    if (error?.code === 'ECONNABORTED') {
        return t('common.apiTimeout');
    }
    return fallback;
}

// ─── Helpers de UI ───────────────────────────────────────────────────────────

function buildInventoryEmbed(interaction, inventory, t) {
    return new EmbedBuilder()
        .setTitle(t('cmd.openchest.inventoryTitle'))
        .setColor('Gold')
        .setAuthor({
            name: interaction.user.username,
            iconURL: interaction.user.displayAvatarURL(),
        })
        .addFields(
            { name: t('cmd.openchest.keysField'),         value: `${inventory.keys}`, inline: true },
            { name: t('cmd.openchest.hextechField'),      value: `${inventory.hextechChests}`, inline: true },
            { name: t('cmd.openchest.masterworkField'),   value: `${inventory.masterWorkChests}`, inline: true },
        )
        .setThumbnail(CHEST_THUMBNAIL)
        .setFooter({ text: hasAnyChestToOpen(inventory)
            ? t('cmd.openchest.footerCanOpen')
            : t('cmd.openchest.footerCannotOpen') })
        .setTimestamp();
}

function hasAnyChestToOpen(inventory) {
    return inventory.keys > 0 && (inventory.hextechChests > 0 || inventory.masterWorkChests > 0);
}

function canOpen(inventory, chestType) {
    return inventory.keys > 0 && inventory[chestType] > 0;
}

function buildChestButtons(inventory, t, forceDisabled = false) {
    const row = new ActionRowBuilder();
    for (const [chestType, info] of Object.entries(CHEST_INFO)) {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(info.customId)
                .setLabel(t(info.labelKey))
                .setEmoji(info.emoji)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(forceDisabled || !canOpen(inventory, chestType)),
        );
    }
    return row;
}

function buildResultEmbed(interaction, skin, chestType, inventoryAfter, t) {
    const rarityColor = RARITY_COLORS[skin.rarity] || DEFAULT_RARITY_COLOR;
    const rarityLabel = t(`cmd.openchest.rarity.${skin.rarity}`) || skin.rarity;
    const skinNumber = skin.skinId?.toString().slice(-3).replace(/^0+/, '') || '0';
    const splashUrl = `https://ddragon.leagueoflegends.com/cdn/img/champion/centered/${encodeURIComponent(skin.championId)}_${skinNumber}.jpg`;

    return new EmbedBuilder()
        .setTitle(`${CHEST_INFO[chestType].emoji} ${t('cmd.openchest.resultTitle')}`)
        .setColor(rarityColor)
        .setAuthor({
            name: interaction.user.username,
            iconURL: interaction.user.displayAvatarURL(),
        })
        .setDescription(`${t('cmd.openchest.resultDesc')} **${skin.skinName}**!`)
        .addFields(
            { name: t('cmd.openchest.championField'),  value: skin.championName, inline: true },
            { name: t('cmd.openchest.rarityField'),    value: rarityLabel, inline: true },
            { name: t('cmd.openchest.remainingField'), value: `🔑 ${inventoryAfter.keys} · 📦 ${inventoryAfter.hextechChests} · 🏆 ${inventoryAfter.masterWorkChests}`, inline: true },
        )
        .setImage(splashUrl)
        .setThumbnail(gems[skin.rarity] || gems.default || null)
        .setTimestamp();
}

function buildLoadingEmbed(interaction, chestType, t) {
    return new EmbedBuilder()
        .setTitle(`${CHEST_INFO[chestType].emoji} ${t('cmd.openchest.loadingTitle')}`)
        .setColor('Grey')
        .setDescription(t('cmd.openchest.loadingDesc'));
}

function buildErrorEmbed(message, t) {
    return new EmbedBuilder()
        .setTitle(t('cmd.openchest.somethingWrong'))
        .setColor('Red')
        .setDescription(message);
}

// ─── Comando ──────────────────────────────────────────────────────────────────

module.exports = {
    permission: 'default',
    category: 'chests',
    data: new SlashCommandBuilder()
        .setName('openchest')
        .setDescription('Open a chest and try your luck for a new skin.')
        .setDescriptionLocalizations(loc(
            'Abra um baú e tente sua sorte por uma nova skin.',
            'Abre un cofre y prueba tu suerte por una nueva skin.'
        )),

    async execute(interaction, t) {
        const translator = t || i18n.getTranslator(i18n.resolveFromInteraction(interaction));
        await interaction.deferReply();

        let inventory;
        try {
            inventory = await fetchUserInventory(interaction.user.id);
        } catch (error) {
            console.error('[openchest] Erro ao buscar inventário do usuário:', error);
            return interaction.editReply({
                embeds: [buildErrorEmbed(describeApiError(error, translator, translator('cmd.openchest.somethingWrong')), translator)],
            });
        }

        const reply = await interaction.editReply({
            embeds: [buildInventoryEmbed(interaction, inventory, translator)],
            components: [buildChestButtons(inventory, translator)],
        });

        const collector = reply.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: COLLECTOR_TIME_MS,
        });

        let chestsRemaining = true;

        collector.on('collect', async (buttonInteraction) => {
            if (buttonInteraction.user.id !== interaction.user.id) {
                return buttonInteraction.reply({
                    content: translator('cmd.openchest.notYourChest'),
                    ephemeral: true,
                });
            }

            const chestType = buttonInteraction.customId === CHEST_INFO.hextechChests.customId
                ? 'hextechChests'
                : 'masterWorkChests';

            await buttonInteraction.deferUpdate();

            await buttonInteraction.editReply({
                embeds: [buildLoadingEmbed(interaction, chestType, translator)],
                components: [buildChestButtons(inventory, translator, true)],
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
                    embeds: [buildResultEmbed(interaction, skin, chestType, inventory, translator)],
                    components: [buildChestButtons(inventory, translator)],
                });

                if (!chestsRemaining) {
                    collector.stop('no_chests_left');
                }
            } catch (error) {
                console.error('[openchest] Erro ao abrir o baú:', error);

                try {
                    inventory = await fetchUserInventory(interaction.user.id);
                } catch {
                    // Mantém o inventário local conhecido se a re-sincronização falhar.
                }

                await buttonInteraction.editReply({
                    embeds: [buildErrorEmbed(describeApiError(error, translator, translator('cmd.openchest.somethingWrong')), translator)],
                    components: [buildChestButtons(inventory, translator)],
                });
            }
        });

        collector.on('end', async (collected, reason) => {
            if (reason === 'no_chests_left') return;

            try {
                if (collected.size === 0) {
                    await interaction.editReply({
                        embeds: [buildInventoryEmbed(interaction, inventory, translator).setFooter({ text: translator('cmd.openchest.timedOut') })],
                        components: [buildChestButtons(inventory, translator, true)],
                    });
                } else {
                    await interaction.editReply({ components: [buildChestButtons(inventory, translator, true)] });
                }
            } catch (error) {
                console.error('[openchest] Erro ao finalizar coletor:', error);
            }
        });
    },
};
