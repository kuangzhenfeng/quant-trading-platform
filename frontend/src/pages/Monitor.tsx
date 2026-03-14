import { useState, useEffect } from 'react';
import { Card, Statistic, Table, Tag } from 'antd';
import { monitorApi } from '../services/monitor';
import './Monitor.css';

export default function Monitor() {
  const [pnl, setPnl] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [strategies, setStrategies] = useState<any[]>([]);

  const fetchData = async () => {
    const [pnlData, statsData, strategyData] = await Promise.all([
      monitorApi.getPnL(),
      monitorApi.getStats(),
      monitorApi.getStrategies()
    ]);
    setPnl(pnlData);
    setStats(statsData);
    setStrategies(strategyData.strategies);
  };

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, 3000);
    return () => clearInterval(timer);
  }, []);

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

  const strategyColumns = [
    { title: 'ID', dataIndex: 'id', key: 'id' },
    { title: '平台', dataIndex: 'broker', key: 'broker' },
    {
      title: '状态',
      dataIndex: 'running',
      key: 'running',
      render: (running: boolean) => (
        <Tag color={running ? 'green' : 'default'}>
          {running ? '运行中' : '已停止'}
        </Tag>
      )
    },
    { title: '日志数', dataIndex: 'log_count', key: 'log_count' }
  ];

  return (
    <div className="monitor-container">
      <div className="monitor-grid">
        <Card className="stat-card pnl-card">
          <Statistic
            title="总盈亏"
            value={pnl?.total_pnl || 0}
            precision={2}
            valueStyle={{ color: (pnl?.total_pnl || 0) >= 0 ? '#3f8600' : '#cf1322' }}
            prefix={pnl?.total_pnl >= 0 ? '+' : ''}
          />
        </Card>

        <Card className="stat-card">
          <Statistic title="持仓数" value={pnl?.position_count || 0} />
        </Card>

        <Card className="stat-card">
          <Statistic title="总订单" value={stats?.total_orders || 0} />
        </Card>

        <Card className="stat-card">
          <Statistic title="成交订单" value={stats?.filled_orders || 0} />
        </Card>
      </div>

      <Card title="持仓明细" className="table-card">
        <Table
          dataSource={pnl?.positions || []}
          columns={positionColumns}
          rowKey="symbol"
          pagination={false}
        />
      </Card>

      <Card title="策略状态" className="table-card">
        <Table
          dataSource={strategies}
          columns={strategyColumns}
          rowKey="id"
          pagination={false}
        />
      </Card>
    </div>
  );
}
