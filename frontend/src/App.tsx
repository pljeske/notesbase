import {useEffect} from 'react';
import {BrowserRouter, Navigate, Route, Routes} from 'react-router-dom';
import {AppLayout} from './components/layout/AppLayout';
import {PageView} from './components/PageView';
import {WelcomePage} from './components/WelcomePage';
import {LoginPage} from './components/auth/LoginPage';
import {RegisterPage} from './components/auth/RegisterPage';
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

        {/* Protected routes */}
        <Route element={<AuthGuard><AppLayout/></AuthGuard>}>
          <Route path="/" element={<WelcomePage/>}/>
          <Route path="/page/:pageId" element={<PageView/>}/>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
