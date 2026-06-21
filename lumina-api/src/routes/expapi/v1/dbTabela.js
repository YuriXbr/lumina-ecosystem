// const { getTableData } = require('../../../src/database/db'); Function Deprecated.
//const {logApiCallError} = require('../../../src/logger/logger');

module.exports = {
    route: '/expapi/v1/db/:tabela',
    description: "Get table data",
    apiKeyNeeded: true,
    jwtNeeded: false,
    enabled: false,
    loginLimiterNeeded: false,
    csrfProtectionNeeded: false,
    method: 'get',

    async execute(req, res) {
        return res.status(404).send('This route is disabled. Deprecated!');
        // const { tabela } = req.params;
        // const where = req.query.where ? JSON.parse(req.query.where) : {};


        // try {
        //     const data = await getTableData(tabela, where);
        //     if (!data) {
        //         return res.status(404).send('Table not found.');
        //     }
        //     res.status(200).json(data);
        // } catch (error) {
        //     logApiCallError('API', 'getTableData', { tabela, where }, error.message);
        //     res.status(500).send('Error fetching data.');
        // }
    }
};



