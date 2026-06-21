const jwt = require('jsonwebtoken');
const axios = require('axios');
const DashboardAccountService = require('../../../database/services/DashboardAccountService');

module.exports = {
    route: '/expapi/v1/discordinfo',
    description: "Busca informações públicas do Discord se a conta estiver vinculada",
    apiKeyNeeded: false,
    jwtNeeded: false,
    enabled: true,
    loginLimiterNeeded: false,
    csrfProtectionNeeded: false,
    checkAuthNeeded: false,
    method: 'get',

    async execute(req, res) {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: 'Token não fornecido' });
        }

        const token = authHeader.split(' ')[1];
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const email = decoded.email;

            // Busca a conta do usuário no Dashboard
            let account = await DashboardAccountService.getDashboardAccountByEmail(email);
            if (!account) {
                return res.status(404).json({ error: 'Conta não encontrada' });
            }

            // Verifica se a conta está vinculada com o Discord
            if (!account.discordOauth2Token || account.discordOauth2Token.trim() === '') {
                return res.status(400).json({ error: 'Conta Discord não vinculada' });
            }

            // Verifica se o token OAuth2 expirou (supondo que account.discordOauth2TokenExpiresAt esteja salvo como Date)
            if (new Date() >= new Date(account.discordOauth2TokenExpiresAt)) {
                try {
                    // Realiza o refresh do token no Discord
                    const params = new URLSearchParams({
                        client_id: process.env.DISCORD_CLIENT_ID,
                        client_secret: process.env.DISCORD_CLIENT_SECRET,
                        grant_type: 'refresh_token',
                        refresh_token: account.discordOauth2RefreshToken,
                        redirect_uri: process.env.DISCORD_REDIRECT_URI,
                        scope: 'identify email messages.read'
                    });
                    
                    const tokenResponse = await axios.post(
                        'https://discord.com/api/oauth2/token',
                        params.toString(),
                        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
                    );
                    
                    const newAccessToken = tokenResponse.data.access_token;
                    const newRefreshToken = tokenResponse.data.refresh_token;
                    const expiresIn = tokenResponse.data.expires_in;
                    
                    // Atualiza a conta no banco com os novos dados
                    account = await DashboardAccountService.update(
                        { email },
                        {
                            $set: {
                                discordOauth2Token: newAccessToken,
                                discordOauth2RefreshToken: newRefreshToken,
                                discordOauth2TokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
                                discordOauth2TokenType: 'Bearer',
                                discordOauth2TokenScope: 'identify email messages.read'
                            }
                        },
                    );
                    console.log('Token OAuth2 atualizado com sucesso');
                } catch (refreshError) {
                    console.error('Erro ao atualizar o token OAuth2:', refreshError);
                    return res.status(500).json({ error: 'Erro durante refresh do token' });
                }
            }

            // Requisição para obter informações do Discord com o token (se atualizado ou não)
            const discordResponse = await axios.get('https://discord.com/api/users/@me', {
                headers: { Authorization: `Bearer ${account.discordOauth2Token}` }
            });
            
            const { avatar, username, id } = discordResponse.data;
            return res.status(200).json({ avatar, username, id });
        } catch (error) {
            console.error('Erro ao buscar informações do Discord:', error);
            return res.status(500).json({ error: 'Erro interno ao obter informações do Discord' });
        }
    }
};