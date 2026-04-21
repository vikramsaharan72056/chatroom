import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { fetchMe } from '../../features/auth/authSlice';
import { reconnectSocket } from '../../services/socket';

export const AuthBootstrap: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useAppDispatch();
  const accessToken = useAppSelector((s) => s.auth.accessToken);

  useEffect(() => {
    if (accessToken) {
      dispatch(fetchMe());
      reconnectSocket();
    }
  }, [accessToken, dispatch]);

  return <>{children}</>;
};
