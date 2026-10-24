const rateLimit = require('express-rate-limit');
const crypto = require('crypto');


async function checkAuth(req, res, next) {
    // Usa o helper centralizado que aceita cookie httpOnly OU header Bearer
    const { verifyRequestAuthWithAccountCheck } = require('./src/utils/authHelpers');
    const { user, error } = await verifyRequestAuthWithAccountCheck(req);
    if (error) {
        return res.status(error.status).json({ error: error.message, code: error.code });
    }
    req.user = user;
    next();
}

const { ipRateLimiter } = require('./src/utils/ipRateLimiter');
const loginLimiter = ipRateLimiter({ max: 5, windowMs: 60000 });
const registerLimiter = ipRateLimiter({ max: 3, windowMs: 3600000 });

const internalKeyCheck = (req, res, next) => {
    const internalKey = req.headers['internal-key'] || '';
    const expected = process.env.INTERNAL_API_KEY || '';

    const valid =
        expected.length > 0 &&
        internalKey.length === expected.length &&
        crypto.timingSafeEqual(Buffer.from(internalKey), Buffer.from(expected));

    if (!valid) {
        return res.status(401).json({ error: 'Invalid or missing internal key.' });
    }
    next();
};

module.exports = {
    checkAuth,
    internalKeyCheck,
    loginLimiter,
    registerLimiter
};
