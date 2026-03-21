import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Statistic, Table, Tabs, Select, Tag, Empty } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { monitorApi } from '../services/monitor';
import { logsApi } from '../services/logs';
import type { PnLData, StatsData, LogEntry } from '../types/api';
import './Monitor.css';

const LOG_SOURCES = [
  { value: '', label: '全部模块' },
  { value: 'system', label: '系统' },
  { value: 'trading', label: '交易' },
  { value: 'market', label: '行情' },
  { value: 'strategy', label: '策略' },
  { value: 'websocket', label: 'WebSocket' },
  { value: 'account', label: '账户' },
  { value: 'adapter:okx', label: 'OKX适配器' },
  { value: 'adapter:mock', label: 'Mock适配器' },
  { value: 'adapter:guojin', label: '国金适配器' },
  { value: 'adapter:moomoo', label: 'Moomoo适配器' },
];

const LOG_LEVELS = [
  { value: '', label: '全部级别' },
  { value: 'info', label: 'INFO' },
  { value: 'warning', label: 'WARNING' },
  { value: 'error', label: 'ERROR' },
];

const LEVEL_COLORS: Record<string, string> = {
  info: '#34d399',
  warning: '#fbbf24',
  error: '#f87171',
};

export default function Monitor() {
  const [pnl, setPnl] = useState<PnLData | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logLevel, setLogLevel] = useState('');
  const [logSource, setLogSource] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  const fetchData = useCallback(async () => {
    const [pnlData, statsData] = await Promise.all([
      monitorApi.getPnL(),
      monitorApi.getStats()
    ]);
    setPnl(pnlData as PnLData);
    setStats(statsData as StatsData);
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      const data = await logsApi.getLogs({
        level: logLevel || undefined,
        source: logSource || undefined,
        limit: 100,
      });
      setLogs((data as { logs: LogEntry[] }).logs || []);
    } catch {
      // ignore fetch errors
    }
  }, [logLevel, logSource]);

  useEffect(() => {
    void fetchData();
    const timer = setInterval(fetchData, 3000);
    return () => clearInterval(timer);
  }, [fetchData]);

  useEffect(() => {
    void fetchLogs();
    const timer = setInterval(fetchLogs, 5000);
    return () => clearInterval(timer);
  }, [fetchLogs]);

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

  const logColumns = [
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180,
      render: (ts: string) => (
        <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>
          {ts ? new Date(ts).toLocaleString('zh-CN') : '-'}
        </span>
      )
    },
    {
      title: '级别',
      dataIndex: 'level',
      key: 'level',
      width: 100,
      render: (level: string) => (
        <Tag
          color={LEVEL_COLORS[level] || '#94a3b8'}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            fontWeight: 600,
            border: 'none',
            textTransform: 'uppercase',
          }}
        >
          {level}
        </Tag>
      )
    },
    {
      title: '模块',
      dataIndex: 'source',
      key: 'source',
      width: 140,
      render: (source: string) => (
        <span style={{
          color: 'var(--cyan-400)',
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          fontWeight: 500,
        }}>
          {source}
        </span>
      )
    },
    {
      title: '消息',
      dataIndex: 'message',
      key: 'message',
      render: (msg: string) => (
        <span style={{
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
        }}>
          {msg}
        </span>
      )
    }
  ];

  const pnlValue = pnl?.total_pnl || 0;
  const isPositive = pnlValue >= 0;

  const overviewContent = (
    <>
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
    </>
  );

  const logsContent = (
    <div className="animate-in stagger-1">
      {/* Filters */}
      <div style={{
        display: 'flex',
        gap: 12,
        marginBottom: 16,
        flexWrap: 'wrap',
      }}>
        <Select
          value={logLevel}
          onChange={setLogLevel}
          options={LOG_LEVELS}
          style={{ width: 140 }}
          placeholder="选择级别"
        />
        <Select
          value={logSource}
          onChange={setLogSource}
          options={LOG_SOURCES}
          style={{ width: 160 }}
          placeholder="选择模块"
          showSearch
          filterOption={(input, option) =>
            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
          }
        />
        <span style={{
          color: 'var(--text-tertiary)',
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          alignSelf: 'center',
          marginLeft: 'auto',
        }}>
          共 {logs.length} 条日志
        </span>
      </div>

      {/* Logs Table */}
      <Card className="table-card">
        <Table
          dataSource={logs}
          columns={logColumns}
          rowKey={(_, i) => i?.toString() ?? Math.random().toString()}
          pagination={false}
          scroll={{ y: 400 }}
          size="small"
          locale={{
            emptyText: (
              <Empty
                description={
                  <span style={{ color: 'var(--text-muted)' }}>
                    暂无日志记录
                  </span>
                }
              />
            )
          }}
        />
      </Card>
    </div>
  );

  const tabItems = [
    { key: 'overview', label: '概览', children: overviewContent },
    { key: 'logs', label: '日志', children: logsContent },
  ];

  return (
    <div className="monitor-container">
      {/* Page Header */}
      <header className="page-header animate-in stagger-1">
        <h1 className="page-title">Monitor</h1>
        <p className="page-subtitle">实时监控与盈亏追踪</p>
      </header>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        style={{ position: 'relative', zIndex: 1 }}
      />
    </div>
  );
}
