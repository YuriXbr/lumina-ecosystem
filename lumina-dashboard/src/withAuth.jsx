/* eslint-disable react/display-name */
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from './contexts/UserContext';

const withAuth = (Component) => {
  return (props) => {
    const { user, loading } = useUser();
    const [isAuthenticated, setIsAuthenticated] = useState(null);

    useEffect(() => {
      const checkAuth = async () => {
        try {
          const token = localStorage.getItem('token');
          if (!token) {
            setIsAuthenticated(false);
            return;
          }

          // Se o UserContext ainda está carregando, aguardar
          if (loading) {
            return;
          }

          // Se já temos dados do usuário no contexto, usar eles
          if (user) {
            setIsAuthenticated(true);
            return;
          }

          // Como fallback, verificar o token diretamente
          const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}expapi/v1/validate-token`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
          });

          if (response.ok) {
            setIsAuthenticated(true);
          } else {
            localStorage.removeItem('token');
            setIsAuthenticated(false);
          }
        } catch (error) {
          console.error('Error:', error);
          localStorage.removeItem('token');
          setIsAuthenticated(false);
        }
      };

      checkAuth();
    }, [user, loading]);

    // Se ainda está carregando ou verificando auth
    if (isAuthenticated === null || loading) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-6 text-lg text-gray-600">Verificando autenticação...</p>
          </div>
        </div>
      );
    }

    // Se não autenticado, redirecionar para login
    if (isAuthenticated === false) {
      return <Navigate to="/login" />;
    }

    // Se autenticado, renderizar componente
    return <Component {...props} />;
  };
};

export default withAuth;