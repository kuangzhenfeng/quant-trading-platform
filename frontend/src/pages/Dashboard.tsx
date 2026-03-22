import { useState, useEffect, useCallback, useRef } from 'react';
import { App } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, WalletOutlined, DollarOutlined, LockOutlined } from '@ant-design/icons';
import { tradingApi, type AccountData } from '../services/trading';
import { useBrokerStore } from '../stores/brokerStore';
import { useTradingModeStore } from '../stores/tradingModeStore';
import axios from 'axios';

/* ─── Local styles (same file, no new CSS file) ─── */
const localStyles = `
  @keyframes scan-line-dashboard {
    0%   { left: -100%; }
    100% { left: 200%; }
  }

  .apex-stat-dash {
    padding: 20px 24px;
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    position: relative;
    overflow: hidden;
    transition: all 0.35s var(--ease-out);
  }

  .apex-stat-dash::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 60%;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--cyan-400), transparent);
    animation: scan-line-dashboard 4s linear infinite;
    opacity: 0.6;
    z-index: 1;
    pointer-events: none;
  }

  .apex-stat-dash::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, var(--cyan-400), var(--cyan-600));
    opacity: 0;
    transition: opacity 0.3s;
  }

  .apex-stat-dash:hover {
    border-color: var(--border-accent);
    transform: translateY(-3px);
    box-shadow: 0 8px 32px rgba(34, 211, 238, 0.08), 0 2px 8px rgba(0, 0, 0, 0.4);
  }

  .apex-stat-dash:hover::after {
    opacity: 1;
  }

  .icon-glow-cyan {
    box-shadow: 0 0 16px rgba(34, 211, 238, 0.18), 0 0 4px rgba(34, 211, 238, 0.1);
  }

  .icon-glow-gain {
    box-shadow: 0 0 16px rgba(52, 211, 153, 0.18), 0 0 4px rgba(52, 211, 153, 0.1);
  }

  .quick-stat-card {
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    padding: 16px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: relative;
    overflow: hidden;
    transition: all 0.3s var(--ease-out);
    border-left: 3px solid transparent;
  }

  .quick-stat-card:hover {
    border-left-color: var(--cyan-400);
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(34, 211, 238, 0.06);
  }

  .quick-stat-icon-gain {
    background: rgba(52, 211, 153, 0.12);
    box-shadow: 0 0 12px rgba(52, 211, 153, 0.1);
  }

  .quick-stat-icon-neutral {
    background: rgba(148, 163, 184, 0.08);
  }

  /* Light theme — Dashboard */
  [data-theme="light"] .apex-stat-dash::before {
    background: linear-gradient(90deg, transparent, var(--cyan-400), transparent);
  }

  [data-theme="light"] .apex-stat-dash:hover {
    box-shadow: 0 4px 16px rgba(245, 158, 11, 0.08), 0 2px 4px rgba(0, 0, 0, 0.06);
  }

  [data-theme="light"] .icon-glow-cyan {
    box-shadow: 0 0 12px rgba(245, 158, 11, 0.15);
  }

  [data-theme="light"] .icon-glow-gain {
    box-shadow: 0 0 12px rgba(5, 150, 105, 0.15);
  }

  [data-theme="light"] .quick-stat-card:hover {
    border-left-color: var(--amber-400);
    box-shadow: 0 4px 16px rgba(245, 158, 11, 0.08);
  }

  [data-theme="light"] .quick-stat-icon-gain {
    background: rgba(5, 150, 105, 0.1);
    box-shadow: 0 0 10px rgba(5, 150, 105, 0.1);
  }
`;

export default function Dashboard() {
  const { message } = App.useApp();
  const { broker } = useBrokerStore();
  const { mode } = useTradingModeStore();
  const [account, setAccount] = useState<AccountData | null>(null);
  const hasErrorRef = useRef(false);
  // 账户未配置时停止轮询，避免大量无效 404 请求
  const accountNotFoundRef = useRef(false);

  const loadAccount = useCallback(async () => {
    try {
      const acc = await tradingApi.getAccount(broker);
      setAccount(acc);
      hasErrorRef.current = false;
      accountNotFoundRef.current = false;
    } catch (err) {
      // 404 表示券商账号尚未配置，静默处理，显示空数据，停止轮询
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        setAccount(null);
        accountNotFoundRef.current = true;
        return;
      }
      // 其他错误仅在首次失败时提示，避免轮询产生重复错误消息
      if (!hasErrorRef.current) {
        message.error('加载账户数据失败');
        hasErrorRef.current = true;
      }
    }
  }, [broker, message]);

  useEffect(() => {
    // broker 或 mode 切换时重置未找到标志，立即刷新
    accountNotFoundRef.current = false;
    loadAccount();
  }, [loadAccount, mode]);

  useEffect(() => {
    const interval = setInterval(() => {
      // 账户未配置时不再轮询
      if (!accountNotFoundRef.current) {
        void loadAccount();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [loadAccount]);

  const balance = account?.balance || 0;
  const available = account?.available || 0;
  const frozen = account?.frozen || 0;
  const usagePercent = balance > 0 ? ((balance - available) / balance * 100) : 0;

  const brokerLabels: Record<string, { name: string; currency: string }> = {
    okx: { name: 'OKX', currency: 'USDT' },
    guojin: { name: '国金证券', currency: 'CNY' },
    moomoo: { name: 'moomoo', currency: 'USD' },
  };

  const currencySymbol: Record<string, string> = {
    USDT: '$', CNY: '¥', USD: '$',
  };

  const curr = brokerLabels[broker]?.currency || 'USDT';
  const sym = currencySymbol[curr];

  // Progress bar gradient logic
  const progressBarGradient = usagePercent > 80
    ? 'linear-gradient(90deg, var(--amber-400), var(--loss))'
    : usagePercent > 50
      ? 'linear-gradient(90deg, var(--cyan-500), var(--cyan-400))'
      : 'linear-gradient(90deg, var(--cyan-500), var(--cyan-400))';

  const progressBarGlow = usagePercent > 80
    ? '0 0 14px rgba(248, 113, 113, 0.45), 0 0 6px rgba(251, 191, 36, 0.2)'
    : '0 0 14px rgba(34, 211, 238, 0.35), 0 0 4px rgba(34, 211, 238, 0.15)';

  const progressBarColor = usagePercent > 80 ? 'var(--loss)' : usagePercent > 50 ? 'var(--amber-400)' : 'var(--cyan-400)';

  return (
    <>
      <style>{localStyles}</style>
      <div>
        <div className="page-header">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">账户总览与资产概况</p>
        </div>

        {/* Stats Grid */}
        <div className="animate-in stagger-1" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 16,
          marginBottom: 24,
        }}>
          {/* Balance */}
          <div className="apex-stat-dash">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'rgba(34, 211, 238, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--cyan-400)',
                fontSize: 15,
              }}
              className="icon-glow-cyan"
              >
                <WalletOutlined />
              </div>
              <span style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--text-tertiary)',
                textTransform: 'uppercase',
                letterSpacing: '1.2px',
                marginBottom: 0,
              }}>
                账户余额
              </span>
            </div>
            <div className="apex-stat-value cyan">
              {sym}{balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style={{
              marginTop: 12,
              fontSize: 11,
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
            }}>
              {brokerLabels[broker]?.name} · {curr}
            </div>
          </div>

          {/* Available */}
          <div className="apex-stat-dash">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'rgba(52, 211, 153, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--gain)',
                fontSize: 15,
              }}
              className="icon-glow-gain"
              >
                <DollarOutlined />
              </div>
              <span style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--text-tertiary)',
                textTransform: 'uppercase',
                letterSpacing: '1.2px',
                marginBottom: 0,
              }}>
                可用资金
              </span>
            </div>
            <div className="apex-stat-value gain">
              {sym}{available.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style={{
              marginTop: 12,
              fontSize: 11,
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
            }}>
              {balance > 0 ? `${((available / balance) * 100).toFixed(1)}% 可用` : '—'}
            </div>
          </div>

          {/* Frozen */}
          <div className="apex-stat-dash">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'rgba(148, 163, 184, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-tertiary)',
                fontSize: 15,
              }}>
                <LockOutlined />
              </div>
              <span style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--text-tertiary)',
                textTransform: 'uppercase',
                letterSpacing: '1.2px',
                marginBottom: 0,
              }}>
                冻结资金
              </span>
            </div>
            <div className="apex-stat-value" style={{ color: 'var(--text-secondary)' }}>
              {sym}{frozen.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style={{
              marginTop: 12,
              fontSize: 11,
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
            }}>
              {balance > 0 ? `${((frozen / balance) * 100).toFixed(1)}% 冻结` : '—'}
            </div>
          </div>
        </div>

        {/* Usage Bar */}
        <div className="animate-in stagger-4" style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '20px 24px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              fontFamily: 'var(--font-sans)',
            }}>
              资金使用率
            </span>
            <span style={{
              fontSize: 13,
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              color: progressBarColor,
            }}>
              {usagePercent.toFixed(1)}%
            </span>
          </div>
          <div style={{
            height: 6,
            background: 'var(--bg-elevated)',
            borderRadius: 99,
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${Math.min(usagePercent, 100)}%`,
              borderRadius: 99,
              background: progressBarGradient,
              boxShadow: progressBarGlow,
              transition: 'width 0.8s var(--ease-out), box-shadow 0.4s ease',
            }} />
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 10,
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-muted)',
          }}>
            <span>已用 {sym}{(balance - available).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            <span>总计 {sym}{balance.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="animate-in stagger-5" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 16,
          marginTop: 16,
        }}>
          <div className="quick-stat-card">
            <div>
              <div style={{
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--text-tertiary)',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: 4,
                fontFamily: 'var(--font-sans)',
              }}>
                日盈亏
              </div>
              <div style={{
                fontSize: 18,
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                color: 'var(--gain)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                <ArrowUpOutlined style={{ fontSize: 14 }} />
                +0.00%
              </div>
            </div>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              color: 'var(--gain)',
            }}
            className="quick-stat-icon-gain"
            >
              <ArrowUpOutlined />
            </div>
          </div>

          <div className="quick-stat-card">
            <div>
              <div style={{
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--text-tertiary)',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: 4,
                fontFamily: 'var(--font-sans)',
              }}>
                周盈亏
              </div>
              <div style={{
                fontSize: 18,
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                <ArrowDownOutlined style={{ fontSize: 14 }} />
                0.00%
              </div>
            </div>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              color: 'var(--text-tertiary)',
            }}
            className="quick-stat-icon-neutral"
            >
              <ArrowDownOutlined />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
