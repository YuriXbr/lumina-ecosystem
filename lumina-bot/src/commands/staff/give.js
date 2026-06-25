const axios = require('axios');
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    permission: 'admin',
    category: 'staff',
    cooldown: 15,
	data: new SlashCommandBuilder()
		.setName('give')
		.setDescription('Give a user an item.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to give the item.')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('item')
                .setDescription('The item to give.')
                .setRequired(true)
                .addChoices(
                    { name: 'Hextech Chest', value: 'hextechChest' },
                    { name: 'Masterwork Chest', value: 'masterWorkChest' },
                    { name: 'Key', value: 'key' }
                )
        )
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('The amount of the item to give.')
                .setRequired(true)
                .setMinValue(1)
        ),

	execute(interaction) {
        if (interaction.options.getInteger('amount') < 1) {
            return interaction.reply({ content: 'The amount must be greater than 0.', ephemeral: true });
        }
        
        const user = interaction.options.getUser('user').id;
        const item = interaction.options.getString('item');
        const amount = interaction.options.getInteger('amount');

        if (addToIventory(user, item, amount)) {
            interaction.reply({ content: `Successfully gave ${amount} ${item} to <@${user}>.`, ephemeral: true });
        } else {
            interaction.reply({ content: 'An error occurred while giving the item.', ephemeral: true });
        }
        

        async function addToIventory(user, item, quantity) {
            try {
                const response = await axios.post(process.env.API_BASE_URL + '/expapi/internal/addinventory' ,
                    {
                        userId: user,
                        item: item,
                        amount: quantity
                    },
                    { 
                        headers: { 
                            'internal-key': process.env.INTERNAL_API_KEY
                        } 
                    }
                );
                return true;
            } catch(err) {
                console.error('Erro ao adicionar item ao inventário:', err);
                return false;
            }
        }
	},
};