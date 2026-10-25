import { NavLink } from 'react-router-dom';
export const LEGAL_PAGES = [
  {path:'/terms',label:'Termos de uso'},
  {path:'/privacy',label:'Privacidade'},
  {path:'/cookies',label:'Cookies e dados locais'},
];
export default function LegalLinks({className='',label='Políticas do Lumina'}) {
  return <nav aria-label={label} className={`flex flex-wrap gap-x-5 gap-y-3 ${className}`}>
    {LEGAL_PAGES.map(page=><NavLink key={page.path} to={page.path} className={({isActive})=>`hover:text-purple-800 underline-offset-4 hover:underline ${isActive?'text-purple-800 font-semibold':''}`}>{page.label}</NavLink>)}
  </nav>;
}
