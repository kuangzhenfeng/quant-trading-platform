import { useState, useEffect, useCallback } from 'react';
import { Select, App } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, WalletOutlined, DollarOutlined, LockOutlined } from '@ant-design/icons';
import { tradingApi, type AccountData } from '../services/trading';

export default function Dashboard() {
  const { message } = App.useApp();
  const [broker, setBroker] = useState('okx');
  const [account, setAccount] = useState<AccountData | null>(null);

  const loadAccount = useCallback(async () => {
    try {
      const acc = await tradingApi.getAccount(broker);
      setAccount(acc);
    } catch {
      message.error('加载账户数据失败');
    }
  }, [broker, message]);

  useEffect(() => {
    loadAccount();
  }, [loadAccount]);

  useEffect(() => {
    const interval = setInterval(loadAccount, 5000);
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

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">账户总览与资产概况</p>
      </div>

      {/* Broker Selector */}
      <div className="animate-in" style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 16px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        marginBottom: 24,
      }}>
        <span style={{
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--text-tertiary)',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          fontFamily: 'var(--font-sans)',
        }}>
          平台
        </span>
        <Select
          value={broker}
          onChange={setBroker}
          style={{ width: 140 }}
          options={[
            { label: 'OKX', value: 'okx' },
            { label: '国金证券', value: 'guojin' },
            { label: 'moomoo', value: 'moomoo' },
          ]}
        />
      </div>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 16,
        marginBottom: 24,
      }}>
        {/* Balance */}
        <div className="apex-stat animate-in stagger-1" style={{ gridColumn: 'span 1' }}>
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
            }}>
              <WalletOutlined />
            </div>
            <span className="apex-stat-label" style={{ marginBottom: 0 }}>账户余额</span>
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
        <div className="apex-stat animate-in stagger-2">
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
            }}>
              <DollarOutlined />
            </div>
            <span className="apex-stat-label" style={{ marginBottom: 0 }}>可用资金</span>
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
        <div className="apex-stat animate-in stagger-3">
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
            <span className="apex-stat-label" style={{ marginBottom: 0 }}>冻结资金</span>
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
            color: usagePercent > 80 ? 'var(--loss)' : usagePercent > 50 ? 'var(--amber-400)' : 'var(--cyan-400)',
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
            background: usagePercent > 80
              ? 'linear-gradient(90deg, var(--amber-400), var(--loss))'
              : 'linear-gradient(90deg, var(--cyan-500), var(--cyan-400))',
            transition: 'width 0.8s var(--ease-out)',
            boxShadow: usagePercent > 80
              ? '0 0 12px rgba(248, 113, 113, 0.4)'
              : '0 0 12px rgba(34, 211, 238, 0.3)',
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
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
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
            background: 'var(--gain-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            color: 'var(--gain)',
          }}>
            <ArrowUpOutlined />
          </div>
        </div>

        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
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
            background: 'rgba(148, 163, 184, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            color: 'var(--text-tertiary)',
          }}>
            <ArrowDownOutlined />
          </div>
        </div>
      </div>
    </div>
  );
}
