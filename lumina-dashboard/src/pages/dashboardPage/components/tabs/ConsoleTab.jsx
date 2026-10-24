import {useEffect,useRef,useState} from 'react';
import {apiGetJson,apiPost} from '../../../../utils/apiFetch';
const DIAGNOSTICS={status:'Status',ping:'Latência',guilds:'Servidores',help:'Ajuda'};
const LEVELS={info:'Informação',warning:'Avisos',error:'Erros',debug:'Depuração',success:'Sucesso',system:'Sistema'};
const COLORS={error:'text-red-300',warning:'text-amber-200',success:'text-emerald-300',system:'text-purple-200',debug:'text-gray-400',info:'text-gray-100'};
export default function ConsoleTab(){
 const [logs,setLogs]=useState([]),[workers,setWorkers]=useState([]),[jobs,setJobs]=useState([]);
 const [paused,setPaused]=useState(false),[filter,setFilter]=useState('all'),[command,setCommand]=useState('status');
 const [error,setError]=useState(''),[sending,setSending]=useState(false),[commandError,setCommandError]=useState(''),[loaded,setLoaded]=useState(false),[refresh,setRefresh]=useState(0);
 const cursor=useRef(null),output=useRef(null);
 useEffect(()=>{
  if(paused)return;
  let cancelled=false,timer,controller,failures=0;
  const schedule=ms=>{clearTimeout(timer);if(!cancelled&&!document.hidden)timer=setTimeout(poll,ms);};
  const poll=async()=>{
   if(cancelled||document.hidden)return;
   const requestController=new AbortController();controller=requestController;
   try{
    const data=await apiGetJson(`expapi/v1/admin/bot-console${cursor.current?'?cursor='+encodeURIComponent(cursor.current):''}`,{signal:requestController.signal});
    if(cancelled||requestController.signal.aborted||controller!==requestController)return;
    setLogs(prev=>{const known=new Set(prev.map(log=>log.id));return [...prev,...data.events.filter(log=>!known.has(log.id))].slice(-500);});
    cursor.current=data.cursor||cursor.current;setWorkers(data.workers);setJobs(data.commands);setLoaded(true);setError('');failures=0;
    schedule(data.hasMore?100:Math.max(5000,data.pollAfterMs||5000));
   }catch(err){
    if(cancelled||requestController.signal.aborted||controller!==requestController)return;
    setError(err.status===401?'Sua sessão expirou. Entre novamente.':err.status===403?'Sua conta não tem acesso ao console.':'Não foi possível atualizar o console. Tentaremos novamente.');
    if(err.status!==401&&err.status!==403)schedule(Math.min(60000,5000*2**++failures));
   }
  };
  const visibility=()=>{clearTimeout(timer);controller?.abort();if(!document.hidden)void poll();};
  document.addEventListener('visibilitychange',visibility);void poll();
  return()=>{cancelled=true;clearTimeout(timer);controller?.abort();document.removeEventListener('visibilitychange',visibility);};
 },[paused,refresh]);
 useEffect(()=>{if(output.current&&!paused)output.current.scrollTop=output.current.scrollHeight;},[logs,paused]);
 const submit=async event=>{
  event.preventDefault();setSending(true);setCommandError('');
  try{await apiPost('expapi/v1/admin/bot-console/commands',{command,requestId:crypto.randomUUID()});setRefresh(n=>n+1);}
  catch(err){setCommandError(err.message);}
  finally{setSending(false);}
 };
 const visible=logs.filter(log=>filter==='all'||log.level===filter);
 return <div className="space-y-6">
  <section className="lumina-card overflow-hidden" aria-labelledby="bot-console-title">
   <div className="p-4 sm:p-6 border-b border-gray-200 space-y-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
     <div><h2 id="bot-console-title" className="text-lg font-semibold text-gray-900">Console do Bot</h2><p className="text-sm text-gray-500 mt-1">Atualização a cada 5 segundos. Histórico de 24 horas.</p></div>
     <span role="status" className={`rounded-full px-3 py-1 text-xs font-medium ${paused?'bg-gray-100 text-gray-700':error?'bg-red-50 text-red-700':'bg-purple-50 text-purple-700'}`}>{paused?'Atualização pausada':error?'Atualização interrompida':loaded?'Console atualizado':'Carregando console…'}</span>
    </div>
    <div className="flex flex-wrap gap-2 items-center">
     <label className="text-sm text-gray-600">Filtrar mensagens <select className="ml-2 border border-gray-300 rounded-lg px-2 py-2 bg-white" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">Todas</option>{Object.entries(LEVELS).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
     <button className="lumina-button-secondary" onClick={()=>setPaused(value=>!value)}>{paused?'Retomar':'Pausar'}</button>
     <button className="lumina-button-secondary" disabled={paused} onClick={()=>setRefresh(n=>n+1)}>Atualizar</button>
     <button className="lumina-button-secondary" onClick={()=>setLogs([])}>Limpar exibição</button>
    </div>
   </div>
   {error&&<p role="alert" className="bg-red-50 text-red-800 text-sm p-4">{error}</p>}
   <div ref={output} role="region" aria-label="Mensagens do bot" aria-busy={!loaded&&!error} tabIndex={0} className="bg-gray-950 p-4 sm:p-6 h-80 overflow-auto font-mono text-xs sm:text-sm">
    {!visible.length&&<p className="text-gray-400">{!loaded&&!error?'Carregando mensagens…':logs.length?'Nenhuma mensagem corresponde ao filtro.':'Nenhuma mensagem nesta exibição. Novos eventos aparecerão quando o bot os enviar.'}</p>}
    {visible.map(log=><div key={log.id} className="flex items-start gap-3 py-1"><time className="text-gray-400 shrink-0" dateTime={log.timestamp}>{new Date(log.timestamp).toLocaleTimeString('pt-BR')}</time><p className={`min-w-0 break-words whitespace-pre-wrap ${COLORS[log.level]||COLORS.info}`}><span className="sr-only">{LEVELS[log.level]||'Informação'}: </span>{log.message}</p></div>)}
   </div>
   <form onSubmit={submit} className="p-4 sm:p-6 border-t border-gray-200 space-y-3">
    <p className="text-sm text-gray-600">Solicite um diagnóstico ao processo do bot. A resposta pode levar até 20 segundos; pedidos pendentes expiram em 2 minutos.</p>
    <div className="flex flex-wrap gap-3"><label className="flex-1 text-sm text-gray-700">Diagnóstico<select className="block w-full border border-gray-300 rounded-lg px-3 py-2 mt-1" value={command} onChange={e=>setCommand(e.target.value)}>{Object.entries(DIAGNOSTICS).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><button disabled={sending||!workers.length} className="lumina-button self-end">{sending?'Solicitando…':'Solicitar diagnóstico'}</button></div>
    {commandError&&<p role="alert" className="text-sm text-red-700">{commandError}</p>}
   </form>
  </section>
  <section className="lumina-card p-4 sm:p-6" aria-labelledby="bot-runtime-title">
   <h2 id="bot-runtime-title" className="font-semibold text-gray-900">Processo do bot</h2>
   <p className="mt-2 text-sm text-gray-600">{workers.length?'Conexão ativa confirmada por sinal recente do bot.':'Sem sinal recente do bot. Ele pode estar offline ou com a integração de console indisponível.'}</p>
   {workers.map(worker=><dl key={worker.workerId} className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4 text-sm">
    <div><dt className="text-gray-500">Servidores</dt><dd className="font-medium">{worker.guildCount}</dd></div>
    <div><dt className="text-gray-500">Gateway Discord</dt><dd className="font-medium">{Math.round(worker.pingMs)} ms</dd></div>
    <div><dt className="text-gray-500">Memória do bot</dt><dd className="font-medium">{worker.memoryMb.toFixed(1)} MB</dd></div>
    <div><dt className="text-gray-500">Tempo ativo</dt><dd className="font-medium">{Math.floor(worker.uptimeSeconds/60)} min</dd></div>
   </dl>)}
  </section>
  <section className="lumina-card p-4 sm:p-6" aria-labelledby="bot-jobs-title"><h2 id="bot-jobs-title" className="font-semibold text-gray-900 mb-3">Diagnósticos recentes</h2>
   {!jobs.length&&<p className="text-sm text-gray-500">Nenhum diagnóstico solicitado.</p>}
   <ul className="space-y-3">{jobs.map(job=><li key={job.requestId} className="rounded-lg border border-gray-200 p-3 text-sm"><div className="flex flex-wrap justify-between gap-2"><strong>{DIAGNOSTICS[job.command]||job.command}</strong><span className="text-gray-500">{{pending:'Aguardando o bot',running:'Processando',completed:'Concluído',failed:'Falhou',expired:'Expirado'}[job.state]||job.state}</span></div>{job.output&&<p className="mt-2 whitespace-pre-wrap break-words text-gray-700">{job.output}</p>}</li>)}</ul>
  </section>
 </div>;
}
