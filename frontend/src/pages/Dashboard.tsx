import { useState, useEffect, useCallback } from 'react';
import { Card, Row, Col, Statistic, Select, App } from 'antd';
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

  return (
    <div>
      <h1 style={{ color: 'var(--text-primary)', marginBottom: '24px', fontSize: '24px' }}>
        仪表盘
      </h1>
      <Card style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', marginBottom: '16px' }}>
        <span style={{ marginRight: '8px' }}>券商:</span>
        <Select value={broker} onChange={setBroker} style={{ width: 120 }}>
          <Select.Option value="okx">OKX</Select.Option>
          <Select.Option value="guojin">国金证券</Select.Option>
          <Select.Option value="moomoo">moomoo</Select.Option>
        </Select>
      </Card>
      <Row gutter={16}>
        <Col span={8}>
          <Card style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
            <Statistic
              title={<span style={{ color: 'var(--text-secondary)' }}>账户余额</span>}
              value={account?.balance || 0}
              prefix="¥"
              styles={{ content: { color: 'var(--accent-green)', fontFamily: 'monospace' } }}
              className="mono glow-green"
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
            <Statistic
              title={<span style={{ color: 'var(--text-secondary)' }}>可用资金</span>}
              value={account?.available || 0}
              prefix="¥"
              styles={{ content: { color: 'var(--accent-blue)', fontFamily: 'monospace' } }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
            <Statistic
              title={<span style={{ color: 'var(--text-secondary)' }}>冻结资金</span>}
              value={account?.frozen || 0}
              prefix="¥"
              styles={{ content: { color: 'var(--text-secondary)', fontFamily: 'monospace' } }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
