import { useState, useEffect, useCallback } from 'react';
import { Card, Select, Button, InputNumber, Radio, Table, App, Space, Statistic, Row, Col, Alert } from 'antd';
import { tradingApi, type PositionData, type AccountData } from '../services/trading';
import type { ApiError } from '../types/api';
import { useTradingModeStore } from '../stores/tradingModeStore';

export default function Trading() {
  const { message } = App.useApp();
  const { mode, description, fetchMode } = useTradingModeStore();
  const [broker, setBroker] = useState('okx');
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
    { title: '标的', dataIndex: 'symbol', key: 'symbol' },
    { title: '数量', dataIndex: 'quantity', key: 'quantity' },
    { title: '均价', dataIndex: 'avg_price', key: 'avg_price', render: (v: number) => v.toFixed(2) },
    {
      title: '浮动盈亏',
      dataIndex: 'unrealized_pnl',
      key: 'unrealized_pnl',
      render: (v: number) => (
        <span style={{ color: v >= 0 ? '#52c41a' : '#ff4d4f' }}>
          {v >= 0 ? '+' : ''}{v.toFixed(2)}
        </span>
      )
    }
  ];

  const modeConfig = {
    live: { type: 'error' as const, message: '⚠️ 真实盘模式 - 真实资金交易' },
    paper: { type: 'warning' as const, message: '📊 模拟盘模式 - 真实行情，模拟订单' },
    mock: { type: 'info' as const, message: '🧪 Mock 模式 - 完全模拟' },
  };

  return (
    <div style={{ padding: 24 }}>
      <Alert
        type={modeConfig[mode].type}
        description={modeConfig[mode].message}
        showIcon
        style={{ marginBottom: 16 }}
      />
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic title="总资产" value={account?.balance || 0} precision={2} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="可用资金" value={account?.available || 0} precision={2} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="冻结资金" value={account?.frozen || 0} precision={2} />
          </Card>
        </Col>
      </Row>

      <Card title="下单" style={{ marginBottom: 24 }}>
        <Space vertical style={{ width: '100%' }} size="large">
          <Space>
            <span>券商:</span>
            <Select value={broker} onChange={setBroker} style={{ width: 120 }}>
              <Select.Option value="okx">OKX</Select.Option>
              <Select.Option value="guojin">国金证券</Select.Option>
              <Select.Option value="moomoo">moomoo</Select.Option>
            </Select>
            <span>标的:</span>
            <Select value={symbol} onChange={setSymbol} style={{ width: 150 }}>
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
          </Space>

          <Space>
            <span>方向:</span>
            <Radio.Group value={side} onChange={e => setSide(e.target.value)}>
              <Radio.Button value="buy">买入</Radio.Button>
              <Radio.Button value="sell">卖出</Radio.Button>
            </Radio.Group>
            <span>类型:</span>
            <Radio.Group value={orderType} onChange={e => setOrderType(e.target.value)}>
              <Radio.Button value="limit">限价</Radio.Button>
              <Radio.Button value="market">市价</Radio.Button>
            </Radio.Group>
          </Space>

          <Space>
            <span>数量:</span>
            <InputNumber value={quantity} onChange={v => setQuantity(v || 0)} min={0} step={0.01} />
            {orderType === 'limit' && (
              <>
                <span>价格:</span>
                <InputNumber value={price} onChange={v => setPrice(v || 0)} min={0} step={0.01} />
              </>
            )}
          </Space>

          <Button type="primary" onClick={handlePlaceOrder} loading={loading}>
            提交订单
          </Button>
        </Space>
      </Card>

      <Card title="持仓">
        <Table
          dataSource={positions}
          columns={positionColumns}
          rowKey="symbol"
          pagination={false}
        />
      </Card>
    </div>
  );
}
