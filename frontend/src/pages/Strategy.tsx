import { useState, useEffect, useCallback } from 'react';
import { Select, InputNumber, Button, Space, message, Table, Tag, Modal, List } from 'antd';
import {
  RocketOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  SettingOutlined,
  TagOutlined,
  ApartmentOutlined,
  UnorderedListOutlined,
  EditOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { strategyApi } from '../services/strategy';
import { monitorApi } from '../services/monitor';
import type { ApiError, Strategy, StrategiesResponse } from '../types/api';
import { useBrokerStore } from '../stores/brokerStore';

const FIELD_LABEL_STYLE: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--text-tertiary)',
  textTransform: 'uppercase',
  letterSpacing: '1px',
  fontFamily: 'var(--font-sans)',
  whiteSpace: 'nowrap',
};

const SECTION_HEADER_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 13,
  fontWeight: 700,
  color: 'var(--text-secondary)',
  fontFamily: 'var(--font-sans)',
  marginBottom: 20,
};

const CARD_STYLE: React.CSSProperties = {
  background: 'var(--bg-surface)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-md)',
  padding: 24,
};

export default function Strategy() {
  const { broker } = useBrokerStore();
  const [strategyType, setStrategyType] = useState('ma');
  const [symbol, setSymbol] = useState('BTC-USDT');
  const [shortPeriod, setShortPeriod] = useState(5);
  const [longPeriod, setLongPeriod] = useState(20);
  const [fastPeriod, setFastPeriod] = useState(12);
  const [slowPeriod, setSlowPeriod] = useState(26);
  const [signalPeriod, setSignalPeriod] = useState(9);
  const [period, setPeriod] = useState(20);
  const [stdDev, setStdDev] = useState(2);
  const [rsiPeriod, setRsiPeriod] = useState(14);
  const [oversold, setOversold] = useState(30);
  const [overbought, setOverbought] = useState(70);
  const [quantity, setQuantity] = useState(0.01);
  const [strategyId, setStrategyId] = useState('');
  const [loading, setLoading] = useState(false);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState<{id: string; params: Record<string, unknown>} | null>(null);
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [logs, setLogs] = useState<Array<{timestamp: string; level: string; message: string}>>([]);

  const handleCreate = async () => {
    setLoading(true);
    try {
      let params: Record<string, unknown> = { symbol, quantity };

      if (strategyType === 'ma') {
        params = { ...params, short_period: shortPeriod, long_period: longPeriod };
      } else if (strategyType === 'macd') {
        params = { ...params, fast_period: fastPeriod, slow_period: slowPeriod, signal_period: signalPeriod };
      } else if (strategyType === 'bollinger') {
        params = { ...params, period, std_dev: stdDev };
      } else if (strategyType === 'rsi') {
        params = { ...params, period: rsiPeriod, oversold, overbought };
      }

      const result = await strategyApi.create({
        strategy_type: strategyType,
        broker,
        params
      });
      setStrategyId(result.strategy_id);
      message.success('策略创建成功');
      fetchStrategies();
    } catch (error: unknown) {
      message.error((error as ApiError).response?.data?.detail || '创建失败');
    } finally {
      setLoading(false);
    }
  };

  const handleStartStrategy = async (id: string) => {
    try {
      await strategyApi.start(id);
      message.success('策略已启动');
      fetchStrategies();
    } catch (error: unknown) {
      message.error((error as ApiError).response?.data?.detail || '启动失败');
    }
  };

  const handleStopStrategy = async (id: string) => {
    try {
      await strategyApi.stop(id);
      message.success('策略已停止');
      fetchStrategies();
    } catch (error: unknown) {
      message.error((error as ApiError).response?.data?.detail || '停止失败');
    }
  };

  const handleEditStrategy = async (id: string) => {
    try {
      const detail = await strategyApi.getDetail(id);
      setEditingStrategy({ id, params: detail.params });
      setEditModalVisible(true);
    } catch (error: unknown) {
      message.error((error as ApiError).response?.data?.detail || '获取策略详情失败');
    }
  };

  const handleUpdateStrategy = async () => {
    if (!editingStrategy) return;
    try {
      const parts = editingStrategy.id.split('_');
      const strategyType = parts[0];
      const broker = parts.length >= 2 ? parts[1] : '';
      await strategyApi.update(editingStrategy.id, {
        strategy_type: strategyType,
        broker,
        params: editingStrategy.params
      });
      message.success('策略参数已更新');
      setEditModalVisible(false);
      setEditingStrategy(null);
      fetchStrategies();
    } catch (error: unknown) {
      message.error((error as ApiError).response?.data?.detail || '更新失败');
    }
  };

  const handleViewLogs = async (id: string) => {
    try {
      const data = await strategyApi.getLogs(id);
      setLogs(data.logs);
      setLogModalVisible(true);
    } catch (error: unknown) {
      message.error((error as ApiError).response?.data?.detail || '获取日志失败');
    }
  };

  const fetchStrategies = useCallback(async () => {
    try {
      const data = await monitorApi.getStrategies();
      setStrategies((data as StrategiesResponse).strategies);
    } catch {
      // 静默失败
    }
  }, []);

  useEffect(() => {
    fetchStrategies();
    const interval = setInterval(fetchStrategies, 3000);
    return () => clearInterval(interval);
  }, [fetchStrategies]);

  const strategyColumns = [
    { title: 'ID', dataIndex: 'id', key: 'id' },
    { title: '平台', dataIndex: 'broker', key: 'broker' },
    {
      title: '交易对',
      dataIndex: 'id',
      key: 'symbol',
      render: (id: string) => {
        const parts = id.split('_');
        return parts.length >= 3 ? parts.slice(2).join('_') : '-';
      }
    },
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
    { title: '日志数', dataIndex: 'log_count', key: 'log_count' },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: Strategy) => (
        <Space size={8}>
          <Button
            size="small"
            icon={<FileTextOutlined />}
            onClick={() => handleViewLogs(record.id)}
          >
            日志
          </Button>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditStrategy(record.id)}
          >
            编辑
          </Button>
          {!record.running ? (
            <Button
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={() => handleStartStrategy(record.id)}
              style={{
                color: 'var(--gain)',
                borderColor: 'rgba(52, 211, 153, 0.35)',
                background: 'rgba(52, 211, 153, 0.08)',
              }}
            >
              启动
            </Button>
          ) : (
            <Button
              size="small"
              icon={<PauseCircleOutlined />}
              onClick={() => handleStopStrategy(record.id)}
              style={{
                color: 'var(--loss)',
                borderColor: 'rgba(248, 113, 113, 0.35)',
                background: 'rgba(248, 113, 113, 0.08)',
              }}
            >
              停止
            </Button>
          )}
        </Space>
      )
    }
  ];

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Strategy</h1>
        <p className="page-subtitle">策略配置与管理</p>
      </div>

      {/* Strategy Config Card */}
      <div
        className="animate-in stagger-1"
        style={{ ...CARD_STYLE, marginBottom: 16 }}
      >
        {/* Section Header */}
        <div style={SECTION_HEADER_STYLE}>
          <RocketOutlined style={{ color: 'var(--cyan-400)', fontSize: 15 }} />
          {strategyType === 'ma' && '均线策略'}
          {strategyType === 'macd' && 'MACD策略'}
          {strategyType === 'bollinger' && '布林带策略'}
          {strategyType === 'rsi' && 'RSI策略'}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Row 1: Strategy + Symbol */}
          <div>
            <div style={{ ...FIELD_LABEL_STYLE, marginBottom: 12 }}>
              <ApartmentOutlined style={{ marginRight: 5 }} />
              交易标的
            </div>
            <Space wrap size={16}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={FIELD_LABEL_STYLE}>策略</span>
                <Select
                  value={strategyType}
                  onChange={setStrategyType}
                  style={{ width: 140 }}
                  options={[
                    { label: 'MA策略', value: 'ma' },
                    { label: 'MACD策略', value: 'macd' },
                    { label: '布林带策略', value: 'bollinger' },
                    { label: 'RSI策略', value: 'rsi' },
                  ]}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={FIELD_LABEL_STYLE}>标的</span>
                <Select
                  value={symbol}
                  onChange={setSymbol}
                  style={{ width: 160 }}
                  options={[
                    { label: 'BTC-USDT', value: 'BTC-USDT' },
                    { label: 'ETH-USDT', value: 'ETH-USDT' },
                  ]}
                />
              </div>
            </Space>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'var(--border-subtle)' }} />

          {/* Row 2: Strategy Parameters */}
          <div>
            <div style={{ ...FIELD_LABEL_STYLE, marginBottom: 12 }}>
              <SettingOutlined style={{ marginRight: 5 }} />
              策略参数
            </div>
            <Space wrap size={16}>
              {strategyType === 'ma' && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={FIELD_LABEL_STYLE}>短周期</span>
                    <InputNumber
                      value={shortPeriod}
                      onChange={v => setShortPeriod(v || 5)}
                      min={1}
                      style={{ width: 100 }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={FIELD_LABEL_STYLE}>长周期</span>
                    <InputNumber
                      value={longPeriod}
                      onChange={v => setLongPeriod(v || 20)}
                      min={1}
                      style={{ width: 100 }}
                    />
                  </div>
                </>
              )}
              {strategyType === 'macd' && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={FIELD_LABEL_STYLE}>快线周期</span>
                    <InputNumber
                      value={fastPeriod}
                      onChange={v => setFastPeriod(v || 12)}
                      min={1}
                      style={{ width: 100 }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={FIELD_LABEL_STYLE}>慢线周期</span>
                    <InputNumber
                      value={slowPeriod}
                      onChange={v => setSlowPeriod(v || 26)}
                      min={1}
                      style={{ width: 100 }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={FIELD_LABEL_STYLE}>信号线周期</span>
                    <InputNumber
                      value={signalPeriod}
                      onChange={v => setSignalPeriod(v || 9)}
                      min={1}
                      style={{ width: 100 }}
                    />
                  </div>
                </>
              )}
              {strategyType === 'bollinger' && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={FIELD_LABEL_STYLE}>周期</span>
                    <InputNumber
                      value={period}
                      onChange={v => setPeriod(v || 20)}
                      min={1}
                      style={{ width: 100 }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={FIELD_LABEL_STYLE}>标准差倍数</span>
                    <InputNumber
                      value={stdDev}
                      onChange={v => setStdDev(v || 2)}
                      min={0}
                      step={0.1}
                      style={{ width: 100 }}
                    />
                  </div>
                </>
              )}
              {strategyType === 'rsi' && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={FIELD_LABEL_STYLE}>RSI周期</span>
                    <InputNumber
                      value={rsiPeriod}
                      onChange={v => setRsiPeriod(v || 14)}
                      min={1}
                      style={{ width: 100 }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={FIELD_LABEL_STYLE}>超卖阈值</span>
                    <InputNumber
                      value={oversold}
                      onChange={v => setOversold(v || 30)}
                      min={0}
                      max={100}
                      style={{ width: 100 }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={FIELD_LABEL_STYLE}>超买阈值</span>
                    <InputNumber
                      value={overbought}
                      onChange={v => setOverbought(v || 70)}
                      min={0}
                      max={100}
                      style={{ width: 100 }}
                    />
                  </div>
                </>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={FIELD_LABEL_STYLE}>数量</span>
                <InputNumber
                  value={quantity}
                  onChange={v => setQuantity(v || 0.01)}
                  min={0}
                  step={0.01}
                  style={{ width: 120 }}
                />
              </div>
            </Space>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'var(--border-subtle)' }} />

          {/* Row 3: Action Buttons + Strategy ID badge */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <Button
              type="primary"
              icon={<RocketOutlined />}
              onClick={handleCreate}
              loading={loading}
              style={{
                fontWeight: 700,
                letterSpacing: '0.3px',
                background: 'linear-gradient(135deg, var(--cyan-500), var(--cyan-400))',
                border: 'none',
                boxShadow: '0 4px 14px rgba(34, 211, 238, 0.25)',
              }}
            >
              创建策略
            </Button>

            {/* Strategy ID Badge */}
            {strategyId && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '6px 12px',
                background: 'rgba(34, 211, 238, 0.08)',
                border: '1px solid var(--border-accent)',
                borderRadius: 'var(--radius-sm)',
              }}>
                <TagOutlined style={{ color: 'var(--cyan-400)', fontSize: 12 }} />
                <span style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--text-tertiary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.8px',
                  fontFamily: 'var(--font-sans)',
                }}>
                  ID
                </span>
                <span style={{
                  fontSize: 12,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--cyan-400)',
                  fontWeight: 600,
                }}>
                  {strategyId}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Strategy Status Card */}
      <div
        className="animate-in stagger-2"
        style={{ ...CARD_STYLE, marginTop: 16 }}
      >
        <div style={{ ...SECTION_HEADER_STYLE, marginBottom: 16 }}>
          <UnorderedListOutlined style={{ color: 'var(--cyan-400)', fontSize: 15 }} />
          策略状态
        </div>
        <Table
          dataSource={strategies}
          columns={strategyColumns}
          rowKey="id"
          pagination={false}
        />
      </div>

      {/* Edit Modal */}
      <Modal
        title="编辑策略参数"
        open={editModalVisible}
        onOk={handleUpdateStrategy}
        onCancel={() => {
          setEditModalVisible(false);
          setEditingStrategy(null);
        }}
        okText="更新"
        cancelText="取消"
      >
        {editingStrategy && (
          <Space direction="vertical" style={{ width: '100%' }} size={16}>
            {Object.entries(editingStrategy.params)
              .filter(([key]) => key !== 'symbol' && key !== 'quantity')
              .map(([key, value]) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ minWidth: 100 }}>{key}:</span>
                  <InputNumber
                    value={value as number}
                    onChange={(v) => setEditingStrategy({
                      ...editingStrategy,
                      params: { ...editingStrategy.params, [key]: v || 0 }
                    })}
                    style={{ flex: 1 }}
                  />
                </div>
              ))}
          </Space>
        )}
      </Modal>

      {/* Log Modal */}
      <Modal
        title="策略日志"
        open={logModalVisible}
        onCancel={() => setLogModalVisible(false)}
        footer={null}
        width={800}
      >
        <List
          dataSource={logs}
          renderItem={(log) => (
            <List.Item>
              <div style={{ width: '100%' }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                  <Tag color={log.level === 'error' ? 'red' : log.level === 'warning' ? 'orange' : 'blue'}>
                    {log.level.toUpperCase()}
                  </Tag>
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{log.timestamp}</span>
                </div>
                <div>{log.message}</div>
              </div>
            </List.Item>
          )}
        />
      </Modal>
    </div>
  );
}
