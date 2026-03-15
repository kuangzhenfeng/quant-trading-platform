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
          color: v >= 0 ? 'var(--gain)' : 'var(--loss)',
          fontWeight: 600,
          textShadow: v >= 0
            ? '0 0 12px rgba(52, 211, 153, 0.35)'
            : '0 0 12px rgba(248, 113, 113, 0.35)'
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
          background: running
            ? 'rgba(52, 211, 153, 0.12)'
            : 'rgba(148, 163, 184, 0.1)',
          color: running ? 'var(--gain)' : 'var(--text-secondary)',
          borderColor: running
            ? 'rgba(52, 211, 153, 0.3)'
            : 'rgba(148, 163, 184, 0.2)'
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
      {/* Page Header */}
      <header className="page-header animate-in stagger-1">
        <h1 className="page-title">Monitor</h1>
        <p className="page-subtitle">实时监控与盈亏追踪</p>
      </header>

      {/* Stats Grid */}
      <div className="monitor-grid">
        {/* P&L — spans 2 columns */}
        <Card className="stat-card pnl-card animate-in stagger-2">
          <Statistic
            title="总盈亏 / Total P&L"
            value={Math.abs(pnlValue)}
            precision={2}
            styles={{
              content: {
                color: isPositive ? 'var(--gain)' : 'var(--loss)',
                textShadow: isPositive
                  ? '0 0 24px rgba(52, 211, 153, 0.4)'
                  : '0 0 24px rgba(248, 113, 113, 0.4)'
              }
            }}
            prefix={isPositive ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
          />
        </Card>

        {/* Positions */}
        <Card className="stat-card animate-in stagger-3">
          <Statistic
            title="持仓数 / Positions"
            value={pnl?.position_count || 0}
            styles={{ content: { color: 'var(--cyan-400)' } }}
          />
        </Card>

        {/* Total Orders */}
        <Card className="stat-card animate-in stagger-4">
          <Statistic
            title="总订单 / Orders"
            value={stats?.total_orders || 0}
            styles={{ content: { color: 'var(--text-secondary)' } }}
          />
        </Card>

        {/* Filled Orders */}
        <Card className="stat-card animate-in stagger-5">
          <Statistic
            title="成交订单 / Filled"
            value={stats?.filled_orders || 0}
            styles={{ content: { color: 'var(--text-secondary)' } }}
          />
        </Card>
      </div>

      {/* Positions Table */}
      <Card title="持仓明细" className="table-card animate-in stagger-5">
        <Table
          dataSource={pnl?.positions || []}
          columns={positionColumns}
          rowKey="symbol"
          pagination={false}
        />
      </Card>

      {/* Strategy Status Table */}
      <Card title="策略状态" className="table-card animate-in stagger-6">
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
