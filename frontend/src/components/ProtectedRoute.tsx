import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthProvider';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'designer' | 'checker' | 'viewer';
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user?.role !== requiredRole && user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
