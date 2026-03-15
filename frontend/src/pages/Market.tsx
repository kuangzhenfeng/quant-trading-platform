import { useState, useCallback } from 'react';
import { Select, Button, Table } from 'antd';
import { ThunderboltOutlined, WifiOutlined } from '@ant-design/icons';
import { useMarketWebSocket } from '../hooks/useMarketWebSocket';

interface TickData {
  symbol: string;
  price: number;
  volume: number;
  timestamp: string;
}

export default function Market() {
  const [ticks, setTicks] = useState<Record<string, TickData>>({});
  const [broker, setBroker] = useState('okx');
  const [subscribed, setSubscribed] = useState(false);

  const handleTick = useCallback((tick: TickData) => {
    setTicks(prev => ({ ...prev, [tick.symbol]: tick }));
  }, []);

  const { subscribe } = useMarketWebSocket('client-1', handleTick);

  const handleSubscribe = () => {
    const symbols = broker === 'okx'
      ? ['BTC-USDT', 'ETH-USDT']
      : broker === 'guojin'
      ? ['600000.SH', '000001.SZ']
      : ['AAPL', 'TSLA'];

    subscribe(broker, symbols);
    setSubscribed(true);
  };

  const columns = [
    {
      title: '代码',
      dataIndex: 'symbol',
      key: 'symbol',
      render: (v: string) => (
        <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{v}</span>
      )
    },
    {
      title: '价格',
      dataIndex: 'price',
      key: 'price',
      render: (price: number) => (
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontWeight: 700,
          fontSize: 15,
          color: 'var(--cyan-400)',
        }}>
          {price?.toFixed(2) || '—'}
        </span>
      )
    },
    {
      title: '成交量',
      dataIndex: 'volume',
      key: 'volume',
      render: (vol: number) => (
        <span style={{
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-secondary)',
        }}>
          {vol?.toLocaleString() || '—'}
        </span>
      )
    },
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (t: string) => (
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          color: 'var(--text-muted)',
        }}>
          {t ? new Date(t).toLocaleTimeString('zh-CN', { hour12: false }) : '—'}
        </span>
      )
    },
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Market</h1>
        <p className="page-subtitle">实时行情数据流</p>
      </div>

      {/* Control Bar */}
      <div className="animate-in" style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '14px 20px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        marginBottom: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--text-tertiary)',
            textTransform: 'uppercase',
            letterSpacing: '1px',
          }}>
            平台
          </span>
          <Select
            value={broker}
            onChange={v => { setBroker(v); setSubscribed(false); }}
            style={{ width: 150 }}
            options={[
              { label: 'OKX', value: 'okx' },
              { label: '国金证券', value: 'guojin' },
              { label: 'moomoo', value: 'moomoo' },
            ]}
          />
        </div>

        <Button
          type="primary"
          onClick={handleSubscribe}
          icon={<ThunderboltOutlined />}
          style={{
            fontWeight: 600,
          }}
        >
          订阅行情
        </Button>

        {subscribed && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginLeft: 'auto',
            fontSize: 12,
            fontFamily: 'var(--font-mono)',
            color: 'var(--gain)',
          }}>
            <WifiOutlined style={{ animation: 'pulse-soft 2s ease-in-out infinite' }} />
            STREAMING
          </div>
        )}
      </div>

      {/* Data Table */}
      <div className="animate-in stagger-2" style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '14px 24px',
          borderBottom: '1px solid var(--border-default)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-sans)',
          }}>
            行情数据
          </span>
          <span style={{
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-muted)',
          }}>
            {Object.keys(ticks).length} 标的
          </span>
        </div>
        <Table
          columns={columns}
          dataSource={Object.values(ticks)}
          rowKey="symbol"
          pagination={false}
          locale={{
            emptyText: (
              <div style={{
                padding: '48px 0',
                textAlign: 'center',
                color: 'var(--text-muted)',
              }}>
                <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>📡</div>
                <div style={{ fontSize: 13 }}>点击"订阅行情"开始接收数据</div>
              </div>
            )
          }}
        />
      </div>
    </div>
  );
}
