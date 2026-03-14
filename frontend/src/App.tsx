import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './components/Layout/MainLayout';
import Dashboard from './pages/Dashboard';
import Trading from './pages/Trading';
import Market from './pages/Market';
import Strategy from './pages/Strategy';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="market" element={<Market />} />
          <Route path="trading" element={<Trading />} />
          <Route path="strategy" element={<Strategy />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
