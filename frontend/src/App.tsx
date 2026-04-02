import {useEffect} from 'react';
import {BrowserRouter, Navigate, Route, Routes} from 'react-router-dom';
import {AppLayout} from './components/layout/AppLayout';
import {PageView} from './components/PageView';
import {TagView} from './components/TagView';
import {WelcomePage} from './components/WelcomePage';
import {LoginPage} from './components/auth/LoginPage';
import {RegisterPage} from './components/auth/RegisterPage';
import {ForgotPasswordPage} from './components/auth/ForgotPasswordPage';
import {ResetPasswordPage} from './components/auth/ResetPasswordPage';
import {AdminPanel} from './components/admin/AdminPanel';
import {ApiKeysPage} from './components/settings/ApiKeysPage';
import {useAuthStore} from './stores/authStore';

function AuthGuard({children}: {children: React.ReactNode}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) {
    return <Navigate to="/login" replace/>;
  }
  return <>{children}</>;
}

function GuestGuard({children}: {children: React.ReactNode}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (isAuthenticated) {
    return <Navigate to="/" replace/>;
  }
  return <>{children}</>;
}

function AdminGuard({children}: {children: React.ReactNode}) {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace/>;
  if (user.role !== 'admin') return <Navigate to="/" replace/>;
  return <>{children}</>;
}

function App() {
  const loadFromStorage = useAuthStore((s) => s.loadFromStorage);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<GuestGuard><LoginPage/></GuestGuard>}/>
        <Route path="/register" element={<GuestGuard><RegisterPage/></GuestGuard>}/>
        <Route path="/forgot-password" element={<GuestGuard><ForgotPasswordPage/></GuestGuard>}/>
        <Route path="/reset-password" element={<GuestGuard><ResetPasswordPage/></GuestGuard>}/>

        {/* Protected routes */}
        <Route element={<AuthGuard><AppLayout/></AuthGuard>}>
          <Route path="/" element={<WelcomePage/>}/>
          <Route path="/page/:pageId" element={<PageView/>}/>
          <Route path="/tag/:tagId" element={<TagView/>}/>
          <Route path="/settings" element={<ApiKeysPage/>}/>
          <Route
            path="/admin"
            element={<AdminGuard><AdminPanel/></AdminGuard>}
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
