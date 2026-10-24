'use strict';
const {snapshot}=require('../../../../utils/botConsole');
const {consoleAdmin,consoleError}=require('../../../../utils/consoleAdmin');
module.exports={route:'/expapi/v1/admin/bot-console',enabled:true,method:'get',
 async execute(req,res){try{if(!await consoleAdmin(req,res))return;return res.json(await snapshot(req.query.cursor));}catch(error){return consoleError(res,error);}}
};
