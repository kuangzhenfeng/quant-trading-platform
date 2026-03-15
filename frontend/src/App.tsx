import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ConfigProvider, theme, App as AntApp } from 'antd';
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
          colorPrimary: '#22d3ee',
          colorSuccess: '#34d399',
          colorWarning: '#fbbf24',
          colorError: '#f87171',
          colorInfo: '#22d3ee',
          colorBgBase: '#0b0c10',
          colorBgContainer: '#16181f',
          colorBgElevated: '#1c1e27',
          colorBorder: 'rgba(148, 163, 184, 0.12)',
          colorBorderSecondary: 'rgba(148, 163, 184, 0.08)',
          borderRadius: 6,
          fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
          fontSize: 14,
          controlHeight: 36,
          wireframe: false,
        },
        components: {
          Table: {
            headerBg: 'rgba(34, 211, 238, 0.04)',
            headerColor: '#64748b',
            rowHoverBg: 'rgba(34, 211, 238, 0.03)',
            borderColor: 'rgba(148, 163, 184, 0.08)',
          },
          Card: {
            headerBg: 'transparent',
          },
          Button: {
            primaryShadow: 'none',
          },
          Select: {
            optionActiveBg: 'rgba(34, 211, 238, 0.08)',
            optionSelectedBg: 'rgba(34, 211, 238, 0.12)',
          },
          Input: {
            activeBorderColor: '#22d3ee',
            hoverBorderColor: 'rgba(34, 211, 238, 0.5)',
          },
          Menu: {
            itemBg: 'transparent',
            itemSelectedBg: 'rgba(34, 211, 238, 0.08)',
            itemSelectedColor: '#22d3ee',
            itemHoverBg: 'rgba(148, 163, 184, 0.06)',
            itemColor: '#94a3b8',
            itemHoverColor: '#f1f5f9',
          },
        },
      }}
    >
      <AntApp>
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
      </AntApp>
    </ConfigProvider>
  );
}
