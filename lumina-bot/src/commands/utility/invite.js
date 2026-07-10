const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    permission: 'everyone',
    category: 'utility',
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName('invite')
        .setDescription('Adiciona o Lumina Bot em outro servidor'),

    async execute(interaction) {
        const clientId = process.env.DISCORD_CLIENT_ID || interaction.client.user.id;
        // Administrator permissions = 8
        const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=8&scope=bot+applications.commands`;

        const embed = new EmbedBuilder()
            .setTitle('✨ Adicione o Lumina Bot em outro servidor!')
            .setDescription(`Clique [aqui](${inviteUrl}) para adicionar o Lumina Bot em um servidor onde você tem permissão de gerenciar.`)
            .setColor('#7C3AED')
            .addFields(
                { name: '🔗 Link direto', value: `[Convidar Bot](${inviteUrl})`, inline: false },
                { name: '💡 Dica', value: 'Você precisa ter permissão de **Gerenciar Servidor** no servidor de destino.', inline: false },
            )
            .setFooter({ text: 'Lumina Bot', iconURL: interaction.client.user.displayAvatarURL() })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
