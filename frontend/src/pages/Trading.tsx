import { useState, useEffect, useCallback } from 'react';
import { Select, Button, InputNumber, Radio, Table, App, Alert } from 'antd';
import { ThunderboltOutlined, WalletOutlined, DollarOutlined, LockOutlined } from '@ant-design/icons';
import { tradingApi, type PositionData, type AccountData } from '../services/trading';
import type { ApiError } from '../types/api';
import { useTradingModeStore } from '../stores/tradingModeStore';
import { useBrokerStore } from '../stores/brokerStore';

export default function Trading() {
  const { message } = App.useApp();
  const { mode, fetchMode } = useTradingModeStore();
  const { broker } = useBrokerStore();
  const [symbol, setSymbol] = useState('BTC-USDT');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [quantity, setQuantity] = useState<number>(0.01);
  const [price, setPrice] = useState<number>(70000);
  const [loading, setLoading] = useState(false);
  const [positions, setPositions] = useState<PositionData[]>([]);
  const [account, setAccount] = useState<AccountData | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [pos, acc] = await Promise.all([
        tradingApi.getPositions(broker),
        tradingApi.getAccount(broker)
      ]);
      setPositions(pos);
      setAccount(acc);
    } catch {
      message.error('加载数据失败');
    }
  }, [broker]);

  useEffect(() => {
    fetchMode();
    loadData();
  }, [broker, loadData, fetchMode]);

  useEffect(() => {
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handlePlaceOrder = async () => {
    setLoading(true);
    try {
      const result = await tradingApi.placeOrder({
        broker,
        symbol,
        side,
        type: orderType,
        quantity,
        price: orderType === 'limit' ? price : undefined
      });
      message.success(`下单成功: ${result.order_id}`);
      loadData();
    } catch (error: unknown) {
      message.error((error as ApiError).response?.data?.detail || '下单失败');
    } finally {
      setLoading(false);
    }
  };

  const positionColumns = [
    {
      title: '标的',
      dataIndex: 'symbol',
      key: 'symbol',
      render: (v: string) => (
        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{v}</span>
      )
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (v: number) => (
        <span style={{ fontFamily: 'var(--font-mono)' }}>{v}</span>
      )
    },
    {
      title: '均价',
      dataIndex: 'avg_price',
      key: 'avg_price',
      render: (v: number) => (
        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
          {v.toFixed(2)}
        </span>
      )
    },
    {
      title: '浮动盈亏',
      dataIndex: 'unrealized_pnl',
      key: 'unrealized_pnl',
      render: (v: number) => (
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontWeight: 600,
          color: v >= 0 ? 'var(--gain)' : 'var(--loss)',
        }}>
          {v >= 0 ? '+' : ''}{v.toFixed(2)}
        </span>
      )
    }
  ];

  const modeConfig: Record<string, { type: 'error' | 'warning' | 'info'; msg: string; icon: string }> = {
    live: { type: 'error', msg: '真实盘模式 — 真实资金交易，请谨慎操作', icon: '🔴' },
    paper: { type: 'warning', msg: '模拟盘模式 — 真实行情，模拟订单', icon: '🟡' },
    mock: { type: 'info', msg: 'Mock 模式 — 完全模拟环境', icon: '🟢' },
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Trading</h1>
        <p className="page-subtitle">下单交易与持仓管理</p>
      </div>

      <Alert
        type={modeConfig[mode].type}
        description={<span style={{ fontWeight: 600 }}>{modeConfig[mode].icon} {modeConfig[mode].msg}</span>}
        style={{ marginBottom: 20, borderRadius: 'var(--radius-md)' }}
        banner
      />

      {/* Account Stats */}
      <div className="animate-in" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 12,
        marginBottom: 20,
      }}>
        {[
          { label: '总资产', value: account?.balance || 0, icon: <WalletOutlined />, color: 'var(--cyan-400)', bg: 'rgba(34, 211, 238, 0.1)' },
          { label: '可用资金', value: account?.available || 0, icon: <DollarOutlined />, color: 'var(--gain)', bg: 'var(--gain-muted)' },
          { label: '冻结资金', value: account?.frozen || 0, icon: <LockOutlined />, color: 'var(--text-tertiary)', bg: 'rgba(148, 163, 184, 0.08)' },
        ].map((item, i) => (
          <div key={item.label} className={`apex-stat animate-in stagger-${i + 1}`}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ color: item.color, fontSize: 14 }}>{item.icon}</span>
              <span className="apex-stat-label" style={{ marginBottom: 0 }}>{item.label}</span>
            </div>
            <div className="apex-stat-value" style={{ fontSize: 22, color: item.color }}>
              {item.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        ))}
      </div>

      {/* Order Panel */}
      <div className="animate-in stagger-3" style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: 24,
        marginBottom: 20,
      }}>
        <div style={{
          fontSize: 13,
          fontWeight: 700,
          color: 'var(--text-secondary)',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontFamily: 'var(--font-sans)',
        }}>
          <ThunderboltOutlined style={{ color: 'var(--cyan-400)' }} />
          下单面板
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Row 1: Symbol */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>标的</span>
              <Select value={symbol} onChange={setSymbol} style={{ width: 160 }}>
                {broker === 'okx' && (
                  <>
                    <Select.Option value="BTC-USDT">BTC-USDT</Select.Option>
                    <Select.Option value="ETH-USDT">ETH-USDT</Select.Option>
                  </>
                )}
                {broker === 'guojin' && (
                  <>
                    <Select.Option value="600000">600000</Select.Option>
                    <Select.Option value="000001">000001</Select.Option>
                  </>
                )}
                {broker === 'moomoo' && (
                  <>
                    <Select.Option value="AAPL">AAPL</Select.Option>
                    <Select.Option value="TSLA">TSLA</Select.Option>
                  </>
                )}
              </Select>
            </div>
          </div>

          {/* Row 2: Side & Type */}
          <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>方向</span>
              <Radio.Group value={side} onChange={e => setSide(e.target.value)} buttonStyle="solid">
                <Radio.Button value="buy" style={side === 'buy' ? { background: 'var(--gain)', borderColor: 'var(--gain)' } : {}}>
                  买入
                </Radio.Button>
                <Radio.Button value="sell" style={side === 'sell' ? { background: 'var(--loss)', borderColor: 'var(--loss)' } : {}}>
                  卖出
                </Radio.Button>
              </Radio.Group>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>类型</span>
              <Radio.Group value={orderType} onChange={e => setOrderType(e.target.value)} buttonStyle="solid">
                <Radio.Button value="limit">限价</Radio.Button>
                <Radio.Button value="market">市价</Radio.Button>
              </Radio.Group>
            </div>
          </div>

          {/* Row 3: Quantity & Price */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>数量</span>
              <InputNumber value={quantity} onChange={v => setQuantity(v || 0)} min={0} step={0.01} style={{ width: 130 }} />
            </div>
            {orderType === 'limit' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>价格</span>
                <InputNumber value={price} onChange={v => setPrice(v || 0)} min={0} step={0.01} style={{ width: 130 }} />
              </div>
            )}
          </div>

          {/* Submit */}
          <Button
            type="primary"
            onClick={handlePlaceOrder}
            loading={loading}
            size="large"
            style={{
              width: '100%',
              maxWidth: 280,
              height: 44,
              fontWeight: 700,
              fontSize: 14,
              letterSpacing: '0.5px',
              background: side === 'buy'
                ? 'linear-gradient(135deg, #34d399, #059669)'
                : 'linear-gradient(135deg, #f87171, #dc2626)',
              border: 'none',
              boxShadow: side === 'buy'
                ? '0 4px 16px rgba(52, 211, 153, 0.3)'
                : '0 4px 16px rgba(248, 113, 113, 0.3)',
            }}
          >
            {side === 'buy' ? '买入' : '卖出'} {symbol}
          </Button>
        </div>
      </div>

      {/* Positions */}
      <div className="animate-in stagger-5" style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '14px 24px',
          borderBottom: '1px solid var(--border-default)',
          fontSize: 13,
          fontWeight: 700,
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-sans)',
        }}>
          持仓
        </div>
        <Table
          dataSource={positions}
          columns={positionColumns}
          rowKey="symbol"
          pagination={false}
          style={{ background: 'transparent' }}
        />
      </div>
    </div>
  );
}
