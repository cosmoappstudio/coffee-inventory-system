import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAdminLandingPath } from '../lib/routes';
import { AuthLoadingScreen } from './ProtectedRoute';

export default function AdminIndexRedirect() {
  const { role, loading } = useAuth();

  if (loading) {
    return <AuthLoadingScreen />;
  }

  if (!role) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={getAdminLandingPath(role)} replace />;
}
