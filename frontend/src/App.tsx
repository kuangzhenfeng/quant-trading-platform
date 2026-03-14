import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './components/Layout/MainLayout';
import Dashboard from './pages/Dashboard';
import Trading from './pages/Trading';
import Market from './pages/Market';
import Strategy from './pages/Strategy';
import Monitor from './pages/Monitor';
import Account from './pages/Account';
import Logs from './pages/Logs';
import Backtest from './pages/Backtest';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="market" element={<Market />} />
          <Route path="trading" element={<Trading />} />
          <Route path="strategy" element={<Strategy />} />
          <Route path="monitor" element={<Monitor />} />
          <Route path="account" element={<Account />} />
          <Route path="logs" element={<Logs />} />
          <Route path="backtest" element={<Backtest />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
