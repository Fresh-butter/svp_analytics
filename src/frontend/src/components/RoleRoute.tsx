import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const RoleRoute = ({ allowedRoles }: { allowedRoles: Array<'ADMIN' | 'PARTNER'> }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-textMuted">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.user_type)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};
