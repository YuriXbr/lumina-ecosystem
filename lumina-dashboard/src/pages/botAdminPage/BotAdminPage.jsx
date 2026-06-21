import NavBar from "./components/NavBar";

export default function BotAdminPage() {
    return (
        <div className="min-h-screen w-full justify-center bg-violet-300/50 flex items-center">
            <div className="w-full">
                <NavBar />
                {/* Guilds Container */}
                <div className="bg-white p-5 w-full">
                    <h1 className="text-center text-2xl mb-4">Guilds</h1>
                    <div className="flex flex-wrap">
                        <div className="p-2 w-full">
                            <div className="flex flex-row items-center w-full justify-between">
                                <div className="flex flex-row items-center">
                                    <img src="/react.svg" className="mr-3"/>
                                    <div className="flex-1 text-left md:text-left">
                                            <h5 className="font-bold uppercase text-2xl text-gray-500">Guild Name</h5>
                                        <div className="grid grid-cols-2">
                                            <h4 className="font-bold text-1xl">ID: 2409324952925</h4>
                                            <h4 className="font-bold text-1xl">MEMBROS: 100</h4>
                                            <h4 className="font-bold text-1xl">ID: 2409324952925</h4>
                                            <h4 className="font-bold text-1xl">NUMERO DE MEMBROS: 100</h4>
                                        </div>
                                    </div>
                                </div>
                                <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-700">
                                    Novo Botão
                                </button>
                            </div>
                        </div>
                        {/* Outras guilds*/}
                    </div>
                </div>   
            </div>
        </div>
    );
}