const InventoryService = require('../../../database/services/UserInventoryService');
const { routeError }   = require('../../../logger/logger');

const ROUTE = 'POST /expapi/internal/addinventory';

module.exports = {
    route: '/expapi/internal/addinventory',
    description: "Add item to user inventory",
    apiKeyNeeded: false, 
    internalKeyNeeded: true, 
    jwtNeeded: false,
    enabled: true, 
    loginLimiterNeeded: false, 
    csrfProtectionNeeded: false,
    checkAuthNeeded: false, 
    method: 'post',

    async execute(req, res) {
        const { userId, item, amount } = req.body;
        const ALLOWED_ITEMS = ['hextechChests', 'masterWorkChests', 'keys'];
    if (!userId || !item || !amount)
        return res.status(400).json({ error: 'Parâmetros userId, item e amount são obrigatórios.', code: 'MISSING_PARAMS' });
    if (!ALLOWED_ITEMS.includes(item))
        return res.status(400).json({ error: `Item inválido. Permitidos: ${ALLOWED_ITEMS.join(', ')}`, code: 'INVALID_ITEM' });
    const qty = Number(amount);
    if (!Number.isFinite(qty) || qty <= 0 || qty > 10000)
        return res.status(400).json({ error: 'Quantidade deve ser um número entre 1 e 10000.', code: 'INVALID_AMOUNT' });
    if (false)
            return res.status(400).json({ error: 'Parámetros userId, item e amount são obrigatórios.', code: 'MISSING_PARAMS' });

        try {
            await InventoryService.addInventory(userId, item, amount);
            return res.status(200).json({ message: 'Inventário atualizado.' });
        } catch (error) {
            return routeError({ res, error, route: ROUTE, errorCode: 'ADD_INVENTORY_ERROR',
                userMsg: 'Erro ao atualizar inventário.', extra: { userId, item, amount } });
        }
    }
};
