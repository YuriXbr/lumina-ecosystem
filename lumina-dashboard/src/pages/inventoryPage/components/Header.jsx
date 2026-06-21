import React from 'react';

function Header({ 
    generalSearch, 
    setGeneralSearch, 
    isLoggedIn, 
    discordError, 
    loginWithDiscord, 
    handleGetInventory, 
    user,
    inventoryLoading
}) {
    const getDiscordAvatarUrl = () => {
        if (user && user.avatar && user.id) {
            return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`;
        }
        return '/defaultAvatar.png';
    };

    return (
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            {/* Título e Informações */}
            <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                    <span className="text-3xl">💎</span>
                    <h1 className="text-2xl lg:text-3xl font-bold text-white">
                        Inventário de Skins
                    </h1>
                </div>
                <p className="text-indigo-100 text-sm lg:text-base">
                    Explore sua coleção de skins do League of Legends
                </p>
            </div>

            {/* Área de Ações */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full lg:w-auto">
                {/* Campo de busca mobile */}
                <div className="lg:hidden w-full">
                    <div className="relative">
                        <input
                            type="text"
                            value={generalSearch}
                            onChange={(e) => setGeneralSearch(e.target.value)}
                            placeholder="Buscar skins ou campeões..."
                            className="w-full pl-4 pr-10 py-3 border border-indigo-300 rounded-lg bg-white/90 focus:ring-2 focus:ring-white focus:border-transparent transition-all placeholder-gray-500"
                        />
                        <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>

                {/* Botões de ação */}
                <div className="flex flex-col sm:flex-row gap-3 min-w-0">
                    {/* Botão do usuário logado */}
                    {isLoggedIn ? (
                        <button
                            onClick={() => handleGetInventory(user?.id)}
                            disabled={inventoryLoading}
                            className="flex items-center justify-center space-x-3 bg-white/20 hover:bg-white/30 text-white px-4 py-2.5 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm border border-white/20"
                        >
                            <img 
                                src={getDiscordAvatarUrl()} 
                                alt="Avatar" 
                                className="w-6 h-6 rounded-full border border-white/30" 
                            />
                            <span className="font-medium">Minha Coleção</span>
                            {inventoryLoading && (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            )}
                        </button>
                    ) : discordError ? (
                        <button 
                            onClick={loginWithDiscord}
                            disabled={inventoryLoading}
                            className="flex items-center justify-center space-x-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2.5 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm border border-white/20"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                            </svg>
                            <span className="font-medium">Conectar Discord</span>
                        </button>
                    ) : (
                        <a 
                            href="/login"
                            className="flex items-center justify-center space-x-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2.5 rounded-lg transition-all backdrop-blur-sm border border-white/20"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                            </svg>
                            <span className="font-medium">Fazer Login</span>
                        </a>
                    )}

                    {/* Campo para buscar por ID */}
                    <div className="flex items-center space-x-2">
                        <input
                            type="text"
                            id="userId"
                            placeholder="ID do usuário..."
                            className="px-3 py-2.5 border border-white/30 rounded-lg bg-white/20 text-white placeholder-indigo-200 focus:ring-2 focus:ring-white focus:border-transparent transition-all backdrop-blur-sm min-w-0 flex-1"
                        />
                        <button
                            onClick={() => {
                                const input = document.getElementById('userId');
                                const userId = input.value.trim();
                                if (userId) {
                                    handleGetInventory(userId);
                                    input.value = '';
                                }
                            }}
                            disabled={inventoryLoading}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                            title="Buscar inventário por ID"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Informações do usuário */}
                {user && user.username && (
                    <div className="flex items-center space-x-3 bg-white/10 rounded-lg px-4 py-2 backdrop-blur-sm border border-white/20">
                        <img 
                            src={getDiscordAvatarUrl()} 
                            alt="Avatar" 
                            className="w-8 h-8 rounded-full border border-white/30" 
                        />
                        <div className="min-w-0">
                            <p className="text-white font-medium text-sm truncate">{user.username}</p>
                            <p className="text-indigo-200 text-xs">ID: {user.id}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Header;