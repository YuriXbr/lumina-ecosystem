//const {writeTableData} = require('../../../src/database/db'); Function Deprecated.
//const {logApiCallError} = require('../../../src/logger/logger');

module.exports = {
    route: '/expapi/v1/db/update/:tabela/:item/:primarykey',
    description: "Get Info from a database table",
    apiKeyNeeded: true,
    jwtNeeded: false,
    enabled: false,
    loginLimiterNeeded: false,
    csrfProtectionNeeded: false,
    method: 'post',

    async execute(req, res) {
        return res.status(404).send('This route is disabled. Deprecated!');
        // const { tabela, item, primarykey } = req.params;
        // const newData = req.body;

        // try {
        //     const result = await writeTableData(tabela, item, newData, primarykey);
        //     if (!result) {
        //         return res.status(404).send('Table or item not found.');
        //     }
        //     res.status(200).send('Data updated successfully.');
        // } catch (error) {
        //     logApiCallError('API', 'writeTableData', { tabela, item, newData, primarykey }, error.message);
        //     res.status(500).send('Error updating data.');
        // }
    }
};