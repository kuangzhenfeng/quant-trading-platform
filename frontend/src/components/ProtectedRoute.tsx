import { Navigate } from 'react-router-dom';
import { authService } from '../services/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const authEnabled = import.meta.env.VITE_AUTH_ENABLED === 'true';

  if (!authEnabled) {
    return <>{children}</>;
  }

  const token = authService.getToken();
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
