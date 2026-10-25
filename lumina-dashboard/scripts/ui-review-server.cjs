'use strict';
// Isolated visual fixtures. Binds only to loopback and is never imported by the app.
const http = require('http');
const base = 'http://127.0.0.1:5180';
const guildId='771421826974089236';
const user = {accountId:'visual-review',email:'review@example.test',firstName:'Conta',lastName:'de revisão',displayName:'Conta de revisão',username:'revisao',accessType:'user',hasPassword:true,emailVerified:true,discordOauth2Id:'123456789012345678',id:'123456789012345678',avatar:'',publicProfile:true,language:'pt-BR',authProviders:['discord'],discordOauth2TokenScope:'identify email guilds guilds.members.read'};
const inventory={keys:5,hextechChests:3,masterWorkChests:1,skins:[],dailyRewardStreak:1};
const modes=['anonymous','linked','unlinked','unverified','admin','empty','cooldown','failure','slow','admin-empty','admin-failure','admin-slow'];
const skins=[{id:1000,name:'Annie',championId:'Annie',championName:'Annie',rarity:'kNoRarity',isBase:true},{id:1001,name:'Annie Gótica',championId:'Annie',championName:'Annie',rarity:'kLegacy'},{id:1001,name:'Annie Gótica',championId:'Annie',championName:'Annie',rarity:'kLegacy'}];
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1:3199');
 const mode=decodeURIComponent(/lumina_review=([^;]+)/.exec(req.headers.cookie||'')?.[1]||'anonymous');
 const empty=mode==='empty'||mode==='admin-empty';
 if(url.pathname==='/email-preview'){res.setHeader('Content-Type','text/html;charset=utf-8');res.end(require('fs').readFileSync(require('path').resolve(__dirname,'../../docs/remediacao-2026-10-22/email-preview.html')));return;}
 if(url.pathname==='/') {res.setHeader('Content-Type','text/html;charset=utf-8');res.end(`<h1>Lumina · revisão visual com dados simulados</h1><p>Sem acesso ao MongoDB, Discord ou produção.</p>${modes.map(m=>`<p><a href="/scenario?mode=${m}">${m}</a></p>`).join('')}`);return;}
 if(url.pathname==='/scenario'&&modes.includes(url.searchParams.get('mode'))) {res.setHeader('Set-Cookie',`lumina_review=${url.searchParams.get('mode')}; Path=/; SameSite=Lax`);res.writeHead(302,{Location:base+'/members'});res.end();return;}
 if(req.headers.origin&&req.headers.origin!==base) {res.writeHead(403);res.end();return;}
 res.setHeader('Access-Control-Allow-Origin',base);res.setHeader('Access-Control-Allow-Credentials','true');res.setHeader('Access-Control-Allow-Headers','Content-Type,X-CSRF-Token,traceparent');res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,DELETE,OPTIONS');res.setHeader('Cache-Control','no-store');
 if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
 res.setHeader('Content-Type','application/json');
 const send=(data,status=200)=>{res.writeHead(status);res.end(JSON.stringify(data));};
 const p=url.pathname;
 if(mode==='slow'||mode==='admin-slow')await new Promise(r=>setTimeout(r,3000));
 if(p.endsWith('/csrf-token'))return send({csrfToken:'visual-review-only'});
 if(mode==='admin-failure'&&p.includes('/admin/'))return send({error:'Falha administrativa simulada.'},503);
 if(p.endsWith('/admin/bot-console'))return send({events:url.searchParams.has('cursor')?[]:[{id:'visual-event',level:'info',message:'[SIMULAÇÃO] Bot conectado. 42 servidores sincronizados.',timestamp:new Date().toISOString()},{id:'visual-warning',level:'warning',message:'[SIMULAÇÃO] Exemplo de aviso operacional.',timestamp:new Date().toISOString()}],cursor:'visual-warning',workers:empty?[]:[{workerId:'simulated-worker',guildCount:42,pingMs:36,memoryMb:68.5,uptimeSeconds:7200}],commands:[{requestId:'simulated-diagnostic',command:'status',state:'completed',output:'[SIMULAÇÃO] Bot online · 42 servidores'}],pollAfterMs:5000});
 if(p.endsWith('/admin/bot-console/commands'))return send({requestId:'simulated-command',state:'pending'},202);
 if(p.endsWith('/session'))return send(mode==='failure'?{error:'Falha de conexão simulada.'}:{authenticated:mode!=='anonymous',user:{...user,emailVerified:mode!=='unverified',accessType:mode.startsWith('admin')?'admin':'user',authProviders:mode==='unlinked'?[]:user.authProviders,discordOauth2TokenScope:mode==='unlinked'?'':user.discordOauth2TokenScope,discordOauth2Id:mode==='unlinked'?'':user.id,id:mode==='unlinked'?'':user.id}},mode==='failure'?503:200);
 if(mode==='failure')return send({error:'Falha de conexão simulada. Tente novamente.'},503);
 if(p.endsWith('/news'))return send({posts:empty?[]:[{id:'visual-news',title:'Revisão visual do Lumina',body:'Este conteúdo é simulado para revisar o layout e os estados da interface.',excerpt:'Dados isolados para revisão.',tag:'atualizacao',pinned:true,publishedAt:new Date().toISOString()}],total:1});
 if(p.endsWith('/my-guilds')&&mode==='unlinked')return send({code:'DISCORD_NOT_LINKED',error:'Conecte sua conta Discord nas Configurações.'},400);
 if(p.endsWith('/my-guilds'))return send({guilds:empty?[]:[{id:guildId,name:'Lumina Bot · simulação',hasBot:true,canManage:true,botConfig:{prefix:'l!',memberCount:42}},{id:'123456789012345679',name:'Servidor sem permissão · simulação',hasBot:true,canManage:false},{id:'123456789012345680',name:'Adicionar bot · simulação',hasBot:false,canManage:true}]});
 if(p.endsWith('/admin/users')){const all=Array.from({length:13},(_,i)=>({accountId:'review-account-'+i,email:`member${i}@example.test`,firstName:i===3?null:'Membro',lastName:i===3?null:String(i),accessType:'user',emailVerified:true,lastLogin:null,blocked:false,banned:false}));const page=Number(url.searchParams.get('page')||1),limit=Number(url.searchParams.get('limit')||10);return send({users:empty?[]:all.slice((page-1)*limit,page*limit),pagination:{page,limit,hasMore:!empty&&page*limit<all.length}});}
 if(p.endsWith('/admin/guilds')){const all=Array.from({length:13},(_,i)=>({guildId:String(BigInt(guildId)+BigInt(i)),guildName:'Servidor de revisão '+i,memberCount:42,configured:true,botEnabled:true,welcomeEnabled:false,musicEnabled:false,moderationEnabled:false,prefix:'l!',language:'pt-BR'}));const page=Number(url.searchParams.get('page')||1),limit=Number(url.searchParams.get('limit')||10);return send({guilds:empty?[]:all.slice((page-1)*limit,page*limit),pagination:{page,limit,total:all.length,hasMore:!empty&&page*limit<all.length}});}
 if(p.includes('/guilds/')||p.includes('/discord/guild/'))return send({guild:{id:guildId,name:'Lumina Bot · simulação',canManage:true,hasBot:true},id:guildId,name:'Lumina Bot · simulação',canManage:true,hasBot:true,botConfig:{prefix:'l!',guildLocale:'pt-BR',language:'pt-BR',memberCount:42,gachaEnabled:true,chestsEnabled:true,gachaRollsRefreshInterval:3600000,maxRolls:10,commandsEnabled:{},blockedUsers:[],blockedRoles:[],blockedChannels:[],autoMessages:[]},channels:[{id:'123456789012345681',name:'comandos',type:0}],roles:[]});
 if(p.endsWith('/myinventory'))return send(mode==='unlinked'?{error:'Vincule sua conta Discord.'}:{...inventory,dailyRewardAvailable:mode!=='cooldown',nextDailyReward:mode==='cooldown'?new Date(Date.now()+3600000).toISOString():null},mode==='unlinked'?400:200);
 if(p.endsWith('/fetchuserskins'))return send(empty?[]:skins);
 if(p.endsWith('/dailyreward'))return send({claimed:true,reward:{hextechChests:3,keys:1},streak:2,nextDailyReward:new Date(Date.now()+86400000).toISOString()});
 if(p.endsWith('/rollskin'))return send({skinId:1001,skinName:'Annie Gótica · simulação',championId:'Annie',championName:'Annie',rarity:'legacy'});
 if(p.endsWith('/email-code/request'))return send({ok:true,message:'Simulação: use ABCD2345 para revisar a confirmação.',expiresInSeconds:900},202);
 if(p.endsWith('/email-code/confirm'))return send({ok:true,message:'Código confirmado na simulação.'});
 if(p.endsWith('/email-code/reject'))return send({ok:true,blockedUntil:new Date(Date.now()+86400000).toISOString()});
 if(p.includes('/badges'))return send({badges:[]});
 if(p.endsWith('/getusersettings')||p.includes('/user/settings'))return send({settings:user,...user});
 if(p.includes('/public-profile/')||p.includes('/profile/'))return send({...user,badges:[]});
 if(p.endsWith('/logout')){res.setHeader('Set-Cookie','lumina_review=anonymous; Path=/; SameSite=Lax');return send({ok:true});}
 if(p.includes('/admin/'))return send({accounts:[],users:[],guilds:[],logs:[],badges:[],posts:[],total:0,uptimeSeconds:600,totalRequests:20,totalErrors:0,errorRate:0,routes:[],recentErrors:[],memory:{}});
 return send({error:'Estado não configurado na simulação.',code:'FIXTURE_NOT_FOUND'},404);
});
server.listen(3199,'127.0.0.1',()=>console.log('Visual fixtures: http://127.0.0.1:3199 (simulated data only)'));
