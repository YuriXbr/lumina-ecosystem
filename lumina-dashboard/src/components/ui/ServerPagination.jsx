import { useT } from '../../i18n/LanguageContext';
export default function ServerPagination({ page, hasMore, loading, onChange }) {
  const t = useT();
  if (page === 1 && !hasMore) return null;
  return <nav aria-label="Paginação" className="lumina-card p-4 flex flex-wrap items-center justify-between gap-3">
    <button className="lumina-button-secondary" disabled={loading || page <= 1} onClick={() => onChange(page - 1)}>{t('common.previous')}</button>
    <span className="text-sm text-gray-600" aria-live="polite">{t('common.page')} {page}</span>
    <button className="lumina-button-secondary" disabled={loading || !hasMore} onClick={() => onChange(page + 1)}>{t('common.next')}</button>
  </nav>;
}
