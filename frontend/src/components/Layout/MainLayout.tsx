import { useState, useEffect } from 'react';
import { Layout, Tooltip } from 'antd';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  LineChartOutlined,
  SwapOutlined,
  RocketOutlined,
  MonitorOutlined,
  UserOutlined,
  FileTextOutlined,
  ExperimentOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import { useTradingModeStore } from '../../stores/tradingModeStore';

const { Content } = Layout;

const navItems = [
  { key: '/', icon: <DashboardOutlined />, label: '仪表盘' },
  { key: '/market', icon: <LineChartOutlined />, label: '行情' },
  { key: '/trading', icon: <SwapOutlined />, label: '交易' },
  { key: '/strategy', icon: <RocketOutlined />, label: '策略' },
  { key: '/monitor', icon: <MonitorOutlined />, label: '监控' },
  { key: '/account', icon: <UserOutlined />, label: '账户' },
  { key: '/logs', icon: <FileTextOutlined />, label: '日志' },
  { key: '/backtest', icon: <ExperimentOutlined />, label: '回测' },
];

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
      {time.toLocaleTimeString('zh-CN', { hour12: false })}
    </span>
  );
}

function ModeIndicator() {
  const { mode, fetchMode } = useTradingModeStore();
  useEffect(() => { fetchMode(); }, [fetchMode]);

  const config: Record<string, { label: string; color: string; bg: string }> = {
    live: { label: 'LIVE', color: '#f87171', bg: 'rgba(248, 113, 113, 0.12)' },
    paper: { label: 'PAPER', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.12)' },
    mock: { label: 'MOCK', color: '#34d399', bg: 'rgba(52, 211, 153, 0.12)' },
  };
  const c = config[mode];

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '3px 10px',
      borderRadius: 99,
      background: c.bg,
      border: `1px solid ${c.color}30`,
      fontSize: 10,
      fontWeight: 700,
      fontFamily: 'var(--font-mono)',
      color: c.color,
      letterSpacing: '1.5px',
    }}>
      <span style={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: c.color,
        boxShadow: `0 0 8px ${c.color}80`,
        animation: mode === 'live' ? 'pulse-soft 1.5s ease-in-out infinite' : 'none',
      }} />
      {c.label}
    </div>
  );
}

export default function MainLayout() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

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
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            <div style={{
              width: 28,
              height: 28,
              borderRadius: 7,
              background: 'linear-gradient(135deg, #22d3ee, #06b6d4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontWeight: 800,
              color: '#0b0c10',
              fontFamily: 'var(--font-sans)',
              boxShadow: '0 0 16px rgba(34, 211, 238, 0.3)',
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

          <div style={{
            width: 1,
            height: 20,
            background: 'var(--border-default)',
            margin: '0 4px',
          }} />

          <ModeIndicator />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <LiveClock />
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
            color: 'var(--gain)',
          }}>
            <span style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--gain)',
              boxShadow: '0 0 6px var(--gain)',
            }} />
            CONNECTED
          </div>
        </div>
      </header>

      <Layout style={{ background: 'var(--bg-void)', display: 'flex', flexDirection: 'row' }}>
        {/* ─── Sidebar Rail ─── */}
        <nav style={{
          width: collapsed ? 64 : 200,
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
        }}>
          {navItems.map(item => {
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
                    color: isActive ? '#22d3ee' : 'var(--text-tertiary)',
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
                      background: '#22d3ee',
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
          })}

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
        <Content style={{
          padding: '28px 32px',
          background: 'var(--bg-void)',
          minHeight: 'calc(100vh - 48px)',
          position: 'relative',
        }}>
          {/* Subtle ambient gradient */}
          <div style={{
            position: 'fixed',
            top: 0,
            right: 0,
            width: '50%',
            height: '50%',
            background: 'radial-gradient(ellipse at 80% 20%, rgba(34, 211, 238, 0.03) 0%, transparent 60%)',
            pointerEvents: 'none',
            zIndex: 0,
          }} />
          <div style={{
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

      {/* Noise overlay */}
      <div className="noise-overlay" />
    </Layout>
  );
}
