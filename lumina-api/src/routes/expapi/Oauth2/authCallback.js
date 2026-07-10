const jwt = require('jsonwebtoken');
const { getProvider } = require('../../../oauthProviders');
const { isAllowedOrigin, verifyState } = require('../../../oauthProviders/state');
const DashboardAccountService = require('../../../database/services/DashboardAccountService');
const { addLog, routeError } = require('../../../logger/logger');
const { validateUsername, validateDisplayName, normalizeUsername } = require('../../../utils/identityValidation');
const { setAuthCookie } = require('../../../utils/authHelpers');

const ROUTE = 'GET /expapi/oauth2/:provider/auth/callback';
const STATE_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutos

/**
 * Callback OAuth2. Trata três intents (definidos em authStart):
 *   link     — vincula o Discord à conta do usuário já logado (pelo accountId no state)
 *   register — cria conta nova; se o email já existir redireciona com erro
 *   login    — entra na conta existente ou cria uma nova automaticamente
 *
 * Para contas novas criadas via Discord, usa username global do Discord como
 * username da conta (se disponível e válido) e o username como displayName.
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
        } catch (providerErr) {
            addLog('API', 'oauth.callback.invalidprovider', `Provedor inválido: ${req.params.provider}`);
            return res.status(404).send('Provedor OAuth2 não suportado.');
        }

        const { code, state: rawState, error } = req.query;

        // verifyState pode lançar — captura aqui
        let state;
        try {
            state = verifyState(rawState);
        } catch (stateErr) {
            addLog('API', 'oauth.callback.statefail', `verifyState falhou: ${stateErr.message}`);
            return res.status(400).send('Estado inválido. Tente novamente.');
        }

        if (!state || Date.now() - state.issuedAt > STATE_MAX_AGE_MS) {
            return res.status(400).send('Estado inválido ou expirado. Tente novamente.');
        }
        if (!isAllowedOrigin(state.origin)) {
            addLog('API', 'oauth.callback.badorigin', `Origin rejeitada: ${state.origin}`);
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

            // ─── Helper: atualiza campos Discord + username/displayName se for nova conta ───
            const updateDiscordLegacyFields = async (accountId, opts = {}) => {
                if (provider.name !== 'discord') return;
                const updateSet = {
                    discordOauth2Id: profile.providerId,
                    discordOauth2Token: tokens.accessToken,
                    discordOauth2RefreshToken: tokens.refreshToken,
                    discordOauth2TokenExpiresAt: new Date(Date.now() + (tokens.expiresIn || 3600) * 1000),
                    discordOauth2TokenScope: tokens.scope || '',
                    discordOauth2TokenType: tokens.tokenType || 'Bearer',
                    discordOauth2TokenRequestDate: new Date(),
                    discordOauth2TokenRequestIp: req.ip,
                };

                // Para novas contas, tenta usar username/displayName do Discord
                if (opts.isNewAccount && profile.username) {
                    const candidateUsername = String(profile.username).slice(0, 16);
                    const v = validateUsername(candidateUsername);
                    if (v.valid) {
                        // Verifica disponibilidade
                        const available = await DashboardAccountService.isUsernameAvailable(candidateUsername, accountId);
                        if (available) {
                            updateSet.username = candidateUsername;
                            updateSet.usernameLower = normalizeUsername(candidateUsername);
                            updateSet.usernameChangedAt = new Date();
                        }
                    }
                    // displayName sempre definido (mesmo se username falhar)
                    const candidateDisplay = String(profile.username).slice(0, 32);
                    const dv = validateDisplayName(candidateDisplay);
                    if (dv.valid) {
                        updateSet.displayName = candidateDisplay;
                        updateSet.displayNameChangedAt = new Date();
                    }
                }

                await DashboardAccountService.update(
                    { accountId },
                    { $set: updateSet }
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

            // ─── Helper: cancela exclusão agendada + atualiza lastLogin ────────
            const postLoginBookkeeping = async (account) => {
                if (account.deletionRequestedAt) {
                    try {
                        await DashboardAccountService.cancelAccountClosure(account.accountId);
                        addLog('API', 'account.close.cancelled', `Exclusão cancelada por login OAuth: ${account.email}`);
                    } catch (closeErr) {
                        addLog('DB', 'oauth.cancelclose.fail', `Falha ao cancelar exclusão: ${closeErr.message}`);
                    }
                }
                try {
                    await DashboardAccountService.update({ accountId: account.accountId }, {
                        $set: {
                            lastLogin: new Date(),
                            lastLoginIp: req.ip || '',
                            lastLoginUserAgent: req.headers['user-agent'] || '',
                        }
                    });
                } catch (updateErr) {
                    addLog('DB', 'oauth.lastlogin.fail', `Falha ao atualizar lastLogin: ${updateErr.message}`);
                }
            };

            // ── LINK ────────────────────────────────────────────────────────────────────
            if (intent === 'link') {
                if (!state.linkAccountId) {
                    return res.redirect(`${state.origin}/oauth/complete?oauthError=link_no_account`);
                }

                // Audit #2: previne hijack do fluxo de link. O state contém
                // o linkAccountId (definido em authStart a partir do cookie do
                // usuário autenticado), mas um atacante que conseguisse forjar
                // o state ainda poderia tentar vincular Discord à conta de
                // outra pessoa. Para fechar essa janela, exigimos que o cookie
                // lumina_token desta requisição pertença à MESMA conta que o
                // state diz que está sendo vinculada. Sem cookie válido OU
                // com cookie de outra conta → rejeita com link_no_account.
                const { verifyRequestAuth } = require('../../../utils/authHelpers');
                const { user: cookieUser, error: cookieErr } = verifyRequestAuth(req);
                if (cookieErr || !cookieUser || cookieUser.accountId !== state.linkAccountId) {
                    addLog('API', 'oauth.link.hijack', `Cookie/accountId mismatch no link flow (state=${state.linkAccountId}, cookie=${cookieUser?.accountId || 'none'})`);
                    return res.redirect(`${state.origin}/oauth/complete?oauthError=link_no_account`);
                }

                const account = await DashboardAccountService.getDashboardAccountByAccountId(state.linkAccountId).catch(e => {
                    addLog('DB', 'oauth.link.fetchaccount.fail', e.message);
                    return null;
                });
                if (!account) {
                    return res.redirect(`${state.origin}/oauth/complete?oauthError=link_account_not_found`);
                }

                const existingByProvider = await DashboardAccountService.getDashboardAccountByProviderId(
                    provider.name, profile.providerId
                ).catch(e => {
                    addLog('DB', 'oauth.link.fetchprovider.fail', e.message);
                    return null;
                });
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
                setAuthCookie(res, jwtToken);
                const redirectUrl = new URL(`${state.origin}/oauth/complete`);
                redirectUrl.hash = `isNewAccount=false&hasPassword=${!!account.password}&linkedDiscord=true`;
                return res.redirect(redirectUrl.toString());
            }

            // ── REGISTER ────────────────────────────────────────────────────────────────
            if (intent === 'register') {
                let account = await DashboardAccountService.getDashboardAccountByProviderId(
                    provider.name, profile.providerId
                ).catch(e => {
                    addLog('DB', 'oauth.register.fetchprovider.fail', e.message);
                    return null;
                });

                if (!account) {
                    if (profile.email) {
                        const existingByEmail = await DashboardAccountService.getDashboardAccountByEmail(profile.email).catch(e => {
                            addLog('DB', 'oauth.register.fetchemail.fail', e.message);
                            return null;
                        });
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

                    if (!account) {
                        addLog('API', 'oauth.register.createfail', `createOAuthAccount retornou null para ${profile.providerId}`);
                        return res.redirect(`${state.origin}/register?oauthError=server_error`);
                    }

                    await updateDiscordLegacyFields(account.accountId, { isNewAccount: true });

                    addLog('API', 'oauth.register', `Nova conta criada via ${provider.name}: ${account.accountId}`);

                    const jwtToken = issueJwt(account);
                setAuthCookie(res, jwtToken);
                    const redirectUrl = new URL(`${state.origin}/oauth/complete`);
                    redirectUrl.hash = `isNewAccount=true&hasPassword=false`;
                    return res.redirect(redirectUrl.toString());
                }

                // Conta já existia — login normal (com ban check)
                if (account.banned)
                    return res.redirect(`${state.origin}/login?oauthError=account_banned`);
                if (account.blocked)
                    return res.redirect(`${state.origin}/login?oauthError=account_blocked`);
                await updateDiscordLegacyFields(account.accountId);
                await postLoginBookkeeping(account);
                addLog('API', 'oauth.register', `Login via ${provider.name} (conta existente): ${account.accountId}`);
                const jwtToken = issueJwt(account);
                setAuthCookie(res, jwtToken);
                const redirectUrl = new URL(`${state.origin}/oauth/complete`);
                redirectUrl.hash = `isNewAccount=false&hasPassword=${!!account.password}`;
                return res.redirect(redirectUrl.toString());
            }

            // ── LOGIN (padrão) ──────────────────────────────────────────────────────────
            let account = await DashboardAccountService.getDashboardAccountByProviderId(
                provider.name, profile.providerId
            ).catch(e => {
                addLog('DB', 'oauth.login.fetchprovider.fail', e.message);
                return null;
            });

            // Ban check for existing accounts
            if (account && account.banned)
                return res.redirect(`${state.origin}/login?oauthError=account_banned`);
            if (account && account.blocked)
                return res.redirect(`${state.origin}/login?oauthError=account_blocked`);

            if (!account && profile.email && profile.emailVerified) {
                account = await DashboardAccountService.getDashboardAccountByEmail(profile.email).catch(e => {
                    addLog('DB', 'oauth.login.fetchemail.fail', e.message);
                    return null;
                });
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

                if (!account) {
                    addLog('API', 'oauth.login.createfail', `createOAuthAccount retornou null para ${profile.providerId}`);
                    return res.redirect(`${state.origin}/login?oauthError=server_error`);
                }

                isNewAccount = true;
                await updateDiscordLegacyFields(account.accountId, { isNewAccount: true });
            } else {
                await updateDiscordLegacyFields(account.accountId);
                await postLoginBookkeeping(account);
            }

            addLog('API', 'oauth.login', `Login via ${provider.name}: ${account.accountId} (nova=${isNewAccount})`);

            const jwtToken = issueJwt(account);
                setAuthCookie(res, jwtToken);
            const redirectUrl = new URL(`${state.origin}/oauth/complete`);
            redirectUrl.hash = `isNewAccount=${isNewAccount}&hasPassword=${!!account.password}`;
            return res.redirect(redirectUrl.toString());

        } catch (err) {
            addLog('API', 'oauth.callback.error', `${req.params.provider}/${intent} → ${err.message}\n${err.stack || ''}`);
            // Redireciona ao invés de JSON (fluxo OAuth sempre retorna ao frontend via redirect)
            const fallbackOrigin = state?.origin || 'https://bot.luminasink.com';
            return res.redirect(`${fallbackOrigin}/login?oauthError=server_error`);
        }
    }
};
