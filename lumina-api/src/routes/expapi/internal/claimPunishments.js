const {claimPunishments}=require('../../../utils/punishmentJobs');
module.exports={route:'/expapi/internal/punishments/claim',enabled:true,method:'post',internalKeyNeeded:true,
  async execute(req,res){return res.json({jobs:await claimPunishments()});},
};
