const jwt = require('jsonwebtoken');
const url = require('url');

module.exports = {
    route: '/expapi/oauth2/discord/prepare',
    description: "Prepara a URL de redirecionamento do Discord usando o token JWT no header",
    apiKeyNeeded: false,
    internalKeyNeeded: false,
    jwtNeeded: true,
    enabled: true,
    loginLimiterNeeded: false,
    csrfProtectionNeeded: false,
    checkAuthNeeded: false,
    method: 'post',

    async execute(req, res) {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: 'Token não fornecido' });
        }
        const token = authHeader.split(' ')[1];
        
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            // Extrai o accountId do token; ajuste conforme o payload do seu JWT
            const accountId = decoded.accountId;
            const origin = req.body.origin || 'https://bot.luminasink.com';

            // Verificar se as variáveis estão definidas
            if (!process.env.DISCORD_CLIENT_ID) {
                console.error('DISCORD_CLIENT_ID não está definido!');
                return res.status(500).json({ error: 'Configuração do Discord não encontrada' });
            }

            // Cria um objeto state incluindo origin e accountId
            const stateObject = { origin, accountId };

            // Monte a URL de autorização do Discord (endpoint correto)
            const redirectUrl = url.format({
                pathname: 'https://discord.com/oauth2/authorize',
                query: {
                    client_id: process.env.DISCORD_CLIENT_ID,
                    redirect_uri: process.env.DISCORD_REDIRECT_URI, // callback do seu app
                    response_type: 'code',
                    scope: 'identify email guilds', // Escopo reduzido e válido
                    state: JSON.stringify(stateObject)
                }
            });
            res.status(200).json({ redirectUrl });
        } catch (error) {
            console.error('Erro ao preparar URL OAuth2:', error);
            res.status(500).json({ error: 'Erro interno ao preparar URL OAuth2' });
        }
    }
};