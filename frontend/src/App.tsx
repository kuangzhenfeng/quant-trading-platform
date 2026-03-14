import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
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
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#00ff88',
          colorSuccess: '#00ff88',
          colorWarning: '#ffaa00',
          colorError: '#ff3366',
          colorInfo: '#00d4ff',
          colorBgBase: '#0a0e1a',
          colorBgContainer: '#131824',
          colorBorder: '#2a3142',
          borderRadius: 2,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        },
      }}
    >
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
    </ConfigProvider>
  );
}
