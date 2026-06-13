import { Navigate } from 'react-router-dom';
import useAuth from '../context/useAuth';

const ProtectedRoute = ({ children, adminOnly = false, instructorOrAdmin = false }) => {
  const { user, loading, isAdmin, isInstructor, requirePasswordChange } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requirePasswordChange) {
    return <Navigate to="/change-password" replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (instructorOrAdmin && !isAdmin && !isInstructor) {
    return <Navigate to="/dashboard" replace />;
  }

  // Instructors don't have a student-side view — redirect them to content management
  if (isInstructor && !adminOnly && !instructorOrAdmin) {
    return <Navigate to="/admin/lessons" replace />;
  }

  return children;
};

export default ProtectedRoute;
