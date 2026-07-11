import React, { useEffect } from 'react';
import { useT } from '../../../i18n/LanguageContext.jsx';

/**
 * Envolve a Sidebar de filtros tornando-a responsiva:
 * - Em telas >= lg: coluna lateral fixa, sempre visível (comportamento antigo,
 *   só que a partir de "lg" em vez de "xl", já que xl deixava a sidebar
 *   ocupando 100% da largura em tablets e telas médias).
 * - Em telas < lg: vira um drawer deslizante a partir da esquerda, acionado
 *   por um botão "Filtros" fixo na área de conteúdo, com overlay para fechar
 *   ao clicar fora e suporte a tecla Esc.
 */
export default function FilterDrawer({ isOpen, onClose, activeFilterCount, onOpenButtonClick, renderFilters }) {
  const t = useT();
    // Fecha com Esc e trava o scroll do body enquanto o drawer está aberto (mobile)
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = previousOverflow;
        };
    }, [isOpen, onClose]);

    return (
        <>
            {/* Botão "Filtros" — visível apenas abaixo do breakpoint lg */}
            <div className="lg:hidden px-6 pt-6">
                <button
                    onClick={onOpenButtonClick}
                    className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 rounded-lg px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    {t('common.filters')}
                    {activeFilterCount > 0 && (
                        <span className="bg-indigo-600 text-white text-xs font-bold rounded-full px-2 py-0.5">
                            {activeFilterCount}
                        </span>
                    )}
                </button>
            </div>

            {/* Coluna fixa em telas >= lg */}
            <div className="hidden lg:block lg:w-80 bg-gray-50/80 border-r border-gray-200">
                <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                        <span className="text-2xl mr-3">🔍</span>
                        {t('common.filters')}
                    </h3>
                    {renderFilters()}
                </div>
            </div>

            {/* Drawer mobile/tablet — overlay + painel deslizante */}
            <div
                className={`lg:hidden fixed inset-0 z-50 transition-opacity duration-300 ${
                    isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                }`}
                aria-hidden={!isOpen}
            >
                <div
                    className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                    onClick={onClose}
                />
                <div
                    className={`absolute inset-y-0 left-0 w-full max-w-xs bg-white shadow-2xl overflow-y-auto transition-transform duration-300 ${
                        isOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
                >
                    <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                            <span className="text-2xl mr-3">🔍</span>
                            {t('common.filters')}
                        </h3>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                            aria-label={t('common.closeFilters')}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <div className="p-6">
                        {renderFilters()}
                    </div>
                </div>
            </div>
        </>
    );
}
