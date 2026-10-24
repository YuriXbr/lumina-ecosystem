import { FaReact, FaNodeJs, FaHtml5, FaCss3Alt, FaFigma, FaGithub } from 'react-icons/fa';
import { DiMongodb } from 'react-icons/di';
import { useT } from '../../i18n/LanguageContext.jsx';
import AppShell from '../../components/AppShell';
const DEVELOPERS = [{
  name: 'Lumina', descKey: 'about.devDesc', photo: '/undraw_male_avatar.svg',
  github: 'https://github.com/YuriXbr/lumina-ecosystem',
  badgeKeys: ['about.roles.ceo', 'about.roles.designer', 'about.roles.lead', 'about.roles.dev'],
  skills: [FaReact, FaNodeJs, DiMongodb, FaHtml5, FaCss3Alt, FaFigma],
}];
export default function AboutPage() {
  const t = useT();
  return <AppShell maxWidth="max-w-7xl">
    <div className="space-y-8">
      <div className="max-w-3xl mx-auto text-center space-y-4">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">{t('about.title')}</h1>
        <p className="text-base leading-7 text-gray-600">{t('about.description')}</p>
      </div>
      {DEVELOPERS.map(dev => <section key={dev.name} aria-label={dev.name} className="lumina-card p-6 flex flex-col md:flex-row items-center gap-6">
        <img src={dev.photo} alt={dev.name} className="w-32 h-32 rounded-full shrink-0" />
        <div className="flex-1 min-w-0 w-full space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-bold text-gray-900">{dev.name}</h2>
            <a href={dev.github} aria-label="Código do Lumina no GitHub" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-purple-700 p-2 rounded-lg focus-visible:outline-purple-600"><FaGithub className="text-2xl" /></a>
          </div>
          <div className="flex flex-wrap gap-2">{dev.badgeKeys.map(key => <span key={key} className="bg-purple-600 text-white text-xs font-semibold px-2 py-1 rounded">{t(key)}</span>)}</div>
          <p className="text-gray-600 leading-7">{t(dev.descKey)}</p>
          <div className="flex flex-wrap gap-4 text-2xl text-gray-500" aria-hidden="true">{dev.skills.map((Icon, index) => <Icon key={index} />)}</div>
        </div>
      </section>)}
    </div>
  </AppShell>;
}
