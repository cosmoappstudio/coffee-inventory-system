import { Navigate } from 'react-router-dom';

export default function OpsIndexRedirect() {
  return <Navigate to="/ops/usage" replace />;
}
