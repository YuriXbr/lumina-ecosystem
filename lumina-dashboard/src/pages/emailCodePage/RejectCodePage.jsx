import { useEffect,useState } from 'react';
import { Link } from 'react-router-dom';
import { apiPost } from '../../utils/apiFetch';
export default function RejectCodePage() {
 const [token]=useState(()=>new URLSearchParams(window.location.hash.slice(1)).get('token')||'');
 const [busy,setBusy]=useState(false),[done,setDone]=useState(false),[error,setError]=useState(''),[until,setUntil]=useState(null);
 useEffect(()=>{window.history.replaceState(null,'',window.location.pathname);},[]);
 const confirm=async()=>{setBusy(true);setError('');try{const result=await apiPost('expapi/v1/account/email-code/reject',{token});setUntil(result.blockedUntil);setDone(true);}catch(err){setError(err.message);}finally{setBusy(false);}};
 return <main className="lumina-auth"><div className="lumina-card max-w-md w-full p-6 sm:p-8 space-y-5"><p className="text-xs font-semibold uppercase tracking-widest text-purple-700">Segurança da conta</p><h1 className="text-2xl font-bold text-gray-900">{done?'Solicitação cancelada':'Não solicitou este código?'}</h1>
  {done?<p role="status" className="text-sm text-gray-600">O código foi invalidado. Novos códigos de verificação e recuperação estão bloqueados até {new Date(until).toLocaleString('pt-BR')}. A senha atual continua funcionando.</p>:<><p className="text-sm text-gray-600">Confirme para invalidar o código imediatamente e bloquear novos pedidos de verificação de email e redefinição de senha por 24 horas.</p><p className="text-sm text-gray-600">Essa ação não altera sua senha nem impede o login com a senha atual.</p>{token?<button className="lumina-button w-full" onClick={confirm} disabled={busy}>{busy?'Cancelando…':'Cancelar código e bloquear por 24 horas'}</button>:<p role="alert" className="text-sm text-red-700">Abra esta página pelo botão recebido no email.</p>}</>}
  {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}<Link className="block text-sm text-purple-700 font-medium" to="/login">Voltar para entrar</Link><a className="block text-xs text-gray-500" href="mailto:suporte@luminasink.com">Precisa de ajuda? suporte@luminasink.com</a>
 </div></main>;
}
