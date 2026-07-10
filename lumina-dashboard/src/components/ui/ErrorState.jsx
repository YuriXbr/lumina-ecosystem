/**
 * Estado de erro reutilizável com botão "Tentar novamente".
 *
 * Substitui os antigos alertas vermelhos sem ação de retry. Mostra
 * a mensagem amigável + o erro técnico (quando disponível) e um
 * botão grande para re-disparar o fetch.
 */
import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

export default function ErrorState({
  title = 'Erro ao carregar dados',
  message = 'Não foi possível concluir a solicitação.',
  detail = null,
  onRetry = null,
  retryLabel = 'Tentar novamente',
  compact = false,
}) {
  if (compact) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
        <ExclamationTriangleIcon className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-red-900">{title}</p>
          {message && <p className="text-sm text-red-700 mt-0.5">{message}</p>}
          {detail && (
            <p className="text-xs text-red-500 mt-1 font-mono break-all">{detail}</p>
          )}
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              <ArrowPathIcon className="h-3.5 w-3.5" />
              {retryLabel}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-8 sm:p-12 text-center">
      <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
        <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-gray-900">{title}</h3>
      {message && <p className="mt-1 text-sm text-gray-600">{message}</p>}
      {detail && (
        <p className="mt-2 text-xs text-gray-400 font-mono break-all max-w-md mx-auto">{detail}</p>
      )}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
        >
          <ArrowPathIcon className="h-4 w-4" />
          {retryLabel}
        </button>
      )}
    </div>
  );
}
