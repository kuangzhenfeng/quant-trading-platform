import { Card, Row, Col, Statistic } from 'antd';
import { useAccountStore } from '../stores/accountStore';

export default function Dashboard() {
  const account = useAccountStore((state) => state.account);

  return (
    <div>
      <h1 style={{ color: 'var(--text-primary)', marginBottom: '24px', fontSize: '24px' }}>
        仪表盘
      </h1>
      <Row gutter={16}>
        <Col span={8}>
          <Card style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
            <Statistic
              title={<span style={{ color: 'var(--text-secondary)' }}>账户余额</span>}
              value={account?.balance || 0}
              prefix="¥"
              styles={{ value: { color: 'var(--accent-green)', fontFamily: 'monospace' } }}
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
              styles={{ value: { color: 'var(--accent-blue)', fontFamily: 'monospace' } }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
            <Statistic
              title={<span style={{ color: 'var(--text-secondary)' }}>冻结资金</span>}
              value={account?.frozen || 0}
              prefix="¥"
              styles={{ value: { color: 'var(--text-secondary)', fontFamily: 'monospace' } }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
