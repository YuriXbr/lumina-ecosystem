const {finishPunishment}=require('../../../utils/punishmentJobs');
module.exports={route:'/expapi/internal/punishments/finish',enabled:true,method:'post',internalKeyNeeded:true,
  async execute(req,res){
    if(typeof req.body?.success!=='boolean')return res.status(400).json({code:'INVALID_JOB_RESULT'});
    const job=await finishPunishment(req.body);
    return res.status(job?200:409).json({ok:!!job});
  },
};
