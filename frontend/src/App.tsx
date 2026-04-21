import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { store } from './app/store';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { AuthBootstrap } from './components/layout/AuthBootstrap';
import { useSocket } from './hooks/useSocket';

const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const SignupPage = lazy(() => import('./pages/auth/SignupPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const HomePage = lazy(() => import('./pages/room/HomePage'));
const RoomPage = lazy(() => import('./pages/room/RoomPage'));

const AppRoutes: React.FC = () => {
  useSocket();
  return (
    <Routes>
      <Route path="/auth/login" element={<LoginPage />} />
      <Route path="/auth/signup" element={<SignupPage />} />
      <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/room/:roomId" element={<RoomPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App: React.FC = () => (
  <Provider store={store}>
    <BrowserRouter>
      <AuthBootstrap>
        <Suspense
          fallback={
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          }
        >
          <AppRoutes />
        </Suspense>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#18181b',
              color: '#f4f4f5',
              border: '1px solid #3f3f46',
              borderRadius: '10px',
              fontSize: '13px',
              padding: '10px 14px',
            },
          }}
        />
      </AuthBootstrap>
    </BrowserRouter>
  </Provider>
);

export default App;
