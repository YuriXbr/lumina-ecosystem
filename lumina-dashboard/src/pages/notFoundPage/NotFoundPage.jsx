import { useT } from '../../i18n/LanguageContext.jsx';
import PageState from '../../components/PageState';
export default function NotFoundPage() {
 const t = useT();
 return <PageState title={`404 · ${t('notFound.title')}`} message={t('notFound.subtitle')} linkTo="/" linkLabel={t('notFound.back')} />;
}
