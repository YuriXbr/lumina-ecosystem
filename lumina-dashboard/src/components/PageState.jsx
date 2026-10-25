import { Link } from 'react-router-dom';
export default function PageState({ title, message, loading=false, onRetry, linkTo, linkLabel }) {
  return <section className="lumina-state" aria-busy={loading} role={onRetry ? 'alert' : 'status'}>
    {loading && <span className="lumina-spinner" aria-hidden="true" />}
    <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
    {message && <p className="text-sm text-gray-600 max-w-md">{message}</p>}
    {onRetry && <button className="lumina-button" onClick={onRetry}>Tentar novamente</button>}
    {linkTo && <Link className="lumina-button" to={linkTo}>{linkLabel}</Link>}
  </section>;
}
