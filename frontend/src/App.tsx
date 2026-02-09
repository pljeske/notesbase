import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { PageView } from './components/PageView';
import { WelcomePage } from './components/WelcomePage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/page/:pageId" element={<PageView />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
