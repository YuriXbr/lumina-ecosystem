/* eslint-disable react/jsx-key */
import { FaReact, FaNodeJs, FaHtml5, FaCss3Alt, FaFigma, FaGithub, FaTwitter, FaLinkedin } from 'react-icons/fa';
import { DiMongodb } from "react-icons/di";
import HomeNavBar from '../components/homeNavBar/HomeNavBar';
import { useT } from '../../i18n/LanguageContext.jsx';

// Module-level data: skills (icons) are static, but text uses t() so must be
// resolved inside the component. We store keys here and resolve in render.
const DEVELOPERS = [
  {
    name: '"Lumina"',
    descKey: 'about.devDesc',
    photo: '/undraw_male_avatar.svg',
    github: 'https://github.com/',
    badgeKeys: ['about.roles.ceo', 'about.roles.designer', 'about.roles.lead', 'about.roles.dev'],
    skills: [<FaReact />, <FaNodeJs />, <DiMongodb />, <FaHtml5 />, <FaCss3Alt />, <FaFigma />],
  },
];

const AboutPage = () => {
  const t = useT();
  return (
    <div className="flex flex-col min-h-screen">
      <HomeNavBar />
      <div className="flex-grow container mt-3 mx-auto px-4 pt-24">
        <h1 className="text-4xl font-bold text-center mb-10">{t("about.title")}</h1>
        <p className="text-center text-lg text-gray-700 mb-10">
          {t("about.description")}
        </p>
        <div className="space-y-10">
          {DEVELOPERS.map((dev, index) => (
            <div key={index} className="bg-white shadow-lg rounded-lg p-6 flex flex-col md:flex-row items-center">
              <img src={dev.photo} alt={dev.name} className="w-32 h-32 rounded-full mb-4 md:mb-0 md:mr-6" />
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  <h2 className="text-2xl font-bold mr-2">{dev.name}</h2>
                  <a href={dev.github} target="_blank" rel="noopener noreferrer" className="text-gray-600 mr-2">
                    <FaGithub className="text-2xl" />
                  </a>
                  {dev.badgeKeys.map((badgeKey, i) => (
                    <span key={i} className="bg-indigo-600 text-white text-sm font-semibold px-2 py-1 rounded mr-2">{t(badgeKey)}</span>
                  ))}
                </div>
                <p className="text-gray-700 mb-4">{t(dev.descKey)}</p>
                <div className="flex space-x-4 text-2xl text-gray-600">
                  {dev.skills.map((skill, i) => (
                    <span key={i}>{skill}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <footer className="bg-gray-800 text-white py-6">
        <div className="container mx-auto px-4 text-center">
          <p className="mb-4">© 2024 LUMINA BOT. {t("about.rights")}</p>
          <div className="flex justify-center space-x-6">
            <a href="https://github.com/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">
              <FaGithub className="text-2xl" />
            </a>
            <a href="https://twitter.com/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">
              <FaTwitter className="text-2xl" />
            </a>
            <a href="https://linkedin.com/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">
              <FaLinkedin className="text-2xl" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AboutPage;
