const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, AttachmentBuilder } = require('discord.js');
const { fetchRule34Posts } = require('../../api/rule34');
const i18n = require('../../utils/i18n/index.js');
const { loc } = require('../../utils/i18n/commandLocales.js');

module.exports = {
    permission: 'admin',
    category: 'staff',
    data: new SlashCommandBuilder()
        .setName('test')
        .setDescription('Browse Rule34 images')
        .setDescriptionLocalizations(loc('Navegar por imagens do Rule34', 'Navegar por imágenes de Rule34'))
        .addStringOption(option =>
            option.setName('tags')
                .setDescription('Tags to search for (e.g., ahri, league_of_legends)')
                .setDescriptionLocalizations(loc('Tags para pesquisar (ex: ahri, league_of_legends)', 'Tags para buscar (ej: ahri, league_of_legends)'))
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('sort')
                .setDescription('Sort order')
                .setDescriptionLocalizations(loc('Ordem de classificação', 'Orden de clasificación'))
                .setRequired(false)
                .addChoices(
                    { name: 'Score (Highest first)', name_localizations: loc('Pontuação (Maior primeiro)', 'Puntuación (Mayor primero)'), value: 'score' },
                    { name: 'New (Latest first)', name_localizations: loc('Novo (Mais recente primeiro)', 'Nuevo (Más reciente primero)'), value: 'new' },
                    { name: 'Old (Oldest first)', name_localizations: loc('Antigo (Mais antigo primeiro)', 'Antiguo (Más antiguo primero)'), value: 'old' }
                )
        )
        .addStringOption(option =>
            option.setName('rating')
                .setDescription('Content rating filter')
                .setDescriptionLocalizations(loc('Filtro de classificação de conteúdo', 'Filtro de clasificación de contenido'))
                .setRequired(false)
                .addChoices(
                    { name: 'All', name_localizations: loc('Todos', 'Todos'), value: 'all' },
                    { name: 'Safe', name_localizations: loc('Seguro', 'Seguro'), value: 'safe' },
                    { name: 'Questionable', name_localizations: loc('Questionável', 'Cuestionable'), value: 'questionable' },
                    { name: 'Explicit', name_localizations: loc('Explícito', 'Explícito'), value: 'explicit' }
                )
        ),
        
        
        
    async execute(interaction, t) {
        const translator = t || i18n.getTranslator(i18n.resolveFromInteraction(interaction));
        try {
            if (!interaction.channel.nsfw) {
            return interaction.reply({
                content: translator('cmd.test.nsfwRequired'),
                ephemeral: true
            });
            }
            await interaction.deferReply();

            const baseTags = interaction.options.getString('tags') || 'league_of_legends';
            const sortOption = interaction.options.getString('sort') || 'score';
            const ratingOption = interaction.options.getString('rating') || 'all';
            
            // Estado da paginação
            let currentPage = 0;
            let currentImageIndex = 0;
            let allImages = [];
            let isLoading = false;
            let excludeAI = true; // Por padrão, exclui imagens IA
            let mediaFilter = 'all'; // 'all', 'images', 'videos'

            // Função para verificar se é vídeo/GIF
            function isVideoOrGif(post) {
                const fileUrl = post.file_url || '';
                const extension = fileUrl.split('.').pop().toLowerCase();
                return ['mp4', 'webm', 'gif'].includes(extension);
            }

            // Função para obter tags com filtros
            function getTagsWithFilter() {
                let tags = baseTags;
                
                // Adicionar filtro de IA
                if (excludeAI) {
                    tags += ' -ai_generated';
                }
                
                // Adicionar filtro de rating
                if (ratingOption !== 'all') {
                    tags += ` rating:${ratingOption}`;
                }
                
                // Adicionar ordenação
                if (sortOption === 'score') {
                    tags += ' sort:score';
                } else if (sortOption === 'new') {
                    tags += ' sort:updated';
                } else if (sortOption === 'old') {
                    tags += ' sort:id:asc';
                }
                
                return tags;
            }

            // Função para buscar mais imagens
            async function fetchMoreImages() {
                if (isLoading) return;
                isLoading = true;

                try {
                    const newImages = await fetchRule34Posts({
                        apiKey: process.env.RULE34_API_KEY,
                        userId: process.env.RULE34_USER_ID,
                        tags: getTagsWithFilter(),
                        limit: 10,
                        pid: currentPage
                    });

                    if (newImages && newImages.length > 0) {
                        // Filtrar por tipo de mídia se necessário
                        let filteredImages = newImages;
                        if (mediaFilter === 'images') {
                            filteredImages = newImages.filter(post => !isVideoOrGif(post));
                        } else if (mediaFilter === 'videos') {
                            filteredImages = newImages.filter(post => isVideoOrGif(post));
                        }
                        
                        allImages.push(...filteredImages);
                        currentPage++;
                    }
                } catch (error) {
                    console.error('Erro ao buscar imagens:', error);
                } finally {
                    isLoading = false;
                }
            }

            // Função para resetar e buscar do zero
            async function resetAndFetch() {
                currentPage = 0;
                currentImageIndex = 0;
                allImages = [];
                await fetchMoreImages();
            }

            // Buscar primeiras 10 imagens
            await fetchMoreImages();

            if (allImages.length === 0) {
                return await interaction.editReply({
                    content: translator('cmd.test.noImages'),
                    ephemeral: true
                });
            }

            // Função para criar a embed
            function createEmbed(index, isLoadingMore = false) {
                const image = allImages[index];
                const isVideo = isVideoOrGif(image);
                
                const sortText = sortOption === 'score' ? '🏆 Score' : sortOption === 'new' ? '🆕 Mais Recentes' : '⏰ Mais Antigas';
                const ratingText = ratingOption === 'all' ? 'Todos' : ratingOption === 'safe' ? '✅ Safe' : ratingOption === 'questionable' ? '⚠️ Questionable' : '🔞 Explicit';
                const mediaFilterText = mediaFilter === 'all' ? '📁 Todos' : mediaFilter === 'images' ? '🖼️ Apenas Imagens' : '🎬 Apenas Vídeos';
                const mediaTypeIcon = isVideo ? '🎬' : '🖼️';
                
                const embed = new EmbedBuilder()
                    .setTitle(`Rule34 - ${baseTags}`)
                    .setDescription(
                        `${mediaTypeIcon} **Tipo:** ${isVideo ? 'Vídeo/GIF' : 'Imagem'}\n` +
                        `**ID:** ${image.id}\n` +
                        `**Score:** ${image.score} ⭐\n` +
                        `**Rating:** ${image.rating}\n` +
                        `**Ordenação:** ${sortText}\n` +
                        `**Filtro Rating:** ${ratingText}\n` +
                        `**Filtro Mídia:** ${mediaFilterText}\n` +
                        `**Filtro IA:** ${excludeAI ? '🚫 Excluindo IA' : '✅ Incluindo IA'}` +
                        (isLoadingMore ? '\n\n⏳ **Carregando mais imagens...**' : '')
                    )
                    .setColor(isLoadingMore ? 0xFFA500 : 0x00AE86)
                    .setFooter({ text: `${isVideo ? 'Vídeo' : 'Imagem'} ${index + 1} de ${allImages.length} | Página ${Math.floor(index / 10) + 1}` })
                    .setTimestamp();

                // Array para armazenar attachments
                const files = [];

                // Para vídeos, usar attachment + thumbnail
                if (isVideo) {
                    // Usar o arquivo como attachment
                    const fileName = `video_${image.id}.${image.file_url.split('.').pop()}`;
                    files.push({
                        attachment: image.file_url,
                        name: fileName
                    });
                    
                    // Referenciar o attachment no embed
                    embed.setImage(`attachment://${fileName}`);
                    
                    // Adicionar thumbnail
                    if (image.preview_url) {
                        embed.setThumbnail(image.preview_url);
                    }
                } else {
                    // Para imagens, usar URL direta
                    embed.setImage(image.file_url);
                }

                // Adicionar fonte se existir
                if (image.source && image.source.trim() !== '') {
                    // Verificar se é uma URL válida (pode ter múltiplas URLs separadas por espaço)
                    const sources = image.source.trim().split(/\s+/);
                    const validUrls = sources.filter(url => {
                        try {
                            const parsedUrl = new URL(url);
                            // Verificar se a URL está completa (tem hostname e protocolo válido)
                            return parsedUrl.hostname.includes('.') && (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:');
                        } catch {
                            return false;
                        }
                    });
                    
                    // Usar apenas a primeira URL válida para setURL
                    if (validUrls.length > 0) {
                        embed.setURL(validUrls[0]);
                        
                        // Mostrar todas as fontes válidas no campo
                        const sourceText = validUrls.length > 1 
                            ? validUrls.map((url, i) => `[Fonte ${i + 1}](${url})`).join(' • ')
                            : validUrls[0];
                        
                        embed.addFields({
                            name: '🔗 Fonte',
                            value: sourceText.length > 1024 ? sourceText.substring(0, 1021) + '...' : sourceText,
                            inline: false
                        });
                    }
                }

                // Adicionar tags (limitado para não exceder o limite de caracteres)
                if (image.tags) {
                    const tagList = image.tags.split(' ').slice(0, 20).join(', ');
                    embed.addFields({ 
                        name: '🏷️ Tags', 
                        value: tagList.length > 1024 ? tagList.substring(0, 1021) + '...' : tagList,
                        inline: false 
                    });
                }

                return { embed, files };
            }

            // Função para criar os botões
            function createButtons(index) {
                const navigationRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('first')
                            .setLabel('⏮️')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(index === 0),
                        new ButtonBuilder()
                            .setCustomId('previous')
                            .setLabel('◀️')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(index === 0),
                        new ButtonBuilder()
                            .setCustomId('next')
                            .setLabel('▶️')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(index >= allImages.length - 1),
                        new ButtonBuilder()
                            .setCustomId('last')
                            .setLabel('⏭️')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(index >= allImages.length - 1),
                        new ButtonBuilder()
                            .setCustomId('stop')
                            .setLabel('⏹️')
                            .setStyle(ButtonStyle.Danger)
                    );

                const toggleRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('toggle_ai')
                            .setLabel(excludeAI ? 'IA Desativada' : 'IA Ativada')
                            .setStyle(excludeAI ? ButtonStyle.Success : ButtonStyle.Secondary)
                            .setEmoji(excludeAI ? '🚫' : '🤖'),
                        new ButtonBuilder()
                            .setCustomId('toggle_media')
                            .setLabel(
                                mediaFilter === 'all' ? 'Todos' : 
                                mediaFilter === 'images' ? 'Imagens' : 
                                'Vídeos'
                            )
                            .setStyle(
                                mediaFilter === 'all' ? ButtonStyle.Primary : 
                                mediaFilter === 'images' ? ButtonStyle.Success : 
                                ButtonStyle.Success
                            )
                            .setEmoji(
                                mediaFilter === 'all' ? '📁' : 
                                mediaFilter === 'images' ? '🖼️' : 
                                '🎬'
                            )
                    );

                return [navigationRow, toggleRow];
            }

            // Enviar mensagem inicial
            const embedData = createEmbed(currentImageIndex);
            const message = await interaction.editReply({
                embeds: [embedData.embed],
                files: embedData.files,
                components: createButtons(currentImageIndex)
            });

            // Coletor de interações dos botões
            const collector = message.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 300000 // 5 minutos
            });

            collector.on('collect', async (buttonInteraction) => {
                if (buttonInteraction.user.id !== interaction.user.id) {
                    return await buttonInteraction.reply({
                        content: translator('cmd.test.notYourButton'),
                        ephemeral: true
                    });
                }

                await buttonInteraction.deferUpdate();
                let shouldLoadMore = false;

                switch (buttonInteraction.customId) {
                    case 'first':
                        currentImageIndex = 0;
                        break;
                    
                    case 'previous':
                        if (currentImageIndex > 0) {
                            currentImageIndex--;
                        }
                        break;
                    
                    case 'next':
                        if (currentImageIndex < allImages.length - 1) {
                            currentImageIndex++;
                            
                            // Se chegou perto do fim e ainda não carregou todas as imagens possíveis
                            if (currentImageIndex >= allImages.length - 3 && allImages.length % 10 === 0 && !isLoading) {
                                shouldLoadMore = true;
                            }
                        }
                        break;
                    
                    case 'last':
                        currentImageIndex = allImages.length - 1;
                        break;
                    
                    case 'toggle_ai':
                        // Alterna o filtro de IA e reinicia a busca
                        excludeAI = !excludeAI;
                        
                        // Mostrar feedback de carregamento
                        await buttonInteraction.editReply({
                            embeds: [new EmbedBuilder()
                                .setTitle(translator('cmd.test.loading'))
                                .setDescription(`Buscando com ${excludeAI ? 'IA desativada' : 'IA ativada'}...`)
                                .setColor(0xFFA500)
                            ],
                            files: [],
                            components: []
                        });
                        
                        await resetAndFetch();
                        
                        if (allImages.length === 0) {
                            await buttonInteraction.editReply({
                                content: translator('cmd.test.noImagesFilter'),
                                embeds: [],
                                files: [],
                                components: []
                            });
                            collector.stop('no_results');
                            return;
                        }
                        
                        // Atualizar com a primeira imagem do novo filtro
                        const toggleAiEmbedData = createEmbed(currentImageIndex);
                        await buttonInteraction.editReply({
                            embeds: [toggleAiEmbedData.embed],
                            files: toggleAiEmbedData.files,
                            components: createButtons(currentImageIndex)
                        });
                        return;
                    
                    case 'toggle_media':
                        // Alterna entre: all -> images -> videos -> all
                        if (mediaFilter === 'all') {
                            mediaFilter = 'images';
                        } else if (mediaFilter === 'images') {
                            mediaFilter = 'videos';
                        } else {
                            mediaFilter = 'all';
                        }
                        
                        // Mostrar feedback de carregamento
                        const mediaText = mediaFilter === 'all' ? 'todos os tipos' : mediaFilter === 'images' ? 'apenas imagens' : 'apenas vídeos';
                        await buttonInteraction.editReply({
                            embeds: [new EmbedBuilder()
                                .setTitle(translator('cmd.test.loading'))
                                .setDescription(`Buscando ${mediaText}...`)
                                .setColor(0xFFA500)
                            ],
                            files: [],
                            components: []
                        });
                        
                        await resetAndFetch();
                        
                        if (allImages.length === 0) {
                            await buttonInteraction.editReply({
                                content: `❌ Nenhum conteúdo encontrado para ${mediaText}.`,
                                embeds: [],
                                files: [],
                                components: []
                            });
                            collector.stop('no_results');
                            return;
                        }
                        
                        // Atualizar com a primeira imagem do novo filtro
                        const toggleMediaEmbedData = createEmbed(currentImageIndex);
                        await buttonInteraction.editReply({
                            embeds: [toggleMediaEmbedData.embed],
                            files: toggleMediaEmbedData.files,
                            components: createButtons(currentImageIndex)
                        });
                        return;
                    
                    case 'stop':
                        collector.stop('user_stopped');
                        return;
                }

                // Atualizar a interface
                const embedData = createEmbed(currentImageIndex, shouldLoadMore);
                await buttonInteraction.editReply({
                    embeds: [embedData.embed],
                    files: embedData.files,
                    components: createButtons(currentImageIndex)
                });

                // Carregar mais imagens em background se necessário
                if (shouldLoadMore) {
                    await fetchMoreImages();
                    
                    // Atualizar a interface removendo o indicador de carregamento
                    const updatedEmbedData = createEmbed(currentImageIndex, false);
                    await buttonInteraction.editReply({
                        embeds: [updatedEmbedData.embed],
                        files: updatedEmbedData.files,
                        components: createButtons(currentImageIndex)
                    }).catch(() => {});
                }
            });

            collector.on('end', async (collected, reason) => {
                const disabledNavigationRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('first')
                            .setLabel('⏮️')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(true),
                        new ButtonBuilder()
                            .setCustomId('previous')
                            .setLabel('◀️')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(true),
                        new ButtonBuilder()
                            .setCustomId('next')
                            .setLabel('▶️')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(true),
                        new ButtonBuilder()
                            .setCustomId('last')
                            .setLabel('⏭️')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(true),
                        new ButtonBuilder()
                            .setCustomId('stop')
                            .setLabel('⏹️')
                            .setStyle(ButtonStyle.Danger)
                            .setDisabled(true)
                    );

                const disabledToggleRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('toggle_ai')
                            .setLabel(excludeAI ? 'IA Desativada' : 'IA Ativada')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji(excludeAI ? '🚫' : '🤖')
                            .setDisabled(true),
                        new ButtonBuilder()
                            .setCustomId('toggle_media')
                            .setLabel(
                                mediaFilter === 'all' ? 'Todos' : 
                                mediaFilter === 'images' ? 'Imagens' : 
                                'Vídeos'
                            )
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji(
                                mediaFilter === 'all' ? '📁' : 
                                mediaFilter === 'images' ? '🖼️' : 
                                '🎬'
                            )
                            .setDisabled(true)
                    );

                await message.edit({
                    components: [disabledNavigationRow, disabledToggleRow]
                }).catch(() => {});

                if (reason === 'time') {
                    await interaction.followUp({
                        content: translator('cmd.test.timedOut'),
                        ephemeral: true
                    }).catch(() => {});
                }
            });

        } catch (error) {
            console.error('Erro no comando test:', error);
            
            const errorMessage = {
                content: translator('cmd.test.fetchError'),
                ephemeral: true
            };

            if (interaction.deferred || interaction.replied) {
                await interaction.editReply(errorMessage).catch(() => {});
            } else {
                await interaction.reply(errorMessage).catch(() => {});
            }
        }
    }
};