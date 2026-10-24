import { useEffect,useState } from 'react';
import { Link,useLocation } from 'react-router-dom';
import { apiPost } from '../../utils/apiFetch';
import { useUser } from '../../contexts/UserContext';
export default function EmailCodePage({purpose='verify'}) {
  const location=useLocation();const {user,refreshUser}=useUser();
  const [email,setEmail]=useState(location.state?.email||user?.email||'');
  const [sent,setSent]=useState(!!location.state?.sent);const [code,setCode]=useState('');const [password,setPassword]=useState('');const [confirmation,setConfirmation]=useState('');
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[done,setDone]=useState(false),[cooldown,setCooldown]=useState(0);
  useEffect(()=>{if(cooldown>0){const timer=setTimeout(()=>setCooldown(n=>n-1),1000);return()=>clearTimeout(timer);}},[cooldown]);
  const request=async e=>{
    e.preventDefault();setBusy(true);setError('');setMessage('');
    try {const result=await apiPost('expapi/v1/account/email-code/request',{email,purpose});setSent(true);setCode('');setCooldown(60);setMessage(result.message);}catch(err){setError(err.message);}finally{setBusy(false);}
  };
  const confirm=async e=>{
    e.preventDefault();setError('');setMessage('');
    if(purpose==='reset'&&password!==confirmation){setError('As senhas precisam ser iguais.');return;}
    setBusy(true);
    try {const result=await apiPost('expapi/v1/account/email-code/confirm',{email,purpose,code,...(purpose==='reset'?{newPassword:password}:{})});setCode('');setPassword('');setConfirmation('');setDone(true);setMessage(result.message);await refreshUser().catch(()=>{});}catch(err){setError(err.message);}finally{setBusy(false);}
  };
  return <main className="lumina-auth"><div className="lumina-card w-full max-w-md p-6 sm:p-8 space-y-6">
    <div><p className="text-xs uppercase tracking-widest text-purple-700 font-semibold mb-2">Segurança da conta</p><h1 className="text-2xl font-bold text-gray-900">{purpose==='verify'?'Confirme seu email':'Recupere sua conta'}</h1><p className="mt-2 text-sm text-gray-600">{purpose==='verify'?'Confirme o endereço usado no cadastro.':'Receba um código no email do cadastro para criar uma nova senha.'}</p></div>
    {error&&<p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {message&&<p role="status" className="rounded-lg border border-purple-200 bg-purple-50 p-3 text-sm text-purple-900">{message}</p>}
    {!done&&<>
      <form onSubmit={request} className="space-y-4"><label className="block"><span className="lumina-label">Email de cadastro</span><input className="w-full border border-gray-300 px-3 py-2" type="email" autoComplete="email" required maxLength={254} value={email} onChange={e=>{setEmail(e.target.value);setSent(false);setCode('');}} disabled={busy}/></label><button className="w-full lumina-button" disabled={busy||cooldown>0}>{busy?'Aguarde…':cooldown>0?`Reenviar em ${cooldown}s`:sent?'Reenviar código':'Enviar código'}</button></form>
      {sent&&<form onSubmit={confirm} className="space-y-4 border-t border-gray-200 pt-6"><p className="text-sm text-gray-500">O código tem 8 letras e números e vale por 15 minutos. Confira também o spam. São permitidas até 5 tentativas por código.</p><label className="block"><span className="lumina-label">Código de confirmação</span><input className="w-full border border-gray-300 px-3 py-3 text-center font-mono text-xl tracking-[.25em] uppercase" name="code" autoComplete="one-time-code" autoCapitalize="characters" spellCheck={false} pattern="[A-Za-z0-9]{8}" minLength={8} maxLength={8} required value={code} onChange={e=>setCode(e.target.value.replace(/[^a-zA-Z0-9]/g,'').toUpperCase())} disabled={busy}/></label>
      {purpose==='reset'&&<><label className="block"><span className="lumina-label">Nova senha</span><input className="w-full border border-gray-300 px-3 py-2" type="password" autoComplete="new-password" minLength={8} maxLength={72} required value={password} onChange={e=>setPassword(e.target.value)} disabled={busy}/></label><p className="text-xs text-gray-500">Use pelo menos 8 caracteres, com maiúscula, minúscula e número.</p><label className="block"><span className="lumina-label">Repita a nova senha</span><input className="w-full border border-gray-300 px-3 py-2" type="password" autoComplete="new-password" minLength={8} maxLength={72} required value={confirmation} onChange={e=>setConfirmation(e.target.value)} disabled={busy}/></label></>}
      <button className="w-full lumina-button" disabled={busy}>{busy?'Confirmando…':purpose==='verify'?'Confirmar email':'Redefinir senha'}</button></form>}
    </>}
    <Link to={done&&purpose==='verify'?'/members':'/login'} className="block text-center text-sm font-medium text-purple-700">{done&&purpose==='verify'?'Voltar para minha conta':'Voltar para entrar'}</Link>
  </div></main>;
}
