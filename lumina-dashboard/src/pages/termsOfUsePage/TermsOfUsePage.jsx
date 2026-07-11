import HomeNavBar from '../components/homeNavBar/HomeNavBar';
import { useT } from '../../i18n/LanguageContext.jsx';

const TermsOfUsePage = () => {
  const t = useT();
  return (
    <div className="bg-white min-h-screen">
      <HomeNavBar />
      <div className="container mx-auto px-6 py-24 sm:py-32 lg:px-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">{t("terms.title")}</h1>
        <div className="prose dark:prose-dark">
          <h2>{t('terms.section1Title')}</h2>
          <p>
            {t('terms.section1Body')}
          </p>
          <h2>{t('terms.section2Title')}</h2>
          <p>
            {t('terms.section2Body')}
          </p>
          <h2>{t('terms.section3Title')}</h2>
          <p>
            {t('terms.section3Body')}
          </p>
          <h2>{t('terms.section4Title')}</h2>
          <p>
            {t('terms.section4Body')}
          </p>
          <h2>{t('terms.section5Title')}</h2>
          <p>
            {t('terms.section5Body')}
          </p>
          <h2>{t('terms.section6Title')}</h2>
          <p>
            {t('terms.section6Body')}
          </p>
          <h2>{t('terms.section7Title')}</h2>
          <p>
            {t('terms.section7Body')}
          </p>
          <h2>{t('terms.section8Title')}</h2>
          <p>
            {t('terms.section8Body')}
          </p>
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-8 mt-16">{t("terms.privacy")}</h1>
        <div className="prose dark:prose-dark">
          <h2>{t('terms.privacySection1Title')}</h2>
          <p>
            {t('terms.privacySection1Body')}
          </p>
          <ul>
            <li>{t('terms.privacySection1Item1')}</li>
            <li>{t('terms.privacySection1Item2')}</li>
          </ul>
          <h2>{t('terms.privacySection2Title')}</h2>
          <p>
            {t('terms.privacySection2Body')}
          </p>
          <ul>
            <li>{t('terms.privacySection2Item1')}</li>
            <li>{t('terms.privacySection2Item2')}</li>
          </ul>
          <h2>{t('terms.privacySection3Title')}</h2>
          <p>
            {t('terms.privacySection3Body')}
          </p>
          <h2>{t('terms.privacySection4Title')}</h2>
          <p>
            {t('terms.privacySection4Body')}
          </p>
          <h2>{t('terms.privacySection5Title')}</h2>
          <p>
            {t('terms.privacySection5Body')}
          </p>
          <ul>
            <li>{t('terms.privacySection5Item1')}</li>
            <li>{t('terms.privacySection5Item2')}</li>
            <li>{t('terms.privacySection5Item3')}</li>
          </ul>
          <h2>{t('terms.privacySection6Title')}</h2>
          <p>
            {t('terms.privacySection6Body')}
          </p>
          <h2>{t('terms.privacySection7Title')}</h2>
          <p>
            {t('terms.privacySection7Body')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default TermsOfUsePage;
