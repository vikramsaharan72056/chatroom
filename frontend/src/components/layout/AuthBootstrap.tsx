import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { fetchMe, refreshThunk } from '../../features/auth/authSlice';

export const AuthBootstrap: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useAppDispatch();
  const accessToken = useAppSelector((s) => s.auth.accessToken);
  const [initialised, setInitialised] = useState(false);

  useEffect(() => {
    const init = async () => {
      if (!accessToken) {
        // Try to restore session via refresh token cookie
        await dispatch(refreshThunk());
      } else {
        // Just verify/refresh user data if we already have a token
        dispatch(fetchMe());
      }
      setInitialised(true);
    };
    init();
  }, [dispatch]); // Only on mount

  if (!initialised) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
};
