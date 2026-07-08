const crypto         = require('crypto');
const BotService     = require('../../../database/services/BotService');
const { routeError } = require('../../../logger/logger');

const ROUTE = 'GET /expapi/internal/fetchbot';

function encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(process.env.ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}

module.exports = {
    route: '/expapi/internal/fetchbot',
    description: "Fetch bot data (encrypted)",
    apiKeyNeeded: true, 
    internalKeyNeeded: true, 
    jwtNeeded: false,
    enabled: true, 
    loginLimiterNeeded: false, 
    csrfProtectionNeeded: false,
    checkAuthNeeded: false, 
    method: 'get',

    async execute(req, res) {
        try {
            const bot = await BotService.getBot();
            if (!bot)
                return res.status(404).json({ error: 'Dados do bot não encontrados.', code: 'BOT_NOT_FOUND' });

            const encryptedBot = encrypt(JSON.stringify(bot));
            return res.status(200).send(encryptedBot);
        } catch (error) {
            return routeError({ res, error, route: ROUTE, errorCode: 'FETCH_BOT_ERROR',
                userMsg: 'Erro ao buscar/criptografar dados do bot.' });
        }
    }
};
