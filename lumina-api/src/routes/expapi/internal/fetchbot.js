const crypto = require('crypto');
const BotService = require('../../../database/services/BotService');

// Configuração para criptografia
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // Deve ser de 32 bytes para AES-256
const IV_LENGTH = 16; // Comprimento do vetor de inicialização

function encrypt(text) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted; // Combine IV com dados criptografados
}

// Endpointed Checked on V1.2.0

module.exports = {
    route: '/expapi/internal/fetchbot',
    description: "Fetch bot data",
    apiKeyNeeded: true,
    internalKeyNeeded: true,
    jwtNeeded: false,
    enabled: true,
    loginLimiterNeeded: false,
    csrfProtectionNeeded: false,
    checkAuthNeeded: false,
    method: 'get',

    async execute(req, res) {
        // Will receive registers from bot table and send to the client

        let bot = await BotService.getBot();
        
        if (!bot) {
            return res.status(500).send('Error fetching bot');
        }

        try {
            // Criptografar os dados
            const encryptedBot = encrypt(JSON.stringify(bot));
            return res.status(200).send(encryptedBot);
        } catch (error) {
            console.error('Encryption error:', error);
            return res.status(500).send('Error encrypting bot data');
        }
    }
};
