const crypto         = require('crypto');
const BotService     = require('../../../database/services/BotService');
const { routeError } = require('../../../logger/logger');

const ROUTE = 'POST /expapi/internal/updatebot';

function decrypt(encryptedText) {
    const [ivHex, encryptedData] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(process.env.ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
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
        const { data: encryptedData } = req.body;
        if (!encryptedData)
            return res.status(400).json({ error: 'Campo data (encriptado) é obrigatório.', code: 'MISSING_DATA' });

        try {
            const decryptedData = decrypt(encryptedData);
            await BotService.updateBot(decryptedData['0'] || decryptedData);
            return res.status(200).json({ message: 'Configuração do bot atualizada com sucesso.' });
        } catch (error) {
            return routeError({ res, error, route: ROUTE, errorCode: 'UPDATE_BOT_ERROR',
                userMsg: 'Erro ao atualizar configuração do bot.' });
        }
    }
};
