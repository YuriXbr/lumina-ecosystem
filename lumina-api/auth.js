const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');


async function checkAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(401).send('Access denied. No token provided.');
    }

    const token = authHeader.split(' ')[1]; // Extrai o token do formato "Bearer <token>"

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (ex) {
        res.status(400).send('Invalid token.');
    }
}

const temp = 1*60*1000; // 1 minute in milliseconds
const loginLimiter = rateLimit({
    windowMs: temp, 
    max: 5, 
    message: `Too many login attempts from this IP, please try again after ${temp / 1000 / 60} minutes`,
    standardHeaders: true,
    legacyHeaders: false,
});

const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Máximo 3 registros por hora por IP
    message: 'Too many registration attempts from this IP, please try again after 1 hour',
    standardHeaders: true,
    legacyHeaders: false,
});

const internalKeyCheck = (req, res, next) => {
    const internalKey = req.headers['internal-key'];
    if (!internalKey || internalKey !== process.env.INTERNAL_API_KEY) {
        return res.status(401).send('Invalid or missing internal key.');
    }
    next();
};

module.exports = {
    checkAuth,
    internalKeyCheck,
    loginLimiter,
    registerLimiter
};