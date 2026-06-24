const jwt = require('jsonwebtoken');
const { getProvider } = require('../../../oauthProviders');
const { isAllowedOrigin, verifyState } = require('../../../oauthProviders/state');
const DashboardAccountService = require('../../../database/services/DashboardAccountService');

const STATE_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutos

/**
 * Callback OAuth2. Trata três intents (definidos em authStart):
 *
 *   link     — vincula o Discord à conta do usuário já logado (pelo accountId no state)
 *   register — cria conta nova; se o email já existir redireciona com erro
 *   login    — entra na conta existente ou cria uma nova automaticamente
 */
module.exports = {
    route: '/expapi/oauth2/:provider/auth/callback',
    description: 'Callback OAuth2 — cria ou autentica conta automaticamente',
    apiKeyNeeded: false,
    internalKeyNeeded: false,
    jwtNeeded: false,
    enabled: true,
    loginLimiterNeeded: false,
    csrfProtectionNeeded: false,
    checkAuthNeeded: false,
    method: 'get',

    async execute(req, res) {
        let provider;
        try {
            provider = getProvider(req.params.provider);
        } catch {
            return res.status(404).send('Provedor OAuth2 não suportado.');
        }

        const { code, state: rawState, error } = req.query;
        const state = verifyState(rawState);

        if (!state || Date.now() - state.issuedAt > STATE_MAX_AGE_MS) {
            return res.status(400).send('Estado inválido ou expirado. Tente novamente.');
        }
        if (!isAllowedOrigin(state.origin)) {
            return res.status(400).send('Origin não permitida.');
        }
        if (!code || error) {
            return res.redirect(`${state.origin}/login?oauthError=${encodeURIComponent(error || 'missing_code')}`);
        }

        const intent = state.intent || 'login';

        try {
            const tokens = await provider.exchangeCode(code);
            const profile = await provider.getProfile(tokens.accessToken);

            if (!profile.providerId) {
                throw new Error('Perfil OAuth2 retornado sem ID.');
            }

            // Atualiza os campos legados do Discord (usados pelo bot, inventário, etc.)
            const updateDiscordLegacyFields = async (accountId) => {
                if (provider.name !== 'discord') return;
                await DashboardAccountService.update(
                    { accountId },
                    {
                        $set: {
                            discordOauth2Id: profile.providerId,
                            discordOauth2Token: tokens.accessToken,
                            discordOauth2RefreshToken: tokens.refreshToken,
                            discordOauth2TokenExpiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
                            discordOauth2TokenScope: tokens.scope,
                            discordOauth2TokenType: tokens.tokenType,
                            discordOauth2TokenRequestDate: new Date(),
                            discordOauth2TokenRequestIp: req.ip
                        }
                    }
                );
            };

            const issueJwt = (account) => jwt.sign(
                {
                    email: account.email,
                    accountId: account.accountId,
                    firstName: account.firstName,
                    lastName: account.lastName
                },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );

            // ── LINK ────────────────────────────────────────────────────────────────────
            // Usuário já logado quer vincular o Discord à sua conta atual.
            // O accountId está assinado no state — não depende de email.
            if (intent === 'link') {
                if (!state.linkAccountId) {
                    return res.redirect(`${state.origin}/oauth/complete?oauthError=link_no_account`);
                }

                const account = await DashboardAccountService.getDashboardAccountByAccountId(state.linkAccountId).catch(() => null);
                if (!account) {
                    return res.redirect(`${state.origin}/oauth/complete?oauthError=link_account_not_found`);
                }

                // Bloqueia se esse Discord já estiver vinculado a OUTRA conta
                const existingByProvider = await DashboardAccountService.getDashboardAccountByProviderId(
                    provider.name, profile.providerId
                ).catch(() => null);
                if (existingByProvider && existingByProvider.accountId !== account.accountId) {
                    return res.redirect(`${state.origin}/oauth/complete?oauthError=discord_already_linked`);
                }

                await DashboardAccountService.linkOAuthProvider(account.accountId, provider.name, {
                    providerId: profile.providerId,
                    linkedAt: new Date()
                });
                await updateDiscordLegacyFields(account.accountId);

                const jwtToken = issueJwt(account);
                const redirectUrl = new URL(`${state.origin}/oauth/complete`);
                redirectUrl.hash = `token=${jwtToken}&isNewAccount=false&hasPassword=${!!account.password}&linkedDiscord=true`;
                return res.redirect(redirectUrl.toString());
            }

            // ── REGISTER ────────────────────────────────────────────────────────────────
            // Diferença em relação ao login:
            //   - Email já cadastrado em outra conta → erro (não auto-linka)
            //   - Discord já vinculado → faz login normalmente (conta já existe)
            if (intent === 'register') {
                // Discord já vinculado a uma conta → login direto
                let account = await DashboardAccountService.getDashboardAccountByProviderId(
                    provider.name, profile.providerId
                ).catch(() => null);

                if (!account) {
                    // Email já existe → erro; usuário deve logar e vincular manualmente
                    if (profile.email) {
                        const existingByEmail = await DashboardAccountService.getDashboardAccountByEmail(profile.email).catch(() => null);
                        if (existingByEmail) {
                            return res.redirect(`${state.origin}/register?oauthError=email_exists`);
                        }
                    }

                    // Nenhuma conta encontrada → cria
                    const [firstName, ...rest] = (profile.username || 'Usuário').split(' ');
                    account = await DashboardAccountService.createOAuthAccount({
                        email: profile.email || `${provider.name}-${profile.providerId}@no-email.luminasink.com`,
                        firstName: firstName || 'Usuário',
                        lastName: rest.join(' ') || provider.name,
                        emailVerified: !!profile.emailVerified,
                        provider: provider.name,
                        providerId: profile.providerId,
                        registrationIp: req.ip,
                        registrationUserAgent: req.headers['user-agent'],
                        registrationCountry: req.headers['cf-ipcountry'] || ''
                    });
                    await updateDiscordLegacyFields(account.accountId);

                    const jwtToken = issueJwt(account);
                    const redirectUrl = new URL(`${state.origin}/oauth/complete`);
                    redirectUrl.hash = `token=${jwtToken}&isNewAccount=true&hasPassword=false`;
                    return res.redirect(redirectUrl.toString());
                }

                // Discord já vinculado → login
                await updateDiscordLegacyFields(account.accountId);
                const jwtToken = issueJwt(account);
                const redirectUrl = new URL(`${state.origin}/oauth/complete`);
                redirectUrl.hash = `token=${jwtToken}&isNewAccount=false&hasPassword=${!!account.password}`;
                return res.redirect(redirectUrl.toString());
            }

            // ── LOGIN (padrão) ──────────────────────────────────────────────────────────
            // 1) Conta vinculada a esse Discord ID
            let account = await DashboardAccountService.getDashboardAccountByProviderId(
                provider.name, profile.providerId
            ).catch(() => null);

            // 2) Email igual a uma conta existente → auto-vincula
            if (!account && profile.email && profile.emailVerified) {
                account = await DashboardAccountService.getDashboardAccountByEmail(profile.email).catch(() => null);
                if (account) {
                    await DashboardAccountService.linkOAuthProvider(account.accountId, provider.name, {
                        providerId: profile.providerId,
                        linkedAt: new Date()
                    });
                }
            }

            // 3) Cria conta nova
            let isNewAccount = false;
            if (!account) {
                const [firstName, ...rest] = (profile.username || 'Usuário').split(' ');
                account = await DashboardAccountService.createOAuthAccount({
                    email: profile.email || `${provider.name}-${profile.providerId}@no-email.luminasink.com`,
                    firstName: firstName || 'Usuário',
                    lastName: rest.join(' ') || provider.name,
                    emailVerified: !!profile.emailVerified,
                    provider: provider.name,
                    providerId: profile.providerId,
                    registrationIp: req.ip,
                    registrationUserAgent: req.headers['user-agent'],
                    registrationCountry: req.headers['cf-ipcountry'] || ''
                });
                isNewAccount = true;
            }

            await updateDiscordLegacyFields(account.accountId);

            const jwtToken = issueJwt(account);
            const redirectUrl = new URL(`${state.origin}/oauth/complete`);
            redirectUrl.hash = `token=${jwtToken}&isNewAccount=${isNewAccount}&hasPassword=${!!account.password}`;
            return res.redirect(redirectUrl.toString());

        } catch (err) {
            console.error(`Erro no callback OAuth2 (${req.params.provider}):`, err);
            return res.redirect(`${state.origin}/login?oauthError=server_error`);
        }
    }
};
