import { useState, useCallback, useEffect } from 'react';
import { Button, Table, Segmented } from 'antd';
import { ThunderboltOutlined, WifiOutlined, DisconnectOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ComposedChart, Bar, CartesianGrid } from 'recharts';
import { useMarketWebSocket } from '../hooks/useMarketWebSocket';
import { useBrokerStore } from '../stores/brokerStore';

interface TickData {
  symbol: string;
  last_price: number;
  volume: number;
  timestamp: string;
}

interface PricePoint {
  time: string;
  price: number;
  volume: number;
}

export default function Market() {
  const [ticks, setTicks] = useState<Record<string, TickData>>({});
  const [priceHistory, setPriceHistory] = useState<Record<string, PricePoint[]>>({});
  const [openPrices, setOpenPrices] = useState<Record<string, number>>({});
  const [timeRange, setTimeRange] = useState<number>(60);
  const { broker } = useBrokerStore();
  const [subscribed, setSubscribed] = useState(false);

  const handleTick = useCallback((tick: TickData) => {
    setTicks(prev => ({ ...prev, [tick.symbol]: tick }));
    setOpenPrices(prev => {
      if (!prev[tick.symbol]) {
        return { ...prev, [tick.symbol]: tick.last_price };
      }
      return prev;
    });
    setPriceHistory(prev => {
      const history = prev[tick.symbol] || [];
      const newPoint = {
        time: new Date(tick.timestamp).toLocaleTimeString('zh-CN', { hour12: false }),
        price: tick.last_price,
        volume: tick.volume
      };
      const updated = [...history, newPoint].slice(-300);
      return { ...prev, [tick.symbol]: updated };
    });
  }, []);

  const { subscribe, unsubscribe } = useMarketWebSocket('client-1', handleTick);

  // 自动订阅逻辑
  useEffect(() => {
    if (!subscribed) return;

    const symbols = broker === 'okx'
      ? ['BTC-USDT', 'ETH-USDT']
      : broker === 'guojin'
      ? ['600000.SH', '000001.SZ']
      : ['AAPL', 'TSLA'];

    // 延迟订阅，等待 WebSocket 连接建立
    const timer = setTimeout(() => {
      subscribe(broker, symbols);
    }, 100);

    return () => clearTimeout(timer);
  }, [broker, subscribe, subscribed]);

  // 初始订阅
  useEffect(() => {
    const symbols = broker === 'okx'
      ? ['BTC-USDT', 'ETH-USDT']
      : broker === 'guojin'
      ? ['600000.SH', '000001.SZ']
      : ['AAPL', 'TSLA'];

    const timer = setTimeout(() => {
      subscribe(broker, symbols);
      setSubscribed(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const handleUnsubscribe = () => {
    unsubscribe();
    setSubscribed(false);
    setTicks({});
    setPriceHistory({});
    setOpenPrices({});
  };

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
      width: 140,
      render: (v: string) => (
        <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>{v}</span>
      )
    },
    {
      title: '最新价',
      dataIndex: 'last_price',
      key: 'last_price',
      width: 120,
      render: (price: number, record: TickData) => {
        const openPrice = openPrices[record.symbol];
        const change = openPrice ? ((price - openPrice) / openPrice) * 100 : 0;
        const isUp = change > 0;
        const isDown = change < 0;
        return (
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            fontSize: 16,
            color: isUp ? '#10b981' : isDown ? '#ef4444' : 'var(--text-primary)',
          }}>
            {price?.toFixed(2) || '—'}
          </span>
        );
      }
    },
    {
      title: '涨跌幅',
      key: 'change',
      width: 100,
      render: (_: any, record: TickData) => {
        const openPrice = openPrices[record.symbol];
        if (!openPrice) return <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>—</span>;
        const change = ((record.last_price - openPrice) / openPrice) * 100;
        const isUp = change > 0;
        const isDown = change < 0;
        return (
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
            fontSize: 13,
            color: isUp ? '#10b981' : isDown ? '#ef4444' : 'var(--text-muted)',
          }}>
            {isUp ? '+' : ''}{change.toFixed(2)}%
          </span>
        );
      }
    },
    {
      title: '成交量',
      dataIndex: 'volume',
      key: 'volume',
      width: 120,
      render: (vol: number) => (
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
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
      width: 100,
      render: (t: string) => (
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
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
        {subscribed ? (
          <Button
            danger
            onClick={handleUnsubscribe}
            icon={<DisconnectOutlined />}
            style={{
              fontWeight: 600,
            }}
          >
            取消订阅
          </Button>
        ) : (
          <Button
            type="primary"
            onClick={handleSubscribe}
            icon={<ThunderboltOutlined />}
            style={{
              fontWeight: 600,
            }}
          >
            开始订阅
          </Button>
        )}

        <div style={{ borderLeft: '1px solid var(--border-subtle)', height: 24 }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ClockCircleOutlined style={{ color: 'var(--text-muted)', fontSize: 13 }} />
          <Segmented
            size="small"
            value={timeRange}
            onChange={(val) => setTimeRange(val as number)}
            options={[
              { label: '1分钟', value: 60 },
              { label: '5分钟', value: 300 },
              { label: '15分钟', value: 900 },
            ]}
            style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}
          />
        </div>

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

      {/* Charts */}
      {Object.keys(ticks).length > 0 && (
        <div className="animate-in stagger-1" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
          gap: 16,
          marginBottom: 16,
        }}>
          {Object.entries(priceHistory)
            .filter(([_, data]) => data.length > 0)
            .map(([symbol, data]) => {
              const currentTick = ticks[symbol];
              const openPrice = openPrices[symbol];
              const change = openPrice ? ((currentTick.last_price - openPrice) / openPrice) * 100 : 0;
              const isUp = change > 0;
              const isDown = change < 0;
              const displayData = data.slice(-timeRange);

              return (
            <div key={symbol} style={{
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(51, 65, 85, 0.5)',
              borderRadius: 8,
              padding: '16px 18px',
              backdropFilter: 'blur(8px)',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                marginBottom: 14,
              }}>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  fontSize: 15,
                  color: '#e2e8f0',
                  letterSpacing: '0.02em',
                }}>
                  {symbol}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    fontSize: 18,
                    color: isUp ? '#10b981' : isDown ? '#ef4444' : '#94a3b8',
                  }}>
                    {currentTick.last_price.toFixed(2)}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 600,
                    fontSize: 12,
                    color: isUp ? '#10b981' : isDown ? '#ef4444' : '#64748b',
                  }}>
                    {isUp ? '+' : ''}{change.toFixed(2)}%
                  </span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <ComposedChart data={displayData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(51, 65, 85, 0.3)" />
                  <XAxis
                    dataKey="time"
                    stroke="#64748b"
                    style={{ fontSize: 9, fontFamily: 'var(--font-mono)' }}
                    tick={{ fill: '#64748b' }}
                  />
                  <YAxis
                    yAxisId="price"
                    stroke="#64748b"
                    style={{ fontSize: 9, fontFamily: 'var(--font-mono)' }}
                    domain={['dataMin - 0.5', 'dataMax + 0.5']}
                    tick={{ fill: '#64748b' }}
                  />
                  <YAxis
                    yAxisId="volume"
                    orientation="right"
                    stroke="#64748b"
                    style={{ fontSize: 9, fontFamily: 'var(--font-mono)' }}
                    tick={{ fill: '#64748b' }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(15, 23, 42, 0.95)',
                      border: '1px solid rgba(51, 65, 85, 0.8)',
                      borderRadius: 6,
                      fontSize: 11,
                      fontFamily: 'var(--font-mono)',
                      padding: '8px 10px',
                    }}
                    labelStyle={{ color: '#94a3b8', marginBottom: 4 }}
                  />
                  <Bar yAxisId="volume" dataKey="volume" fill="rgba(100, 116, 139, 0.3)" />
                  <Line
                    yAxisId="price"
                    type="monotone"
                    dataKey="price"
                    stroke={isUp ? '#10b981' : isDown ? '#ef4444' : '#06b6d4'}
                    strokeWidth={2}
                    dot={false}
                    animationDuration={300}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )})}
        </div>
      )}

      {/* Data Table */}
      <div className="animate-in stagger-2" style={{
        background: 'rgba(15, 23, 42, 0.6)',
        border: '1px solid rgba(51, 65, 85, 0.5)',
        borderRadius: 8,
        overflow: 'hidden',
        backdropFilter: 'blur(8px)',
      }}>
        <div style={{
          padding: '12px 20px',
          borderBottom: '1px solid rgba(51, 65, 85, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{
            fontSize: 12,
            fontWeight: 700,
            color: '#94a3b8',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}>
            实时行情
          </span>
          <span style={{
            fontSize: 10,
            fontFamily: 'var(--font-mono)',
            color: '#64748b',
            padding: '2px 8px',
            background: 'rgba(51, 65, 85, 0.4)',
            borderRadius: 4,
          }}>
            {Object.keys(ticks).length} 标的
          </span>
        </div>
        <Table
          columns={columns}
          dataSource={Object.values(ticks)}
          rowKey="symbol"
          pagination={false}
          size="small"
          locale={{
            emptyText: (
              <div style={{
                padding: '40px 0',
                textAlign: 'center',
                color: '#64748b',
              }}>
                <div style={{ fontSize: 28, marginBottom: 10, opacity: 0.4 }}>📡</div>
                <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}>点击"开始订阅"接收实时数据</div>
              </div>
            )
          }}
        />
      </div>
    </div>
  );
}
