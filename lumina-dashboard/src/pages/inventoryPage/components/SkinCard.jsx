import React from 'react';

function SkinCard({ skin }) {
    const getRarityColor = (rarity) => {
        const colors = {
            kNoRarity: 'from-gray-500 to-gray-600',
            kLegacy: 'from-orange-500 to-orange-600',
            kEpic: 'from-purple-500 to-purple-600',
            kLegendary: 'from-yellow-500 to-yellow-600',
            kMythic: 'from-red-500 to-red-600',
            kUltimate: 'from-indigo-500 to-indigo-600',
            kTranscendent: 'from-pink-500 to-pink-600'
        };
        return colors[rarity] || 'from-gray-500 to-gray-600';
    };

    const getRarityLabel = (rarity) => {
        const labels = {
            kNoRarity: 'Sem Raridade',
            kLegacy: 'Legado',
            kEpic: 'Épica',
            kLegendary: 'Lendária',
            kMythic: 'Mítica',
            kUltimate: 'Ultimate',
            kTranscendent: 'Transcendente'
        };
        return labels[rarity] || 'Desconhecida';
    };

    return (
        <div className="group bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden transform hover:-translate-y-1">
            {/* Imagem da Skin */}
            <div className="relative aspect-[9/16] overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
                <img
                    src={`https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${skin.championName}_${skin.id.toString().slice(-3).replace(/^0+/, '')}.jpg`}
                    alt={skin.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                />
                
                {/* Frame overlay */}
                <img
                    src="/shardframe.png"
                    alt="Skin Frame"
                    className="absolute inset-0 pointer-events-none object-cover w-full h-full"
                />

                {/* Contador de quantidade (apenas se > 1) */}
                {skin.count && skin.count > 1 && (
                    <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-sm rounded-full px-2 py-1 flex items-center space-x-1">
                        <span className="text-white text-xs font-bold">×{skin.count}</span>
                    </div>
                )}

                {/* Ícone de raridade sobreposto */}
                {skin.rarity !== 'kLegacy' && skin.rarity !== 'kNoRarity' && (
                    <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm rounded-full p-2">
                        <img
                            src={`/${skin.rarity}.png`}
                            alt={getRarityLabel(skin.rarity)}
                            className="w-6 h-6"
                            title={getRarityLabel(skin.rarity)}
                        />
                    </div>
                )}
            </div>

            {/* Informações da Skin */}
            <div className="p-4">
                <div className="space-y-2">
                    {/* Nome da skin */}
                    <h3 className="font-bold text-gray-900 text-sm leading-tight line-clamp-2 group-hover:text-indigo-600 transition-colors">
                        {skin.name}
                    </h3>
                    
                    {/* Campeão */}
                    <p className="text-gray-600 text-xs font-medium">
                        {skin.championName}
                    </p>

                    {/* Badge de raridade */}
                    <div className="flex items-center justify-between">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white bg-gradient-to-r ${getRarityColor(skin.rarity)}`}>
                            {getRarityLabel(skin.rarity)}
                        </span>
                        
                        {/* ID da skin (pequeno) */}
                        <span className="text-gray-400 text-xs font-mono">
                            #{skin.id.toString().slice(-3)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SkinCard;