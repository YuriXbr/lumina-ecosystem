import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
const STORAGE_KEY='lumina_cookie_notice_v2';
// This is an informational notice, not consent for unrelated processing.
export default function ConsentModal(){
 const [visible,setVisible]=useState(false);
 useEffect(()=>{try{setVisible(!localStorage.getItem(STORAGE_KEY));}catch{setVisible(true);}},[]);
 const dismiss=()=>{try{localStorage.setItem(STORAGE_KEY,JSON.stringify({version:2,acknowledgedAt:new Date().toISOString()}));}catch{/* Private browsing may disable persistence. */}setVisible(false);};
 if(!visible)return null;
 return <aside aria-label="Cookies e privacidade" className="fixed bottom-0 inset-x-0 z-50 p-3 sm:p-4"><div className="lumina-card mx-auto max-w-3xl p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row sm:items-center gap-4"><div className="flex-1"><h2 className="text-sm font-semibold text-gray-900">Cookies e privacidade</h2><p className="mt-1 text-xs text-gray-600 leading-relaxed">Usamos cookies essenciais para acesso e segurança e estatísticas agregadas da Cloudflare sem cookies de analytics. Saiba como seus dados são tratados na <Link className="font-medium text-purple-700 underline" to="/privacy">Política de Privacidade</Link> e na <Link className="font-medium text-purple-700 underline" to="/cookies">Política de Cookies</Link>.</p></div><button type="button" className="lumina-button shrink-0" onClick={dismiss}>Entendi</button></div></aside>;
}
