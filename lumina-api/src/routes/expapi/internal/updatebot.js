const BotService = require('../../../database/services/BotService');
const crypto = require('crypto');

// Configuração para criptografia
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // Deve ser de 32 bytes para AES-256
const IV_LENGTH = 16; // Comprimento do vetor de inicialização

function decrypt(encryptedText) {
    const [ivHex, encryptedData] = encryptedText.split(':'); // Divide o texto criptografado em IV e dados
    const iv = Buffer.from(ivHex, 'hex'); // Converte o IV para Buffer
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);

    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted); // Retorna os dados descriptografados
}

module.exports = {
    route: '/expapi/internal/updatebot',
    description: "Update bot configuration",
    apiKeyNeeded: true,
    internalKeyNeeded: true,
    jwtNeeded: false,
    enabled: true,
    loginLimiterNeeded: false,
    csrfProtectionNeeded: false,
    checkAuthNeeded: false,
    method: 'post',

    async execute(req, res) {
        try {
            // Extrai e descriptografa os dados recebidos no corpo da requisição
            const { data: encryptedData } = req.body;
            if (!encryptedData) {
                return res.status(400).json({ error: 'Encrypted data is required.' });
            }

            const decryptedData = decrypt(encryptedData);

            // Valida e processa os dados descriptografados
            console.log('Decrypted Data:', decryptedData);

            // Salve os dados no banco de dados ou realize outras operações necessárias
            BotService.updateBot(decryptedData['0']);

            return res.status(200).json({ success: true, message: 'Bot configuration updated successfully.' });
        } catch (error) {
            console.error('Error in /updatebot handler:', error);
            return res.status(500).json({ error: 'Internal server error.' });
        }
    }
};
