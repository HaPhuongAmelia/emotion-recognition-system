// PrivateRoute.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLoginModal } from './LoginModalContext';

const PrivateRoute: React.FC<{ children: React.ReactElement, adminOnly?: boolean }> = ({ children, adminOnly = false }) => {
  const { user } = useAuth();
  const { openLogin } = useLoginModal();

  if (adminOnly) {
    // For admin routes, hide existence: send unauthorized users to 404
    if (!user || String(user.role).toUpperCase() !== 'ADMIN') {
      return <Navigate to="/404" replace />;
    }
  } else {
    // Non-admin protected routes (if used): prompt login and redirect home
    if (!user) {
      setTimeout(() => openLogin('login'), 0);
      return <Navigate to="/" replace />;
    }
  }
  return children;
};

export default PrivateRoute;
