import { Dialog,DialogPanel,DialogTitle } from '@headlessui/react';
import { useT } from '../../../i18n/LanguageContext.jsx';
export default function FilterDrawer({isOpen,onClose,onOpenButtonClick,activeFilterCount,renderFilters}) {
 const t=useT();
 return <>
  <div className="lg:hidden px-4 pt-4"><button className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700" onClick={onOpenButtonClick}>{t('common.filters')}{activeFilterCount>0&&<span className="ml-2 rounded-full bg-purple-100 text-purple-700 px-2 py-0.5">{activeFilterCount}</span>}</button></div>
  <aside className="hidden lg:block lg:w-72 shrink-0 bg-gray-50/80 border-r border-gray-200 p-6"><h2 className="text-base font-semibold text-gray-900 mb-5">{t('common.filters')}</h2>{renderFilters()}</aside>
  <Dialog open={isOpen} onClose={onClose} className="relative z-50"><div className="fixed inset-0 bg-black/40"/><DialogPanel className="fixed inset-y-0 left-0 w-full max-w-xs bg-white shadow-xl overflow-y-auto"><div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between"><DialogTitle className="font-semibold">{t('common.filters')}</DialogTitle><button onClick={onClose} aria-label={t('common.closeFilters')} className="p-2 text-gray-600">✕</button></div><div className="p-6">{renderFilters()}</div></DialogPanel></Dialog>
 </>;
}
