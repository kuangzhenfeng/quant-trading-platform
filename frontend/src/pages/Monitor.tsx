import { useState, useEffect, useCallback } from 'react';
import { Card, Statistic, Table, Tag } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { monitorApi } from '../services/monitor';
import type { StrategiesResponse, PnLData, StatsData, Strategy } from '../types/api';
import './Monitor.css';

export default function Monitor() {
  const [pnl, setPnl] = useState<PnLData | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [strategies, setStrategies] = useState<Strategy[]>([]);

  const fetchData = useCallback(async () => {
    const [pnlData, statsData, strategyData] = await Promise.all([
      monitorApi.getPnL(),
      monitorApi.getStats(),
      monitorApi.getStrategies()
    ]);
    setPnl(pnlData as PnLData);
    setStats(statsData as StatsData);
    setStrategies((strategyData as StrategiesResponse).strategies);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchData();
    const timer = setInterval(fetchData, 3000);
    return () => clearInterval(timer);
  }, [fetchData]);

  const positionColumns = [
    { title: '标的', dataIndex: 'symbol', key: 'symbol' },
    { title: '数量', dataIndex: 'quantity', key: 'quantity' },
    { title: '均价', dataIndex: 'avg_price', key: 'avg_price', render: (v: number) => `¥${v.toFixed(2)}` },
    {
      title: '浮动盈亏',
      dataIndex: 'unrealized_pnl',
      key: 'unrealized_pnl',
      render: (v: number) => (
        <span style={{
          color: v >= 0 ? '#00ff9d' : '#ff4757',
          fontWeight: 600,
          textShadow: v >= 0 ? '0 0 10px #00ff9d40' : '0 0 10px #ff475740'
        }}>
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
        <Tag color={running ? 'success' : 'default'} style={{
          background: running ? 'rgba(0, 255, 157, 0.15)' : 'rgba(148, 163, 184, 0.15)',
          color: running ? '#00ff9d' : '#94a3b8',
          borderColor: running ? 'rgba(0, 255, 157, 0.3)' : 'rgba(148, 163, 184, 0.3)'
        }}>
          {running ? '● 运行中' : '○ 已停止'}
        </Tag>
      )
    },
    { title: '日志数', dataIndex: 'log_count', key: 'log_count' }
  ];

  const pnlValue = pnl?.total_pnl || 0;
  const isPositive = pnlValue >= 0;

  return (
    <div className="monitor-container">
      <div className="monitor-grid">
        <Card className="stat-card pnl-card">
          <Statistic
            title="总盈亏 / Total P&L"
            value={Math.abs(pnlValue)}
            precision={2}
            styles={{
              value: {
                color: isPositive ? '#00ff9d' : '#ff4757',
                textShadow: `0 0 20px ${isPositive ? '#00ff9d' : '#ff4757'}40`
              }
            }}
            prefix={isPositive ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
          />
        </Card>

        <Card className="stat-card">
          <Statistic
            title="持仓数 / Positions"
            value={pnl?.position_count || 0}
            styles={{ value: { color: '#00a3ff' } }}
          />
        </Card>

        <Card className="stat-card">
          <Statistic
            title="总订单 / Orders"
            value={stats?.total_orders || 0}
            styles={{ value: { color: '#94a3b8' } }}
          />
        </Card>

        <Card className="stat-card">
          <Statistic
            title="成交订单 / Filled"
            value={stats?.filled_orders || 0}
            styles={{ value: { color: '#94a3b8' } }}
          />
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
