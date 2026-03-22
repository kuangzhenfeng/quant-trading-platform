import { useState, useEffect } from 'react';
import { Layout, Tooltip, Select, Button, message, Dropdown, Drawer } from 'antd';
const { Content } = Layout;
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  DashboardOutlined,
  LineChartOutlined,
  SwapOutlined,
  RocketOutlined,
  MonitorOutlined,
  FileTextOutlined,
  ExperimentOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BankOutlined,
  LogoutOutlined,
  TeamOutlined,
  ReloadOutlined,
  UserOutlined,
  SettingOutlined,
  MoreOutlined,
  HomeOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { useTradingModeStore } from '../../stores/tradingModeStore';
import { useBrokerStore } from '../../stores/brokerStore';
import { useThemeStore } from '../../stores/themeStore';
import { authService } from '../../services/auth';
import { systemApi } from '../../services/system';
import { useWebSocketStatus } from '../../hooks/useWebSocketStatus';
import type { ApiError } from '../../types/api';
import TopProgressBar from '../TopProgressBar';

// 太阳/月亮图标 SVG 组件
function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

// 主题切换按钮
function ThemeToggle() {
  const { mode, toggleMode } = useThemeStore();
  const isDark = mode === 'dark';

  return (
    <Tooltip title={isDark ? '切换到亮色主题' : '切换到暗色主题'}>
      <button
        onClick={toggleMode}
        aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          border: '1px solid var(--border-default)',
          background: 'transparent',
          color: isDark ? 'var(--amber-400)' : 'var(--text-tertiary)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          position: 'relative',
          overflow: 'hidden',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = isDark
            ? 'rgba(245, 158, 11, 0.4)'
            : 'rgba(30, 41, 59, 0.2)';
          e.currentTarget.style.background = isDark
            ? 'rgba(245, 158, 11, 0.08)'
            : 'rgba(30, 41, 59, 0.04)';
          e.currentTarget.style.transform = 'scale(1.08)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'var(--border-default)';
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        <span
          key={mode}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'themeIconSpin 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {isDark ? <SunIcon /> : <MoonIcon />}
        </span>
      </button>
    </Tooltip>
  );
}

// 核心页面 — 底部 Tab Bar 显示
const coreNavItems = [
  { key: '/', icon: <HomeOutlined />, label: '首页' },
  { key: '/market', icon: <LineChartOutlined />, label: '行情' },
  { key: '/trading', icon: <SwapOutlined />, label: '交易' },
  { key: '/strategy', icon: <RocketOutlined />, label: '策略' },
  { key: '/monitor', icon: <MonitorOutlined />, label: '监控' },
];

// 完整导航项 — 侧边栏显示
const allNavItems = [
  { key: '/', icon: <DashboardOutlined />, label: '仪表盘' },
  { key: '/market', icon: <LineChartOutlined />, label: '行情' },
  { key: '/trading', icon: <SwapOutlined />, label: '交易' },
  { key: '/strategy', icon: <RocketOutlined />, label: '策略' },
  { key: '/monitor', icon: <MonitorOutlined />, label: '监控' },
  { key: '/backtest', icon: <ExperimentOutlined />, label: '回测' },
  { key: '/users', icon: <TeamOutlined />, label: '用户管理' },
  { key: '/account', icon: <BankOutlined />, label: '券商账户' },
  { key: '/settings', icon: <SettingOutlined />, label: '系统设置' },
  { key: '/logs', icon: <FileTextOutlined />, label: '日志' },
  { key: '/about', icon: <InfoCircleOutlined />, label: '关于' },
];

function ModeIndicator({ onOpenChange }: { onOpenChange?: (open: boolean) => void }) {
  const { mode, fetchMode, setMode } = useTradingModeStore();
  useEffect(() => { fetchMode(); }, [fetchMode]);

  const config: Record<string, { label: string; color: string; bg: string }> = {
    live: { label: '实盘', color: '#f87171', bg: 'rgba(248, 113, 113, 0.12)' },
    paper: { label: '模拟盘', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.12)' },
    mock: { label: 'MOCK', color: '#34d399', bg: 'rgba(52, 211, 153, 0.12)' },
  };

  const handleModeChange = async (newMode: 'live' | 'paper' | 'mock') => {
    try {
      await setMode(newMode);
      message.success(`已切换到${config[newMode].label}模式`);
    } catch (error: unknown) {
      const err = error as ApiError;
      const msg = err.response?.data?.message || err.response?.data?.detail;
      // 交易模式切换失败，按模式提供具体提示
      if (newMode === 'live') {
        message.error(msg || '切换到实盘模式失败，请检查实盘账号配置和API密钥');
      } else if (newMode === 'paper') {
        message.error(msg || '切换到模拟盘模式失败，请检查模拟盘账号配置');
      } else {
        message.error(msg || '切换到MOCK模式失败');
      }
    }
  };

  return (
    <Select
      value={mode}
      onChange={handleModeChange}
      onOpenChange={onOpenChange}
      size="small"
      style={{ width: 100 }}
      options={[
        { label: 'MOCK', value: 'mock' },
        { label: '模拟盘', value: 'paper' },
        { label: '实盘', value: 'live' },
      ]}
    />
  );
}

export default function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [username, setUsername] = useState('');
  const [modeDropdownOpen, setModeDropdownOpen] = useState(false);
  const [brokerDropdownOpen, setBrokerDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { broker, setBroker } = useBrokerStore();
  const connected = useWebSocketStatus();
  const isDark = useThemeStore((s) => s.mode) === 'dark';

  // 检测移动端
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await authService.getCurrentUser();
        setUsername(user.username);
      } catch (error) {
        console.error('获取用户信息失败', error);
      }
    };
    if (import.meta.env.VITE_AUTH_ENABLED === 'true') {
      fetchUser();
    }
  }, []);

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  const handleRestart = async () => {
    setRestarting(true);
    try {
      await systemApi.restart();
      message.success('服务正在重启，请稍候...');
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } catch {
      message.error('重启失败');
      setRestarting(false);
    }
  };

  const userMenuItems = [
    {
      key: 'users',
      icon: <TeamOutlined />,
      label: '用户管理',
      onClick: () => navigate('/users'),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '系统设置',
      onClick: () => navigate('/settings'),
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出',
      onClick: handleLogout,
    },
  ];

  // 导航渲染函数（桌面侧边栏）
  const renderDesktopNav = (item: { key: string; icon: React.ReactNode; label: string }) => {
    const isActive = location.pathname === item.key;
    return (
      <Tooltip key={item.key} title={collapsed ? item.label : ''} placement="right">
        <Link
          to={item.key}
          style={{
            width: collapsed ? 44 : '100%',
            height: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            paddingLeft: collapsed ? 0 : 16,
            gap: 12,
            borderRadius: 'var(--radius-sm)',
            fontSize: 18,
            color: isActive ? 'var(--cyan-400)' : 'var(--text-tertiary)',
            background: isActive ? 'rgba(34, 211, 238, 0.1)' : 'transparent',
            transition: 'all 0.2s var(--ease-out)',
            position: 'relative',
            textDecoration: 'none',
            margin: collapsed ? 0 : '0 8px',
          }}
          onMouseEnter={e => {
            if (!isActive) {
              e.currentTarget.style.color = 'var(--text-primary)';
              e.currentTarget.style.background = 'rgba(148, 163, 184, 0.06)';
            }
          }}
          onMouseLeave={e => {
            if (!isActive) {
              e.currentTarget.style.color = 'var(--text-tertiary)';
              e.currentTarget.style.background = 'transparent';
            }
          }}
        >
          {isActive && (
            <span style={{
              position: 'absolute',
              left: collapsed ? -10 : -8,
              width: 3,
              height: 20,
              borderRadius: '0 2px 2px 0',
              background: 'var(--cyan-400)',
              boxShadow: '0 0 8px rgba(34, 211, 238, 0.5)',
            }} />
          )}
          {item.icon}
          {!collapsed && (
            <span style={{
              fontSize: 13,
              fontWeight: 600,
              fontFamily: 'var(--font-sans)',
            }}>
              {item.label}
            </span>
          )}
        </Link>
      </Tooltip>
    );
  };

  return (
    <Layout style={{ minHeight: '100vh', background: 'var(--bg-void)' }}>
      {/* ─── Top Bar ─── */}
      <header style={{
        height: 48,
        background: 'var(--bg-base)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backdropFilter: 'blur(16px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 28,
              height: 28,
              borderRadius: 7,
              background: isDark
                ? 'linear-gradient(135deg, #22d3ee, #06b6d4)'
                : 'linear-gradient(135deg, #f59e0b, #d97706)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontWeight: 800,
              color: '#ffffff',
              fontFamily: 'var(--font-sans)',
              boxShadow: isDark
                ? '0 0 16px rgba(34, 211, 238, 0.3)'
                : '0 0 16px rgba(245, 158, 11, 0.25)',
            }}>
              Q
            </div>
            <span style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 15,
              fontWeight: 800,
              color: 'var(--text-primary)',
              letterSpacing: '-0.03em',
            }}>
              Quant<span style={{ color: 'var(--cyan-400)' }}>Apex</span>
            </span>
          </div>

          {/* Divider */}
          <div style={{
            width: 1,
            height: 20,
            background: 'var(--border-default)',
            margin: '0 4px',
          }} className="hide-mobile" />

          {/* Mode selector - hidden on small mobile */}
          <div className="hide-mobile">
            <Tooltip title="切换交易模式：测试/模拟盘/实盘" open={!modeDropdownOpen && undefined}>
              <div>
                <ModeIndicator onOpenChange={setModeDropdownOpen} />
              </div>
            </Tooltip>
          </div>

          {/* Divider */}
          <div style={{
            width: 1,
            height: 20,
            background: 'var(--border-default)',
            margin: '0 4px',
          }} className="hide-mobile" />

          {/* Broker selector - hidden on small mobile */}
          <div className="hide-mobile">
            <Tooltip title="选择券商平台" open={!brokerDropdownOpen && undefined}>
              <Select
                value={broker}
                onChange={setBroker}
                onOpenChange={setBrokerDropdownOpen}
                style={{ width: 130 }}
                size="small"
                suffixIcon={<BankOutlined />}
                options={[
                  { label: 'OKX', value: 'okx' },
                  { label: '国金证券', value: 'guojin' },
                  { label: 'moomoo', value: 'moomoo' },
                ]}
              />
            </Tooltip>
          </div>

          {/* Mobile menu button */}
          {isMobile && (
            <Button
              icon={<MoreOutlined />}
              size="small"
              onClick={() => setMobileMenuOpen(true)}
              style={{
                color: 'var(--text-secondary)',
                borderColor: 'var(--border-default)',
              }}
            />
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
            {new Date().toLocaleTimeString('zh-CN', { hour12: false })}
          </span>
          <div className="hide-mobile" style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
            color: connected ? 'var(--gain)' : 'var(--loss)',
          }}>
            <span style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: connected ? 'var(--gain)' : 'var(--loss)',
              boxShadow: connected ? '0 0 6px var(--gain)' : '0 0 6px var(--loss)',
            }} />
            {connected ? 'CONNECTED' : 'DISCONNECTED'}
          </div>
          <Tooltip title="重启服务" className="hide-mobile">
            <Button
              icon={<ReloadOutlined spin={restarting} />}
              onClick={handleRestart}
              loading={restarting}
              size="small"
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 12,
                fontWeight: 500,
                color: 'var(--text-secondary)',
                borderColor: 'var(--border-default)',
              }}
            />
          </Tooltip>

          {/* 主题切换 */}
          <ThemeToggle />
          {import.meta.env.VITE_AUTH_ENABLED === 'true' && (
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Button
                icon={<UserOutlined />}
                size="small"
                className="hide-mobile"
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 12,
                  fontWeight: 500,
                  color: 'var(--text-secondary)',
                  borderColor: 'var(--border-default)',
                }}
              >
                {username || 'User'}
              </Button>
            </Dropdown>
          )}
        </div>

        {/* 顶部进度条：切换交易模式时显示 */}
        <TopProgressBar />
      </header>

      <Layout style={{ background: 'var(--bg-void)', display: 'flex', flexDirection: 'row' }}>
        {/* ─── Desktop Sidebar Rail ─── */}
        <nav
          className="desktop-sidebar"
          style={{
            width: collapsed ? 64 : 200,
            flexShrink: 0,
            background: 'var(--bg-base)',
            borderRight: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: collapsed ? 'center' : 'stretch',
            paddingTop: 12,
            gap: 4,
            position: 'sticky',
            top: 48,
            height: 'calc(100vh - 48px)',
            overflowY: 'auto',
            transition: 'width 0.3s var(--ease-out)',
          }}
        >
          {allNavItems.map(renderDesktopNav)}

          {/* Toggle Button */}
          <div style={{ marginTop: 'auto', padding: '12px 0' }}>
            <button
              onClick={() => setCollapsed(!collapsed)}
              style={{
                width: collapsed ? 44 : '100%',
                height: 44,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                background: 'transparent',
                color: 'var(--text-tertiary)',
                fontSize: 18,
                cursor: 'pointer',
                borderRadius: 'var(--radius-sm)',
                transition: 'all 0.2s var(--ease-out)',
                margin: collapsed ? 0 : '0 8px',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = 'var(--text-primary)';
                e.currentTarget.style.background = 'rgba(148, 163, 184, 0.06)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = 'var(--text-tertiary)';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </button>
          </div>
        </nav>

        {/* ─── Content Area ─── */}
        <Content
          className="page-content"
          style={{
            padding: '28px 32px',
            background: 'var(--bg-void)',
            minHeight: 'calc(100vh - 48px)',
            position: 'relative',
            flex: 1,
          }}
        >
          {/* Subtle ambient gradient */}
          <div className="ambient-gradient-top" style={{
            position: 'fixed',
            top: 0,
            right: 0,
            width: '50%',
            height: '50%',
            background: 'radial-gradient(ellipse at 80% 20%, rgba(34, 211, 238, 0.03) 0%, transparent 60%)',
            pointerEvents: 'none',
            zIndex: 0,
          }} />
          <div className="ambient-gradient-bottom" style={{
            position: 'fixed',
            bottom: 0,
            left: '20%',
            width: '40%',
            height: '40%',
            background: 'radial-gradient(ellipse at 30% 80%, rgba(245, 158, 11, 0.02) 0%, transparent 60%)',
            pointerEvents: 'none',
            zIndex: 0,
          }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <Outlet />
          </div>
        </Content>
      </Layout>

      {/* ─── Mobile Bottom Tab Bar ─── */}
      {isMobile && (
        <nav className="bottom-tab-bar">
          {coreNavItems.map(item => {
            const isActive = location.pathname === item.key;
            return (
              <Link
                key={item.key}
                to={item.key}
                className={`bottom-tab-item ${isActive ? 'active' : ''}`}
                style={{ position: 'relative' }}
              >
                <span className="bottom-tab-icon">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
          {/* More tab opens drawer */}
          <button
            className="bottom-tab-item"
            onClick={() => setMobileMenuOpen(true)}
            style={{ background: 'none', border: 'none' }}
          >
            <span className="bottom-tab-icon"><MoreOutlined /></span>
            <span>更多</span>
          </button>
        </nav>
      )}

      {/* ─── Mobile Drawer Menu ─── */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 28,
              height: 28,
              borderRadius: 7,
              background: isDark
                ? 'linear-gradient(135deg, #22d3ee, #06b6d4)'
                : 'linear-gradient(135deg, #f59e0b, #d97706)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontWeight: 800,
              color: '#ffffff',
            }}>
              Q
            </div>
            <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: 15 }}>
              Quant<span style={{ color: 'var(--cyan-400)' }}>Apex</span>
            </span>
          </div>
        }
        placement="bottom"
        onClose={() => setMobileMenuOpen(false)}
        open={mobileMenuOpen}
        closeIcon={null}
        styles={{
          header: {
            background: 'var(--bg-base)',
            borderBottom: '1px solid var(--border-subtle)',
            padding: '12px 20px',
          },
          body: {
            background: 'var(--bg-base)',
            padding: '8px 0',
          },
          mask: {
            background: 'rgba(0, 0, 0, 0.6)',
          },
        }}
        style={{ height: '70vh' }}
      >
        {/* 交易模式切换 */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>
            交易模式
          </div>
          <ModeIndicator onOpenChange={setModeDropdownOpen} />
        </div>

        {/* 券商选择 */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>
            券商平台
          </div>
          <Select
            value={broker}
            onChange={setBroker}
            style={{ width: '100%' }}
            suffixIcon={<BankOutlined />}
            options={[
              { label: 'OKX', value: 'okx' },
              { label: '国金证券', value: 'guojin' },
              { label: 'moomoo', value: 'moomoo' },
            ]}
          />
        </div>

        {/* 连接状态 */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: connected ? 'var(--gain)' : 'var(--loss)',
            boxShadow: connected ? '0 0 8px var(--gain)' : '0 0 8px var(--loss)',
          }} />
          <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: connected ? 'var(--gain)' : 'var(--loss)' }}>
            {connected ? '已连接' : '未连接'}
          </span>
        </div>

        {/* 主题切换 */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>
            外观主题
          </div>
          <button
            onClick={() => { useThemeStore.getState().toggleMode(); }}
            style={{
              width: '100%',
              height: 36,
              borderRadius: 8,
              border: '1px solid var(--border-default)',
              background: 'transparent',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              fontSize: 13,
              fontFamily: 'var(--font-sans)',
              fontWeight: 500,
              transition: 'all 0.2s var(--ease-out)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--border-accent)';
              e.currentTarget.style.background = 'var(--bg-raised)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border-default)';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            {useThemeStore((s) => s.mode) === 'dark' ? <SunIcon /> : <MoonIcon />}
            {useThemeStore((s) => s.mode) === 'dark' ? '切换到亮色主题' : '切换到暗色主题'}
          </button>
        </div>

        {/* 导航列表 */}
        <div style={{ padding: '8px 0' }}>
          {allNavItems.filter(item => !coreNavItems.some(c => c.key === item.key)).map(item => {
            const isActive = location.pathname === item.key;
            return (
              <Link
                key={item.key}
                to={item.key}
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '14px 20px',
                  color: isActive ? 'var(--cyan-400)' : 'var(--text-secondary)',
                  background: isActive ? 'rgba(34, 211, 238, 0.08)' : 'transparent',
                  textDecoration: 'none',
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: 'var(--font-sans)',
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: 18 }}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* 底部操作 */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-subtle)', marginTop: 'auto' }}>
          <Button
            icon={<ReloadOutlined spin={restarting} />}
            onClick={handleRestart}
            loading={restarting}
            block
            style={{ marginBottom: 8 }}
          >
            重启服务
          </Button>
          {import.meta.env.VITE_AUTH_ENABLED === 'true' && (
            <Button icon={<LogoutOutlined />} onClick={handleLogout} block danger>
              退出登录
            </Button>
          )}
        </div>
      </Drawer>

      {/* Noise overlay */}
      <div className="noise-overlay" />
    </Layout>
  );
}
