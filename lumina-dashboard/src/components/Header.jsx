import { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Dialog, DialogPanel, DialogTitle, Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { useUser } from '../contexts/UserContext';
import { useT } from '../i18n/LanguageContext.jsx';
import LanguageSwitcher from './LanguageSwitcher';
import logo from '../pages/assets/monochromeBlack.svg';
const LINKS = [['nav.commands','/commands'],['nav.inventory','/inventory'],['nav.pricing','/pricing'],['nav.about','/about']];
export function discordAvatarUrl(user) {
 const id = user?.discordOauth2Id || user?.id;
 const avatar = user?.avatar || user?.discordAvatar;
 if (!id || !avatar) return null;
 if (/^https:\/\/cdn\.discordapp\.com\/avatars\//.test(avatar)) return avatar;
 return /^[a-zA-Z0-9_]+$/.test(avatar) ? `https://cdn.discordapp.com/avatars/${id}/${avatar}.png?size=64` : null;
}
export default function Header() {
 const t=useT();const {user,loading,isAdmin,logout}=useUser();const navigate=useNavigate();const location=useLocation();
 const [open,setOpen]=useState(false);const [logoutError,setLogoutError]=useState('');const [leaving,setLeaving]=useState(false);const [brokenAvatar,setBrokenAvatar]=useState(false);
 useEffect(()=>{setOpen(false);},[location.pathname]);
 const name=user?.displayName || user?.firstName || user?.username || t('common.account');
 const avatar=discordAvatarUrl(user);
 const signOut=async()=>{setLeaving(true);setLogoutError('');try{await logout();setOpen(false);navigate('/');}catch{setLogoutError('Não foi possível sair. Tente novamente.');}finally{setLeaving(false);}};
 const accountLinks=[['header.area','/members'],['header.settings','/settings'],...(isAdmin()?[['header.adminPanel','/admin']]:[])];
 return <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
  <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between gap-4">
   <Link to={user?'/members':'/'} aria-label="Lumina Bot"><img src={logo} alt="Lumina Bot" className="h-6 w-auto" /></Link>
   <nav aria-label="Navegação principal" className="hidden md:flex items-center gap-5 flex-1 ml-3">{LINKS.map(([key,to])=><NavLink key={to} to={to} className={({isActive})=>`text-sm font-medium ${isActive?'text-purple-700':'text-gray-600 hover:text-purple-700'}`}>{t(key)}</NavLink>)}</nav>
   <div className="flex items-center gap-3"><LanguageSwitcher compact />
    {loading?<span className="lumina-spinner" aria-label={t('common.loading')} />:user?<Menu><MenuButton className="flex items-center gap-2 rounded-full p-1 pr-2 hover:bg-gray-50" aria-label={`${t('common.account')}: ${name}`}>
     {avatar&&!brokenAvatar?<img src={avatar} alt="Avatar" onError={()=>setBrokenAvatar(true)} className="w-8 h-8 rounded-full object-cover" />:<span className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-sm font-semibold">{name[0]?.toUpperCase()}</span>}
     <span className="hidden sm:block text-sm font-medium text-gray-700">{name}</span></MenuButton>
     <MenuItems anchor="bottom end" className="z-50 mt-2 w-60 lumina-card p-1 shadow-lg focus:outline-none">
      <p className="px-3 py-2 text-sm font-semibold text-gray-900 truncate">{name}</p>
      {accountLinks.map(([key,to])=><MenuItem key={to}><Link to={to} className="block rounded-lg px-3 py-2.5 text-sm text-gray-700 data-[focus]:bg-purple-50">{t(key)}</Link></MenuItem>)}
      <MenuItem><button disabled={leaving} onClick={signOut} className="block w-full text-left rounded-lg px-3 py-2.5 text-sm text-red-700 data-[focus]:bg-red-50">{leaving?t('common.loading'):t('common.logout')}</button></MenuItem>
     </MenuItems></Menu>:<div className="hidden sm:flex gap-3 items-center"><Link to="/login" className="text-sm font-medium text-gray-600">{t('header.login')}</Link><Link to="/register" className="lumina-button">{t('header.signup')}</Link></div>}
    <button className="md:hidden p-2" onClick={()=>setOpen(true)} aria-label={t('common.openMenu')}><Bars3Icon className="w-6 h-6" /></button>
   </div>
  </div>
  {logoutError&&<p role="alert" className="bg-red-50 text-red-700 text-sm px-4 py-2 text-center">{logoutError}</p>}
  <Dialog open={open} onClose={setOpen} className="relative z-50 md:hidden"><div className="fixed inset-0 bg-black/30" /><DialogPanel className="fixed inset-y-0 right-0 w-full max-w-xs bg-white p-4 shadow-xl overflow-y-auto"><div className="flex items-center justify-between mb-5"><DialogTitle className="font-semibold">Lumina Bot</DialogTitle><button aria-label="Fechar menu" className="p-2" onClick={()=>setOpen(false)}><XMarkIcon className="w-6 h-6" /></button></div><nav className="space-y-1">{[...LINKS,...(user?accountLinks:[['header.login','/login'],['header.signup','/register']])].map(([key,to])=><NavLink key={to} to={to} className="block rounded-lg px-3 py-3 text-sm font-medium text-gray-700 hover:bg-purple-50">{t(key)}</NavLink>)}</nav>{user&&<button className="w-full text-left text-red-700 px-3 py-3 mt-3" disabled={leaving} onClick={signOut}>{t('common.logout')}</button>}</DialogPanel></Dialog>
 </header>;
}
