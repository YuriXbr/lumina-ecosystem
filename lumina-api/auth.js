const rateLimit = require('express-rate-limit');
const crypto = require('crypto');


async function checkAuth(req, res, next) {
    // Usa o helper centralizado que aceita cookie httpOnly OU header Bearer
    const { verifyRequestAuth } = require('./src/utils/authHelpers');
    const { user, error } = verifyRequestAuth(req);
    if (error) {
        return res.status(error.status).json({ error: error.message, code: error.code });
    }
    req.user = user;
    next();
}

const temp = 1*60*1000; // 1 minute in milliseconds
const loginLimiter = process.env.NODE_ENV === 'test'
    ? (req, res, next) => next()  // Em teste: sem throttle para não gerar 429 espúrios
    : rateLimit({
        windowMs: temp,
        max: 5,
        message: `Too many login attempts from this IP, please try again after ${temp / 1000 / 60} minutes`,
        standardHeaders: true,
        legacyHeaders: false,
    });

const registerLimiter = process.env.NODE_ENV === 'test'
    ? (req, res, next) => next()  // Em teste: sem throttle
    : rateLimit({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 3, // Máximo 3 registros por hora por IP
        message: 'Too many registration attempts from this IP, please try again after 1 hour',
        standardHeaders: true,
        legacyHeaders: false,
    });

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