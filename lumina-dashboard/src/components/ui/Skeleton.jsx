/**
 * Skeleton loaders reutilizáveis.
 *
 * Usados enquanto aguardamos a resposta da API. Substituem os antigos
 * "spinners" centrais que deixavam a UI vazia e davam a impressão de
 * carregamento quebrado.
 */

export function SkeletonBox({ className = '' }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] ${className}`}
      style={{ animation: 'shimmer 1.4s ease-in-out infinite' }}
    />
  );
}

export function SkeletonLine({ width = '100%', height = '1rem', className = '' }) {
  return (
    <div
      className={`animate-pulse rounded bg-gray-200 ${className}`}
      style={{ width, height }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white shadow rounded-lg border border-gray-100 p-5">
      <div className="flex items-center">
        <div className="flex-shrink-0 bg-gray-100 p-3 rounded-lg">
          <div className="h-6 w-6 rounded bg-gray-200 animate-pulse" />
        </div>
        <div className="ml-4 flex-1 space-y-2">
          <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
          <div className="h-5 w-16 bg-gray-200 rounded animate-pulse" />
          <div className="h-2 w-20 bg-gray-100 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonRow({ columns = 5 }) {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonTable({ rows = 6, columns = 5 }) {
  return (
    <tbody className="bg-white divide-y divide-gray-200">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} columns={columns} />
      ))}
    </tbody>
  );
}

export function SkeletonChart({ height = 220 }) {
  return (
    <div className="px-6 pt-4 pb-2 space-y-3" style={{ minHeight: height }}>
      <div className="flex items-end gap-2" style={{ height: height - 40 }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 bg-gray-200 rounded-t animate-pulse"
            style={{ height: `${30 + Math.random() * 60}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-2 w-12 bg-gray-100 rounded animate-pulse" />
        ))}
      </div>
    </div>
  );
}

export default SkeletonBox;
