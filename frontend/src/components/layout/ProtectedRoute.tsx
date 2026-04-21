import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '../../app/hooks';

export const ProtectedRoute: React.FC = () => {
  const accessToken = useAppSelector((s) => s.auth.accessToken);
  return accessToken ? <Outlet /> : <Navigate to="/auth/login" replace />;
};
