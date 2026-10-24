const jwt = require('jsonwebtoken');
const { getProvider } = require('../../../oauthProviders');
const { isAllowedOrigin, verifyState } = require('../../../oauthProviders/state');
const DashboardAccountService = require('../../../database/services/DashboardAccountService');
const { addLog, routeError } = require('../../../logger/logger');
const { validateUsername, validateDisplayName, normalizeUsername } = require('../../../utils/identityValidation');
const { setAuthCookie, issueSessionToken } = require('../../../utils/authHelpers');

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

        if (!state || !Number.isFinite(state.issuedAt) || state.issuedAt > Date.now() + 30000 || Date.now() - state.issuedAt > STATE_MAX_AGE_MS || state.provider !== provider.name || typeof state.nonce !== 'string' || state.nonce !== req.cookies?.lumina_oauth) {
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
            if (!await require('../../../utils/sessionStore').consumeTransaction(state.nonce)) return res.status(400).send('Transação OAuth expirada ou já utilizada.');
            if(intent==='link'&&!state.linkAccountId)return res.redirect(`${state.origin}/oauth/complete?oauthError=link_no_account`);
            res.clearCookie('lumina_oauth', { path: '/expapi/oauth2/', httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
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
                    discordAvatar: profile.avatar || '',
                    discordOauth2Token: require('../../../utils/secretEncryption').encryptSecret(tokens.accessToken),
                    discordOauth2RefreshToken: require('../../../utils/secretEncryption').encryptSecret(tokens.refreshToken),
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

            const issueJwt = (account) => {
                if (account.banned || account.blocked) throw Object.assign(new Error('Conta suspensa'), { code: 'ACCOUNT_SUSPENDED' });
                return issueSessionToken(account);
            };
            const redirectSession = async (account, flags) => {
                const jwtToken = issueJwt(account);
                setAuthCookie(res, jwtToken);
                const browserKey = require('crypto').randomBytes(32).toString('base64url');
                const exchangeCode = await require('../../../utils/sessionStore').createExchange(jwtToken, state.origin, browserKey);
                res.cookie('lumina_oauth_exchange', browserKey, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 60000, path: '/expapi/v1/exchange-token' });
                const redirectUrl = new URL(`${state.origin}/oauth/complete`);
                redirectUrl.hash = new URLSearchParams({ code: exchangeCode, ...flags }).toString();
                res.setHeader('Cache-Control', 'no-store');
                res.setHeader('Referrer-Policy', 'no-referrer');
                return res.redirect(redirectUrl.toString());
            };

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
                const { verifyRequestAuthWithAccountCheck } = require('../../../utils/authHelpers');
                const { user: cookieUser, account, error: cookieErr } = await verifyRequestAuthWithAccountCheck(req);
                if (cookieErr || !cookieUser || cookieUser.accountId !== state.linkAccountId) {
                    addLog('API', 'oauth.link.hijack', `Cookie/accountId mismatch no link flow (state=${state.linkAccountId}, cookie=${cookieUser?.accountId || 'none'})`);
                    return res.redirect(`${state.origin}/oauth/complete?oauthError=link_no_account`);
                }

                if (!account || account.banned || account.blocked) return res.redirect(`${state.origin}/login?oauthError=account_blocked`);

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
                return await redirectSession(account, { isNewAccount: false, hasPassword: !!account.password, linkedDiscord: true });
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
                    return await redirectSession(account, { isNewAccount: true, hasPassword: false });
                }

                // Conta já existia — login normal (com ban check)
                if (account.banned)
                    return res.redirect(`${state.origin}/login?oauthError=account_banned`);
                if (account.blocked)
                    return res.redirect(`${state.origin}/login?oauthError=account_blocked`);
                await updateDiscordLegacyFields(account.accountId);
                await postLoginBookkeeping(account);
                addLog('API', 'oauth.register', `Login via ${provider.name} (conta existente): ${account.accountId}`);
                return await redirectSession(account, { isNewAccount: false, hasPassword: !!account.password });
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
                if (account && (account.banned || account.blocked)) return res.redirect(`${state.origin}/login?oauthError=account_blocked`);
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
            return await redirectSession(account, { isNewAccount, hasPassword: !!account.password });

        } catch (err) {
            addLog('API', 'oauth.callback.error', `${req.params.provider}/${intent} → ${err.message}\n${err.stack || ''}`);
            // Redireciona ao invés de JSON (fluxo OAuth sempre retorna ao frontend via redirect)
            const fallbackOrigin = state?.origin || 'https://bot.luminasink.com';
            return res.redirect(`${fallbackOrigin}/login?oauthError=server_error`);
        }
    }
};
