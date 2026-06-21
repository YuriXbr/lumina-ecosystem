const { Events, EmbedBuilder  } = require('discord.js');
const axios = require('axios');

module.exports = {
	name: Events.MessageCreate,
	once: false,
	async execute(message) {
        if (message.author.bot) return;

    // Gere um número aleatório entre 0 e 1
    const random = Math.random();
    
    if (random <= 0.0015) { // Se o número for menor ou igual a 0.005 (0.5% de chance), spawnar um baú do mestre artesão
        const success = await addToIventory('masterWorkChests', 1);
        if (!success) return console.error('Erro ao adicionar baú do mestre artesão ao inventário de ', message.author.id);

        const embed = new EmbedBuilder()
            .setTitle(`${message.author.username}, Você recebeu um baú do mestre artesão!`)
            .setDescription('Use /openchest para abrir o baú!')
            .setThumbnail('https://www.unrankedsmurfs.com/storage/YYs4U0GEgTMgfEE5WsNHzIJBsgXFKVQ4bs9Za2RL.png')
            .setColor('Yellow');
            
        message.reply({ embeds: [embed]});

    
    } else if (random <= 0.02) { // Se o número for menor ou igual a 0.01 1% de chance), spawnar um baú Hextec
        const success = await addToIventory('hextechChests', 1);
        if (!success) return console.error('Erro ao adicionar baú Hextec ao inventário de ', message.author.id);
            
        const embed = new EmbedBuilder()
                .setTitle(`${message.author.username}, você recebeu um baú Hextec!`)
                .setDescription('Use /openchest para abrir o baú!')
                .setThumbnail('https://static.wikia.nocookie.net/leagueoflegends/images/6/60/Hextech_Crafting_Chest.png/revision/latest/scale-to-width-down/250?cb=20191203123712')
                .setColor('Yellow');

        message.reply({ embeds: [embed]});


    } else if (random <= 0.05) { // Se o número for menor ou igual a 0.05 (5% de chance), spawnar uma chave Hextec
        const success = await addToIventory('keys', 1);
        if (!success) return console.error('Erro ao adicionar chave Hextec ao inventário de ', message.author.id);

        const embed = new EmbedBuilder()
            .setTitle(`${message.author.username}, Você recebeu uma chave Hextec!`)
            .setDescription('Use /openchest para usá-la em seu baú do mestre artesão!')
            .setThumbnail('https://static.wikia.nocookie.net/leagueoflegends/images/3/3e/Hextech_Crafting_Key.png/revision/latest/scale-to-width-down/250?cb=20191203123712')
            .setColor('Yellow');

        message.reply({ embeds: [embed]});
    }

    async function addToIventory(item, quantity) {
        try {
            const response = await axios.post('https://api.luminasink.me/expapi/internal/addinventory' ,
                {
                    userId: message.author.id,
                    item,
                    amount: quantity
                },
                { 
                    headers: { 
                        'internal-key': process.env.INTERNAL_KEY,
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