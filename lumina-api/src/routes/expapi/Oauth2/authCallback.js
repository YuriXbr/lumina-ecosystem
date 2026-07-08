const jwt = require('jsonwebtoken');
const { getProvider } = require('../../../oauthProviders');
const { isAllowedOrigin, verifyState } = require('../../../oauthProviders/state');
const DashboardAccountService = require('../../../database/services/DashboardAccountService');
const { addLog, routeError } = require('../../../logger/logger');

const ROUTE = 'GET /expapi/oauth2/:provider/auth/callback';
const STATE_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutos

/**
 * Callback OAuth2. Trata três intents (definidos em authStart):
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
            if (intent === 'link') {
                if (!state.linkAccountId) {
                    return res.redirect(`${state.origin}/oauth/complete?oauthError=link_no_account`);
                }

                const account = await DashboardAccountService.getDashboardAccountByAccountId(state.linkAccountId).catch(() => null);
                if (!account) {
                    return res.redirect(`${state.origin}/oauth/complete?oauthError=link_account_not_found`);
                }

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

                addLog('API', 'oauth.link', `Conta ${account.accountId} vinculou ${provider.name}`);

                const jwtToken = issueJwt(account);
                const redirectUrl = new URL(`${state.origin}/oauth/complete`);
                redirectUrl.hash = `token=${jwtToken}&isNewAccount=false&hasPassword=${!!account.password}&linkedDiscord=true`;
                return res.redirect(redirectUrl.toString());
            }

            // ── REGISTER ────────────────────────────────────────────────────────────────
            if (intent === 'register') {
                let account = await DashboardAccountService.getDashboardAccountByProviderId(
                    provider.name, profile.providerId
                ).catch(() => null);

                if (!account) {
                    if (profile.email) {
                        const existingByEmail = await DashboardAccountService.getDashboardAccountByEmail(profile.email).catch(() => null);
                        if (existingByEmail) {
                            return res.redirect(`${state.origin}/register?oauthError=email_exists`);
                        }
                    }

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

                    addLog('API', 'oauth.register', `Nova conta criada via ${provider.name}: ${account.accountId}`);

                    const jwtToken = issueJwt(account);
                    const redirectUrl = new URL(`${state.origin}/oauth/complete`);
                    redirectUrl.hash = `token=${jwtToken}&isNewAccount=true&hasPassword=false`;
                    return res.redirect(redirectUrl.toString());
                }

                await updateDiscordLegacyFields(account.accountId);
                addLog('API', 'oauth.register', `Login via ${provider.name} (conta existente): ${account.accountId}`);
                const jwtToken = issueJwt(account);
                const redirectUrl = new URL(`${state.origin}/oauth/complete`);
                redirectUrl.hash = `token=${jwtToken}&isNewAccount=false&hasPassword=${!!account.password}`;
                return res.redirect(redirectUrl.toString());
            }

            // ── LOGIN (padrão) ──────────────────────────────────────────────────────────
            let account = await DashboardAccountService.getDashboardAccountByProviderId(
                provider.name, profile.providerId
            ).catch(() => null);

            if (!account && profile.email && profile.emailVerified) {
                account = await DashboardAccountService.getDashboardAccountByEmail(profile.email).catch(() => null);
                if (account) {
                    await DashboardAccountService.linkOAuthProvider(account.accountId, provider.name, {
                        providerId: profile.providerId,
                        linkedAt: new Date()
                    });
                }
            }

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
            addLog('API', 'oauth.login', `Login via ${provider.name}: ${account.accountId} (nova=${isNewAccount})`);

            const jwtToken = issueJwt(account);
            const redirectUrl = new URL(`${state.origin}/oauth/complete`);
            redirectUrl.hash = `token=${jwtToken}&isNewAccount=${isNewAccount}&hasPassword=${!!account.password}`;
            return res.redirect(redirectUrl.toString());

        } catch (err) {
            addLog('API', 'oauth.callback.error', `${req.params.provider}/${intent} → ${err.message}`);
            // Redireciona ao invés de JSON (fluxo OAuth sempre retorna ao frontend via redirect)
            const fallbackOrigin = state?.origin || 'https://bot.luminasink.com';
            return res.redirect(`${fallbackOrigin}/login?oauthError=server_error`);
        }
    }
};
