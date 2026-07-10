import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

/**
 * Banner de erro padronizado para uso em todas as tabs do painel admin.
 *
 * Props:
 *   - error: string (mensagem de erro)
 *   - onRetry: function (opcional — mostra botão "Tentar novamente")
 *   - variant: 'error' | 'warning' (default: 'error')
 *
 * Uso:
 *   {error && <ErrorBanner error={error} onRetry={load} />}
 *   {error && <ErrorBanner error={error} variant="warning" />}
 */
export default function ErrorBanner({ error, onRetry, variant = 'error' }) {
  if (!error) return null;

  const styles = variant === 'warning'
    ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
    : 'bg-red-50 border-red-200 text-red-700';

  return (
    <div className={`${styles} border rounded-lg px-4 py-3 flex items-start justify-between gap-3`}>
      <div className="flex items-start gap-2 text-sm min-w-0">
        <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />
        <span className="truncate">{error}</span>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className={`flex-shrink-0 inline-flex items-center gap-1 text-xs font-medium ${
            variant === 'warning' ? 'text-yellow-800 hover:text-yellow-900' : 'text-red-700 hover:text-red-900'
          }`}
        >
          <ArrowPathIcon className="h-3.5 w-3.5" />
          Tentar novamente
        </button>
      )}
    </div>
  );
}
