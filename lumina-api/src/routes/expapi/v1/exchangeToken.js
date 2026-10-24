'use strict';
const { consumeExchange } = require('../../../utils/sessionStore');
const { setAuthCookie, verifyRequestAuthWithAccountCheck } = require('../../../utils/authHelpers');
const { accountDto } = require('../../../utils/accountDto');
const { isAllowedOrigin } = require('../../../config/allowedOrigins');
module.exports = {
  route: '/expapi/v1/exchange-token', method: 'post', enabled: true,
  async execute(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    const origin = req.headers.origin;
    const code = req.body?.code;
    const browserKey = req.cookies?.lumina_oauth_exchange;
    if (!isAllowedOrigin(origin) || typeof code !== 'string' || !/^[\w-]{43}$/.test(code) || !browserKey) return res.status(400).json({ code: 'INVALID_EXCHANGE', error: 'Transação inválida. Inicie o login novamente.' });
    try {
      const exchange = await consumeExchange(code, origin, browserKey);
      if (!exchange) return res.status(401).json({ code: 'EXCHANGE_EXPIRED', error: 'Código expirado ou já utilizado.' });
      const authReq = { headers: { authorization: `Bearer ${exchange.token}` }, cookies: {} };
      const { account, error } = await verifyRequestAuthWithAccountCheck(authReq);
      if (error) return res.status(error.status).json({ code: error.code, error: error.message });
      setAuthCookie(res, exchange.token);
      res.clearCookie('lumina_oauth_exchange', { path: '/expapi/v1/exchange-token', secure: process.env.NODE_ENV === 'production', sameSite: 'lax', httpOnly: true });
      return res.json({ ok: true, user: accountDto(account) });
    } catch { return res.status(503).json({ code: 'EXCHANGE_UNAVAILABLE', error: 'Login temporariamente indisponível.' }); }
  },
};
