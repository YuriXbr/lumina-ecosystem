import { Link } from 'react-router-dom';

const NotFoundPage = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-red-600 dark:text-red-400">404</h1>
        <p className="mt-4 text-2xl font-semibold text-gray-800 dark:text-gray-200">
          Oops! Página Não encontrada..
        </p>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          A página que você procura foi movida ou não existe :/
        </p>
        <Link to="/">
          <button className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50">
            Voltar para o Início
          </button>
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;