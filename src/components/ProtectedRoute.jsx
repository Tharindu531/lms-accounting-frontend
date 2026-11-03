import { Navigate, useLocation } from 'react-router-dom';
import useAuth from '../context/useAuth';

/**
 * No flags: signed in. `studentArea`: student pages (instructors have none, so
 * they go to marking). `adminOnly` / `instructorOrAdmin`: staff pages.
 */
const ProtectedRoute = ({ children, adminOnly = false, instructorOrAdmin = false, studentArea = false }) => {
  const { user, loading, isAdmin, isInstructor, requirePasswordChange } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-dvh grid place-items-center bg-paper" role="status" aria-label="Loading">
        <img src="/avatar-96.webp" alt="" width="48" height="48" className="h-12 w-12 rounded-full opacity-80 animate-pulse" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (requirePasswordChange) return <Navigate to="/change-password" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/dashboard" replace />;
  if (instructorOrAdmin && !isAdmin && !isInstructor) return <Navigate to="/dashboard" replace />;
  if (studentArea && isInstructor) return <Navigate to="/admin/marking" replace />;

  return children;
};

export default ProtectedRoute;
