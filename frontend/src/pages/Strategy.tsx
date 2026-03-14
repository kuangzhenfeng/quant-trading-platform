import { useState } from 'react';
import { Card, Select, InputNumber, Button, message, Space, List } from 'antd';
import { strategyApi } from '../services/strategy';

export default function Strategy() {
  const [broker, setBroker] = useState('okx');
  const [symbol, setSymbol] = useState('BTC-USDT');
  const [shortPeriod, setShortPeriod] = useState(5);
  const [longPeriod, setLongPeriod] = useState(20);
  const [quantity, setQuantity] = useState(0.01);
  const [strategyId, setStrategyId] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const result = await strategyApi.create({
        strategy_type: 'ma',
        broker,
        params: { symbol, short_period: shortPeriod, long_period: longPeriod, quantity }
      });
      setStrategyId(result.strategy_id);
      message.success('策略创建成功');
    } catch (error: any) {
      message.error(error.response?.data?.detail || '创建失败');
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    if (!strategyId) return;
    try {
      await strategyApi.start(strategyId);
      message.success('策略已启动');
    } catch (error: any) {
      message.error(error.response?.data?.detail || '启动失败');
    }
  };

  const handleStop = async () => {
    if (!strategyId) return;
    try {
      await strategyApi.stop(strategyId);
      message.success('策略已停止');
    } catch (error: any) {
      message.error(error.response?.data?.detail || '停止失败');
    }
  };

  const handleRefreshLogs = async () => {
    if (!strategyId) return;
    try {
      const logs = await strategyApi.getLogs(strategyId);
      setLogs(logs);
    } catch (error: any) {
      message.error('获取日志失败');
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Card title="均线策略" style={{ marginBottom: 24 }}>
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
              <Select.Option value="BTC-USDT">BTC-USDT</Select.Option>
              <Select.Option value="ETH-USDT">ETH-USDT</Select.Option>
            </Select>
          </Space>

          <Space>
            <span>短周期:</span>
            <InputNumber value={shortPeriod} onChange={v => setShortPeriod(v || 5)} min={1} />
            <span>长周期:</span>
            <InputNumber value={longPeriod} onChange={v => setLongPeriod(v || 20)} min={1} />
            <span>数量:</span>
            <InputNumber value={quantity} onChange={v => setQuantity(v || 0.01)} min={0} step={0.01} />
          </Space>

          <Space>
            <Button type="primary" onClick={handleCreate} loading={loading}>创建策略</Button>
            <Button onClick={handleStart} disabled={!strategyId}>启动</Button>
            <Button onClick={handleStop} disabled={!strategyId}>停止</Button>
            <Button onClick={handleRefreshLogs} disabled={!strategyId}>刷新日志</Button>
          </Space>

          {strategyId && <div>策略ID: {strategyId}</div>}
        </Space>
      </Card>

      <Card title="策略日志">
        <List
          dataSource={logs}
          renderItem={item => <List.Item>{item}</List.Item>}
          style={{ maxHeight: 400, overflow: 'auto' }}
        />
      </Card>
    </div>
  );
}
