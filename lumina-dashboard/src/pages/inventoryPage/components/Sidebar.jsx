import React from 'react';

function Sidebar({ 
    skins = [],
    generalSearch, 
    setGeneralSearch, 
    championSearch, 
    setChampionSearch, 
    availableChampions, 
    selectedChampions, 
    toggleChampion, 
    raritySearch, 
    setRaritySearch, 
    selectedRarities, 
    toggleRarity, 
    rarityOptions 
}) {
    return (
        <div className="space-y-6">
            {/* Busca Geral */}
            <div>
                <label className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                    <span className="text-lg mr-2">🔍</span>
                    Busca Geral
                </label>
                <div className="relative">
                    <input
                        type="text"
                        value={generalSearch}
                        onChange={(e) => setGeneralSearch(e.target.value)}
                        placeholder="Buscar skins ou campeões..."
                        className="w-full pl-4 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                    {generalSearch && (
                        <button
                            onClick={() => setGeneralSearch('')}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            {/* Filtro por Campeões */}
            <div>
                <label className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                    <span className="text-lg mr-2">⚔️</span>
                    Campeões
                    {selectedChampions.length > 0 && (
                        <span className="ml-2 px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full">
                            {selectedChampions.length}
                        </span>
                    )}
                </label>
                
                <div className="space-y-3">
                    <div className="relative">
                        <input
                            type="text"
                            value={championSearch}
                            onChange={(e) => setChampionSearch(e.target.value)}
                            placeholder="Filtrar campeões..."
                            className="w-full pl-4 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
                        />
                    </div>
                    
                    <div className="max-h-48 overflow-y-auto space-y-2 bg-gray-50 rounded-lg p-3">
                        {availableChampions.length > 0 ? (
                            availableChampions.map(champion => {
                                // Contar quantas skins este campeão tem
                                const championSkins = skins?.filter(skin => skin.championName === champion) || [];
                                const skinCount = championSkins.length;
                                
                                return (
                                    <label 
                                        key={champion} 
                                        className="flex items-center space-x-3 cursor-pointer hover:bg-white rounded-md p-2 transition-colors"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedChampions.includes(champion)}
                                            onChange={() => toggleChampion(champion)}
                                            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                        />
                                        <span className="text-sm text-gray-700 flex-1">{champion}</span>
                                        {skinCount > 0 && (
                                            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
                                                {skinCount}
                                            </span>
                                        )}
                                    </label>
                                );
                            })
                        ) : (
                            <p className="text-sm text-gray-500 text-center py-2">
                                Nenhum campeão encontrado
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Filtro por Raridade */}
            <div>
                <label className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                    <span className="text-lg mr-2">💎</span>
                    Raridade
                    {selectedRarities.length > 0 && (
                        <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                            {selectedRarities.length}
                        </span>
                    )}
                </label>
                
                <div className="space-y-3">
                    <div className="relative">
                        <input
                            type="text"
                            value={raritySearch}
                            onChange={(e) => setRaritySearch(e.target.value)}
                            placeholder="Filtrar raridades..."
                            className="w-full pl-4 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
                        />
                    </div>
                    
                    <div className="space-y-2">
                        {rarityOptions
                            .filter(option => option.label.toLowerCase().includes(raritySearch.toLowerCase()))
                            .map(option => (
                                <label 
                                    key={option.key} 
                                    className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 rounded-md p-2 transition-colors"
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedRarities.includes(option.key)}
                                        onChange={() => toggleRarity(option.key)}
                                        className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                                    />
                                    <span className="text-sm text-gray-700 flex-1">{option.label}</span>
                                </label>
                            ))
                        }
                    </div>
                </div>
            </div>

            {/* Botão para limpar filtros */}
            {(selectedChampions.length > 0 || selectedRarities.length > 0 || generalSearch || championSearch || raritySearch) && (
                <div className="pt-4 border-t border-gray-200">
                    <button
                        onClick={() => {
                            setGeneralSearch('');
                            setChampionSearch('');
                            setRaritySearch('');
                            setSelectedChampions([]);
                            setSelectedRarities([]);
                        }}
                        className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors flex items-center justify-center space-x-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span>Limpar todos os filtros</span>
                    </button>
                </div>
            )}
        </div>
    );
}

export default Sidebar;