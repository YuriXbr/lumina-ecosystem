import { useState } from 'react';
import { useT } from '../../../i18n/LanguageContext.jsx';
function Header({generalSearch,setGeneralSearch,isLoggedIn,discordError,loginWithDiscord,handleGetInventory,user,inventoryLoading,onOpenChestModal,onOpenDailyModal}) {
 const t = useT(); const [lookup,setLookup] = useState('');
 return <div className="space-y-5">
  <div className="flex flex-wrap items-start justify-between gap-4">
   <div><p className="text-xs uppercase tracking-widest font-semibold text-purple-700 mb-2">Forja Hextech</p><h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('inventory.title')}</h1><p className="text-sm text-gray-500 mt-2">{t('inventory.subtitle')}</p></div>
   <div className="flex flex-wrap gap-2">
    {user?.id && <><button className="lumina-button" onClick={onOpenChestModal}>{t('inventory.openChest.title')}</button><button className="rounded-lg border border-purple-200 text-purple-700 px-4 py-2 text-sm font-semibold" onClick={onOpenDailyModal}>🎁 Recompensa diária</button></>}
    {discordError && <button className="lumina-button" onClick={loginWithDiscord}>{t('inventory.connectDiscord')}</button>}
    {!isLoggedIn && <a className="lumina-button" href="/login">{t('header.login')}</a>}
   </div>
  </div>
  <div className="flex flex-col md:flex-row gap-3">
   <label className="flex-1"><span className="sr-only">{t('inventory.searchPlaceholder')}</span><input className="w-full border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900" value={generalSearch} onChange={e=>setGeneralSearch(e.target.value)} placeholder={t('inventory.searchPlaceholder')} /></label>
   <form className="flex gap-2" onSubmit={e=>{e.preventDefault();if(lookup.trim())handleGetInventory(lookup.trim());}}><label><span className="sr-only">ID Discord da coleção pública</span><input className="w-full md:w-56 border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900" inputMode="numeric" pattern="[0-9]{16,20}" maxLength={20} required value={lookup} onChange={e=>setLookup(e.target.value)} placeholder={t('inventory.userIdPlaceholder')} /></label><button disabled={inventoryLoading} className="lumina-button" type="submit" aria-label="Buscar coleção pública">Buscar</button></form>
   {user?.id && <button disabled={inventoryLoading} className="text-sm font-medium text-purple-700 px-3 py-2" onClick={()=>handleGetInventory(user.id)}>{inventoryLoading ? t('common.loading') : 'Minha coleção'}</button>}
  </div>
 </div>;
}
export default Header;
