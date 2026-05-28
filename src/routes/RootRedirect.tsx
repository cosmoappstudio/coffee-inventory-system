import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDefaultPathForRole } from '../lib/routes';
import { AuthLoadingScreen } from './ProtectedRoute';

export default function RootRedirect() {
  const { employee, role, loading } = useAuth();

  if (loading) {
    return <AuthLoadingScreen />;
  }

  if (!employee || !role) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={getDefaultPathForRole(role)} replace />;
}
