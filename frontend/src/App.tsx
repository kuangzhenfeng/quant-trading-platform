import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ConfigProvider, theme, App as AntApp } from 'antd';
import { useEffect } from 'react';
import MainLayout from './components/Layout/MainLayout';
import Dashboard from './pages/Dashboard';
import Trading from './pages/Trading';
import Market from './pages/Market';
import Strategy from './pages/Strategy';
import Monitor from './pages/Monitor';
import Account from './pages/Account';
import Users from './pages/Users';
import Logs from './pages/Logs';
import Backtest from './pages/Backtest';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Setup from './pages/Setup';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useThemeStore } from './stores/themeStore';

// 暗色主题 token
const darkTokens = {
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
};

// 亮色主题 token
const lightTokens = {
  colorPrimary: '#f59e0b',
  colorSuccess: '#059669',
  colorWarning: '#d97706',
  colorError: '#dc2626',
  colorInfo: '#f59e0b',
  colorBgBase: '#f4f5f7',
  colorBgContainer: '#ffffff',
  colorBgElevated: '#ffffff',
  colorBorder: 'rgba(30, 41, 59, 0.1)',
  colorBorderSecondary: 'rgba(30, 41, 59, 0.06)',
  borderRadius: 6,
  fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
  fontSize: 14,
  controlHeight: 36,
  wireframe: false,
};

// 暗色主题组件覆盖
const darkComponents = {
  Table: {
    headerBg: 'rgba(34, 211, 238, 0.04)',
    headerColor: '#64748b',
    rowHoverBg: 'rgba(34, 211, 238, 0.03)',
    borderColor: 'rgba(148, 163, 184, 0.08)',
  },
  Card: { headerBg: 'transparent' },
  Button: { primaryShadow: 'none' },
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
};

// 亮色主题组件覆盖
const lightComponents = {
  Table: {
    headerBg: 'rgba(245, 158, 11, 0.05)',
    headerColor: '#475569',
    rowHoverBg: 'rgba(245, 158, 11, 0.03)',
    borderColor: 'rgba(30, 41, 59, 0.06)',
  },
  Card: { headerBg: 'transparent' },
  Button: { primaryShadow: 'none' },
  Select: {
    optionActiveBg: 'rgba(245, 158, 11, 0.06)',
    optionSelectedBg: 'rgba(245, 158, 11, 0.1)',
  },
  Input: {
    activeBorderColor: '#f59e0b',
    hoverBorderColor: 'rgba(245, 158, 11, 0.4)',
  },
  Menu: {
    itemBg: 'transparent',
    itemSelectedBg: 'rgba(245, 158, 11, 0.08)',
    itemSelectedColor: '#d97706',
    itemHoverBg: 'rgba(30, 41, 59, 0.04)',
    itemColor: '#475569',
    itemHoverColor: '#1e293b',
  },
};

// 应用主题到 document
function ThemeApplier() {
  const mode = useThemeStore((s) => s.mode);
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
    // 移除预加载禁用过渡的类
    document.documentElement.classList.remove('preload');
  }, [mode]);
  return null;
}

export default function App() {
  const mode = useThemeStore((s) => s.mode);
  const isDark = mode === 'dark';

  return (
    <>
      <ThemeApplier />
      <ConfigProvider
        theme={{
          algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
          token: isDark ? darkTokens : lightTokens,
          components: isDark ? darkComponents : lightComponents,
        }}
      >
      <BrowserRouter>
        <AntApp>
          <Routes>
            <Route path="/setup" element={<Setup />} />
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="market" element={<Market />} />
              <Route path="trading" element={<Trading />} />
              <Route path="strategy" element={<Strategy />} />
              <Route path="monitor" element={<Monitor />} />
              <Route path="users" element={<Users />} />
              <Route path="account" element={<Account />} />
              <Route path="settings" element={<Settings />} />
              <Route path="logs" element={<Logs />} />
              <Route path="backtest" element={<Backtest />} />
            </Route>
          </Routes>
        </AntApp>
      </BrowserRouter>
    </ConfigProvider>
    </>
  );
}
