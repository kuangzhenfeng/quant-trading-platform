import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Select,
  InputNumber,
  Button,
  Space,
  message,
  Table,
  Tag,
  Modal,
  Drawer,
  Segmented,
  Tooltip,
} from 'antd';
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
  DeleteOutlined,
  InfoCircleOutlined,
  ExpandOutlined,
  CompressOutlined,
  ThunderboltOutlined,
  RiseOutlined,
  FallOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import { strategyApi } from '../services/strategy';
import './Monitor.css';

const formatTimestamp = (ts: string): string => {
  try {
    const d = new Date(ts);
    return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
  } catch {
    return ts;
  }
};
import { monitorApi } from '../services/monitor';
import type {
  ApiError,
  Strategy,
  StrategiesResponse,
  StrategySignal,
  StrategyPerformance,
  SignalsResponse,
} from '../types/api';
import { useBrokerStore } from '../stores/brokerStore';

// ─── Constants ────────────────────────────────────────────────────────────────

const PARAMS_SCHEMA: Record<string, Record<string, { label: string; type: string; default: unknown }>> = {
  ma: { short_period: { label: '短周期', type: 'number', default: 5 }, long_period: { label: '长周期', type: 'number', default: 20 } },
  macd: { fast_period: { label: '快线周期', type: 'number', default: 12 }, slow_period: { label: '慢线周期', type: 'number', default: 26 }, signal_period: { label: '信号线周期', type: 'number', default: 9 } },
  bollinger: { period: { label: '周期', type: 'number', default: 20 }, std_dev: { label: '标准差倍数', type: 'number', default: 2 } },
  rsi: { period: { label: 'RSI周期', type: 'number', default: 14 }, oversold: { label: '超卖阈值', type: 'number', default: 30 }, overbought: { label: '超买阈值', type: 'number', default: 70 } },
  supertrend: { period: { label: 'ATR周期', type: 'number', default: 10 }, multiplier: { label: '倍数', type: 'number', default: 3.0 } },
  parabolic: { start: { label: '初始AF', type: 'number', default: 0.02 }, increment: { label: 'AF增量', type: 'number', default: 0.02 }, max: { label: 'AF最大值', type: 'number', default: 0.2 } },
  stochastic: { k_period: { label: 'K周期', type: 'number', default: 14 }, d_period: { label: 'D周期', type: 'number', default: 3 }, overbought: { label: '超买', type: 'number', default: 80 }, oversold: { label: '超卖', type: 'number', default: 20 } },
  adx: { period: { label: 'ADX周期', type: 'number', default: 14 }, adx_threshold: { label: 'ADX阈值', type: 'number', default: 25 } },
  momentum: { period: { label: '动量周期', type: 'number', default: 10 }, threshold: { label: '阈值(%)', type: 'number', default: 0.01 } },
  cci: { period: { label: 'CCI周期', type: 'number', default: 20 }, overbought: { label: '超买', type: 'number', default: 100 }, oversold: { label: '超卖', type: 'number', default: -100 } },
  atr_channel: { period: { label: 'ATR周期', type: 'number', default: 20 }, multiplier: { label: 'ATR倍数', type: 'number', default: 2.0 } },
  keltner: { ema_period: { label: 'EMA周期', type: 'number', default: 20 }, atr_period: { label: 'ATR周期', type: 'number', default: 10 }, multiplier: { label: '倍数', type: 'number', default: 2.0 } },
  donchian: { period: { label: '周期', type: 'number', default: 20 } },
  dual_rsi: { short_period: { label: '短RSI周期', type: 'number', default: 6 }, long_period: { label: '长RSI周期', type: 'number', default: 20 } },
  ma_rsi: { ma_period: { label: 'MA周期', type: 'number', default: 20 }, rsi_period: { label: 'RSI周期', type: 'number', default: 14 }, rsi_overbought: { label: 'RSI超买', type: 'number', default: 70 }, rsi_oversold: { label: 'RSI超卖', type: 'number', default: 30 } },
  ichimoku: { conv: { label: '转换线周期', type: 'number', default: 9 }, base: { label: '基准线周期', type: 'number', default: 26 }, span_b: { label: '延期线B周期', type: 'number', default: 52 }, displ: { label: '前移周期', type: 'number', default: 26 } },
};

const STRATEGY_OPTIONS = [
  { label: 'MA均线', value: 'ma' },
  { label: 'MACD', value: 'macd' },
  { label: '布林带', value: 'bollinger' },
  { label: 'RSI', value: 'rsi' },
  { label: 'Supertrend', value: 'supertrend' },
  { label: 'Parabolic SAR', value: 'parabolic' },
  { label: 'Stochastic', value: 'stochastic' },
  { label: 'ADX', value: 'adx' },
  { label: 'Momentum', value: 'momentum' },
  { label: 'CCI', value: 'cci' },
  { label: 'ATR Channel', value: 'atr_channel' },
  { label: 'Keltner Channel', value: 'keltner' },
  { label: 'Donchian Channel', value: 'donchian' },
  { label: 'Dual RSI', value: 'dual_rsi' },
  { label: 'MA+RSI Combo', value: 'ma_rsi' },
  { label: 'Ichimoku', value: 'ichimoku' },
];

const STRATEGY_TYPE_LABELS: Record<string, string> = {
  ma: 'MA均线',
  macd: 'MACD',
  bollinger: '布林带',
  rsi: 'RSI',
  supertrend: 'Supertrend',
  parabolic: 'Parabolic SAR',
  stochastic: 'Stochastic',
  adx: 'ADX',
  momentum: 'Momentum',
  cci: 'CCI',
  atr_channel: 'ATR Channel',
  keltner: 'Keltner Channel',
  donchian: 'Donchian Channel',
  dual_rsi: 'Dual RSI',
  ma_rsi: 'MA+RSI Combo',
  ichimoku: 'Ichimoku',
};

// 策略类型 -> 颜色
const STRATEGY_TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  ma:          { bg: 'rgba(34,211,238,0.12)',   text: '#22d3ee', border: 'rgba(34,211,238,0.3)' },
  macd:        { bg: 'rgba(167,139,250,0.12)', text: '#a78bfa', border: 'rgba(167,139,250,0.3)' },
  bollinger:    { bg: 'rgba(251,191,36,0.12)',  text: '#fbbf24', border: 'rgba(251,191,36,0.3)' },
  rsi:         { bg: 'rgba(52,211,153,0.12)',  text: '#34d399', border: 'rgba(52,211,153,0.3)' },
  supertrend:   { bg: 'rgba(248,113,113,0.12)',text: '#f87171', border: 'rgba(248,113,113,0.3)' },
  parabolic:    { bg: 'rgba(251,146,60,0.12)', text: '#fb923c', border: 'rgba(251,146,60,0.3)' },
  stochastic:   { bg: 'rgba(14,165,233,0.12)', text: '#0ea5e9', border: 'rgba(14,165,233,0.3)' },
  adx:         { bg: 'rgba(34,211,238,0.1)',   text: '#67e8f9', border: 'rgba(34,211,238,0.25)' },
  momentum:     { bg: 'rgba(244,114,182,0.12)',text: '#f472b6', border: 'rgba(244,114,182,0.3)' },
  cci:         { bg: 'rgba(161,161,170,0.12)',text: '#a1a1aa', border: 'rgba(161,161,170,0.3)' },
  atr_channel:  { bg: 'rgba(132,204,22,0.12)',text: '#84cc16', border: 'rgba(132,204,22,0.3)' },
  keltner:      { bg: 'rgba(20,184,166,0.12)', text: '#14b8a6', border: 'rgba(20,184,166,0.3)' },
  donchian:     { bg: 'rgba(249,115,22,0.12)', text: '#f97316', border: 'rgba(249,115,22,0.3)' },
  dual_rsi:     { bg: 'rgba(52,211,153,0.1)',  text: '#6ee7b7', border: 'rgba(52,211,153,0.25)' },
  ma_rsi:      { bg: 'rgba(99,102,241,0.12)', text: '#6366f1', border: 'rgba(99,102,241,0.3)' },
  ichimoku:     { bg: 'rgba(234,179,8,0.12)',  text: '#eab308', border: 'rgba(234,179,8,0.3)' },
};

// 从 strategy_id 提取类型 (格式: type_broker_symbol)
function extractStrategyType(id: string): string {
  const parts = id.split('_');
  // 常见多词策略名占多个下划线片段
  const multiWord = ['atr_channel', 'keltner', 'donchian', 'dual_rsi', 'ma_rsi', 'ichimoku', 'supertrend', 'parabolic', 'bollinger'];
  for (const m of multiWord) {
    if (id.startsWith(m + '_')) return m;
  }
  return parts[0] || 'ma';
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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

const METRIC_CARD_STYLE: React.CSSProperties = {
  background: 'var(--bg-surface)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-sm)',
  padding: '16px 20px',
  flex: 1,
  minWidth: 0,
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function Strategy() {
  const { broker } = useBrokerStore();

  // Strategy config state
  const [strategyType, setStrategyType] = useState('ma');
  const [symbol, setSymbol] = useState('BTC-USDT');
  const [quantity, setQuantity] = useState(0.01);
  const [strategyParams, setStrategyParams] = useState<Record<string, number>>(() => {
    const schema = PARAMS_SCHEMA['ma'] || {};
    const defaults: Record<string, number> = {};
    for (const [key, config] of Object.entries(schema)) {
      defaults[key] = config.default as number;
    }
    return defaults;
  });

  // Strategy ID badge
  const [strategyId, setStrategyId] = useState('');

  // Loading state
  const [loading, setLoading] = useState(false);

  // 批量操作 loading
  const [batchStartLoading, setBatchStartLoading] = useState(false);
  const [batchDeleteLoading, setBatchDeleteLoading] = useState(false);

  // Strategies table
  const [strategies, setStrategies] = useState<Strategy[]>([]);

  // 聚合统计（由 strategies 自动派生）
  const stats = useMemo(() => {
    const total = strategies.length;
    const running = strategies.filter(s => s.running).length;
    const returns = strategies.filter(s => s.total_return != null).map(s => s.total_return as number);
    const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : null;
    const best = returns.length > 0 ? Math.max(...returns) : null;
    const bestStrategy = best != null ? strategies.find(s => s.total_return === best) : null;
    return { total, running, avgReturn, best, bestStrategy };
  }, [strategies]);

  // Edit modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState<{ id: string; params: Record<string, unknown> } | null>(null);

  // Log modal
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [logs, setLogs] = useState<Array<{ timestamp: string; level: string; message: string }>>([]);

  // Detail drawer
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);
  const [signals, setSignals] = useState<StrategySignal[]>([]);
  const [performance, setPerformance] = useState<StrategyPerformance | null>(null);
  const [signalFilter, setSignalFilter] = useState<'all' | 'buy' | 'sell'>('all');

  // Params panel
  const [expandedParams, setExpandedParams] = useState(true);
  const [jsonMode, setJsonMode] = useState(false);
  const [jsonParams, setJsonParams] = useState('');

  // ─── handleStrategyTypeChange ──────────────────────────────────────────────
  const handleStrategyTypeChange = (newType: string, presetParams?: Record<string, number>) => {
    setStrategyType(newType);
    const schema = PARAMS_SCHEMA[newType] || {};
    const defaults: Record<string, number> = {};
    for (const [key, config] of Object.entries(schema)) {
      defaults[key] = presetParams?.[key] ?? (config.default as number);
    }
    setStrategyParams(defaults);
    setJsonParams(JSON.stringify(defaults, null, 2));
  };

  // ─── handleCreate ───────────────────────────────────────────────────────────
  const handleCreate = async () => {
    setLoading(true);
    try {
      let params: Record<string, unknown> = { symbol, quantity };

      if (jsonMode) {
        try {
          const parsed = JSON.parse(jsonParams);
          params = { ...params, ...parsed };
        } catch {
          message.error('JSON 参数格式错误');
          setLoading(false);
          return;
        }
      } else {
        params = { ...params, ...strategyParams };
      }

      const result = await strategyApi.create({
        strategy_type: strategyType,
        broker,
        params,
      });
      setStrategyId(result.strategy_id);
      message.success('策略创建成功');
      fetchStrategies();
    } catch (error: unknown) {
      message.error((error as ApiError).response?.data?.message || (error as ApiError).response?.data?.detail || '创建失败');
    } finally {
      setLoading(false);
    }
  };

  // ─── handleStartStrategy ───────────────────────────────────────────────────
  const handleStartStrategy = async (id: string) => {
    try {
      await strategyApi.start(id);
      message.success('策略已启动');
      fetchStrategies();
    } catch (error: unknown) {
      message.error((error as ApiError).response?.data?.message || (error as ApiError).response?.data?.detail || '启动失败');
    }
  };

  // ─── handleStopStrategy ─────────────────────────────────────────────────────
  const handleStopStrategy = async (id: string) => {
    try {
      await strategyApi.stop(id);
      message.success('策略已停止');
      fetchStrategies();
    } catch (error: unknown) {
      message.error((error as ApiError).response?.data?.message || (error as ApiError).response?.data?.detail || '停止失败');
    }
  };

  // ─── handleEditStrategy ─────────────────────────────────────────────────────
  const handleEditStrategy = async (id: string) => {
    try {
      const detail = await strategyApi.getDetail(id);
      setEditingStrategy({ id, params: detail.params });
      setEditModalVisible(true);
    } catch (error: unknown) {
      message.error((error as ApiError).response?.data?.message || (error as ApiError).response?.data?.detail || '获取策略详情失败');
    }
  };

  // ─── handleUpdateStrategy ──────────────────────────────────────────────────
  const handleUpdateStrategy = async () => {
    if (!editingStrategy) return;
    try {
      const parts = editingStrategy.id.split('_');
      const strategyTypePart = parts[0];
      const brokerPart = parts.length >= 2 ? parts[1] : '';
      await strategyApi.update(editingStrategy.id, {
        strategy_type: strategyTypePart,
        broker: brokerPart,
        params: editingStrategy.params,
      });
      message.success('策略参数已更新');
      setEditModalVisible(false);
      setEditingStrategy(null);
      fetchStrategies();
    } catch (error: unknown) {
      message.error((error as ApiError).response?.data?.message || (error as ApiError).response?.data?.detail || '更新失败');
    }
  };

  // ─── handleViewLogs ────────────────────────────────────────────────────────
  const handleViewLogs = async (id: string) => {
    try {
      const data = await strategyApi.getLogs(id);
      setLogs(data.logs);
      setLogModalVisible(true);
    } catch (error: unknown) {
      message.error((error as ApiError).response?.data?.message || (error as ApiError).response?.data?.detail || '获取日志失败');
    }
  };

  // ─── handleViewDetail ──────────────────────────────────────────────────────
  const handleViewDetail = async (record: Strategy) => {
    setSelectedStrategy(record);
    setDetailDrawerVisible(true);
    try {
      const [signalsData, perfData] = await Promise.all([
        strategyApi.getSignals(record.id),
        strategyApi.getPerformance(record.id),
      ]);
      setSignals((signalsData as SignalsResponse).signals || []);
      setPerformance(perfData as StrategyPerformance);
    } catch {
      setSignals([]);
      setPerformance(null);
    }
  };

  // ─── handleDeleteStrategy ──────────────────────────────────────────────────
  const handleDeleteStrategy = async () => {
    if (!selectedStrategy) return;
    try {
      await strategyApi.deleteStrategy(selectedStrategy.id);
      message.success('策略已删除');
      setDetailDrawerVisible(false);
      setSelectedStrategy(null);
      fetchStrategies();
    } catch (error: unknown) {
      message.error((error as ApiError).response?.data?.message || (error as ApiError).response?.data?.detail || '删除失败');
    }
  };

  // ─── handleBatchCreateAndStart ───────────────────────────────────────────
  const handleBatchCreateAndStart = async () => {
    setBatchStartLoading(true);
    try {
      const result = await strategyApi.createAndStartAll(broker) as { created: number; enabled: number; skipped: number; errors: string[] };
      if (result.errors.length > 0) {
        message.warning(`完成：新增 ${result.created}，启用 ${result.enabled}，跳过 ${result.skipped}，失败 ${result.errors.length} 个`);
      } else {
        message.success(`一键创建并启用完成：新增 ${result.created}，启用 ${result.enabled}，跳过 ${result.skipped}`);
      }
      fetchStrategies();
    } catch (error: unknown) {
      message.error((error as ApiError).response?.data?.message || (error as ApiError).response?.data?.detail || '批量创建失败');
    } finally {
      setBatchStartLoading(false);
    }
  };

  // ─── handleBatchDeleteAll ─────────────────────────────────────────────────
  const handleBatchDeleteAll = () => {
    Modal.confirm({
      title: '确认删除全部策略',
      content: '确定要删除所有策略吗？此操作不可恢复。',
      okText: '确认删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        setBatchDeleteLoading(true);
        try {
          const result = await strategyApi.deleteAll() as { deleted: number; errors: string[] };
          if (result.errors.length > 0) {
            message.warning(`删除完成：成功 ${result.deleted}，失败 ${result.errors.length} 个`);
          } else {
            message.success(`一键删除完成：共删除 ${result.deleted} 个策略`);
          }
          fetchStrategies();
        } catch (error: unknown) {
          message.error((error as ApiError).response?.data?.message || (error as ApiError).response?.data?.detail || '批量删除失败');
        } finally {
          setBatchDeleteLoading(false);
        }
      },
    });
  };

  // ─── fetchStrategies ──────────────────────────────────────────────────────
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

  // ─── Table Columns ─────────────────────────────────────────────────────────
  const strategyColumns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 120, ellipsis: true },
    { title: '平台', dataIndex: 'broker', key: 'broker', width: 70 },
    {
      title: '类型',
      key: 'type',
      width: 120,
      render: (_: unknown, record: Strategy) => {
        const t = extractStrategyType(record.id);
        const colors = STRATEGY_TYPE_COLORS[t] ?? { bg: 'rgba(148,163,184,0.1)', text: '#94a3b8', border: 'rgba(148,163,184,0.2)' };
        return (
          <Tag
            style={{
              background: colors.bg,
              color: colors.text,
              borderColor: colors.border,
              fontSize: 10,
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.3px',
              padding: '1px 6px',
              borderRadius: 4,
              margin: 0,
              lineHeight: '18px',
              whiteSpace: 'nowrap',
            }}
          >
            {STRATEGY_TYPE_LABELS[t] ?? t.toUpperCase()}
          </Tag>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'running',
      key: 'running',
      width: 90,
      render: (running: boolean) => (
        <Tag
          color={running ? 'success' : 'default'}
          style={{
            background: running
              ? 'rgba(52, 211, 153, 0.12)'
              : 'rgba(148, 163, 184, 0.1)',
            color: running ? 'var(--gain)' : 'var(--text-secondary)',
            borderColor: running
              ? 'rgba(52, 211, 153, 0.3)'
              : 'rgba(148, 163, 184, 0.2)',
          }}
        >
          {running ? '● 运行中' : '○ 已停止'}
        </Tag>
      ),
    },
    { title: '成交数', dataIndex: 'total_trades', key: 'total_trades', width: 80 },
    { title: '胜率', key: 'win_rate', width: 70,
      render: (_: unknown, record: Strategy) => {
        const val = record.win_rate;
        if (val === null || val === undefined || record.total_trades === 0) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
        return (
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--text-secondary)',
            }}
          >
            {val.toFixed(0)}%
          </span>
        );
      },
    },
    {
      title: '收益率',
      key: 'total_return',
      width: 90,
      render: (_: unknown, record: Strategy) => {
        const val = record.total_return;
        if (val === null || val === undefined) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
        const isGain = val >= 0;
        return (
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              fontWeight: 600,
              color: isGain ? 'var(--gain)' : 'var(--loss)',
            }}
          >
            {isGain ? '+' : ''}{val.toFixed(2)}%
          </span>
        );
      },
    },
    {
      title: '浮动盈亏',
      key: 'unrealized_pnl',
      width: 110,
      render: (_: unknown, record: Strategy) => {
        const pnl = record.unrealized_pnl ?? 0;
        const isGain = pnl > 0;
        const isLoss = pnl < 0;
        return (
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              fontWeight: 600,
              color: isGain ? 'var(--gain)' : isLoss ? 'var(--loss)' : 'var(--text-muted)',
              letterSpacing: '-0.3px',
            }}
          >
            {isGain ? '+' : ''}{pnl.toFixed(2)}
          </span>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 140,
      render: (_: unknown, record: Strategy) => (
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'nowrap' }}>
          <Tooltip title="详情">
            <Button
              size="small"
              icon={<InfoCircleOutlined />}
              onClick={() => handleViewDetail(record)}
              style={{
                color: 'var(--cyan-400)',
                borderColor: 'rgba(34,211,238,0.35)',
                background: 'rgba(34,211,238,0.08)',
                padding: '0 8px',
              }}
            />
          </Tooltip>
          <Tooltip title="日志">
            <Button
              size="small"
              icon={<FileTextOutlined />}
              onClick={() => handleViewLogs(record.id)}
              style={{ padding: '0 8px' }}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEditStrategy(record.id)}
              style={{ padding: '0 8px' }}
            />
          </Tooltip>
          {!record.running ? (
            <Tooltip title="启动">
              <Button
                size="small"
                icon={<PlayCircleOutlined />}
                onClick={() => handleStartStrategy(record.id)}
                style={{
                  color: 'var(--gain)',
                  borderColor: 'rgba(52, 211, 153, 0.35)',
                  background: 'rgba(52, 211, 153, 0.08)',
                  padding: '0 8px',
                }}
              />
            </Tooltip>
          ) : (
            <Tooltip title="停止">
              <Button
                size="small"
                icon={<PauseCircleOutlined />}
                onClick={() => handleStopStrategy(record.id)}
                style={{
                  color: 'var(--loss)',
                  borderColor: 'rgba(248, 113, 113, 0.35)',
                  background: 'rgba(248, 113, 113, 0.08)',
                  padding: '0 8px',
                }}
              />
            </Tooltip>
          )}
        </div>
      ),
    },
  ];

  // ─── Signal Columns ───────────────────────────────────────────────────────
  const signalColumns = [
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 160,
      render: (ts: string) => {
        return (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>
            {formatTimestamp(ts)}
          </span>
        );
      },
    },
    {
      title: '方向',
      dataIndex: 'side',
      key: 'side',
      width: 60,
      render: (side: string) => (
        <Tag
          style={{
            fontSize: 11,
            fontWeight: 700,
            background: side === 'buy' ? 'rgba(52, 211, 153, 0.12)' : 'rgba(248, 113, 113, 0.12)',
            color: side === 'buy' ? 'var(--gain)' : 'var(--loss)',
            borderColor: side === 'buy' ? 'rgba(52, 211, 153, 0.3)' : 'rgba(248, 113, 113, 0.3)',
          }}
        >
          {side === 'buy' ? '买入' : '卖出'}
        </Tag>
      ),
    },
    { title: '标的', dataIndex: 'symbol', key: 'symbol', width: 120 },
    {
      title: '价格',
      dataIndex: 'price',
      key: 'price',
      width: 90,
      render: (price: number) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600 }}>
          {price.toFixed(2)}
        </span>
      ),
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 80,
      render: (qty: number) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{qty.toFixed(4)}</span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 70,
      render: (status: string) => {
        const cfg: Record<string, { label: string; color: string }> = {
          pending: { label: '待成交', color: 'var(--text-muted)' },
          filled: { label: '已成交', color: 'var(--gain)' },
          failed: { label: '失败', color: 'var(--loss)' },
        };
        const c = cfg[status] ?? { label: status, color: 'var(--text-muted)' };
        return (
          <span style={{ fontSize: 11, fontWeight: 600, color: c.color }}>
            {c.label}
          </span>
        );
      },
    },
    { title: '原因', dataIndex: 'reason', key: 'reason', ellipsis: true },
  ];

  // ─── Filtered Signals ──────────────────────────────────────────────────────
  const filteredSignals = signalFilter === 'all' ? signals : signals.filter(s => s.side === signalFilter);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Strategy</h1>
        <p className="page-subtitle">策略配置与管理</p>
      </div>

      {/* Strategy Config Card */}
      <div className="animate-in stagger-1" style={{ ...CARD_STYLE, marginBottom: 16 }}>
        {/* Section Header */}
        <div style={SECTION_HEADER_STYLE}>
          <RocketOutlined style={{ color: 'var(--cyan-400)', fontSize: 15 }} />
          策略配置
          <Tag
            style={{
              marginLeft: 8,
              background: 'rgba(34, 211, 238, 0.1)',
              borderColor: 'rgba(34, 211, 238, 0.3)',
              color: 'var(--cyan-400)',
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
            }}
          >
            {STRATEGY_TYPE_LABELS[strategyType] || strategyType}
          </Tag>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Row 1: Strategy + Symbol */}
          <div>
            <div style={{ ...FIELD_LABEL_STYLE, marginBottom: 12 }}>
              <ApartmentOutlined style={{ marginRight: 5 }} />
              交易标的
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={FIELD_LABEL_STYLE}>策略</span>
                <Select
                  value={strategyType}
                  onChange={(val) => handleStrategyTypeChange(val)}
                  style={{ width: 150 }}
                  options={STRATEGY_OPTIONS}
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={FIELD_LABEL_STYLE}>数量</span>
                <InputNumber
                  value={quantity}
                  onChange={(v) => setQuantity(v ?? 0.01)}
                  min={0}
                  step={0.01}
                  style={{ width: 120 }}
                />
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'var(--border-subtle)' }} />

          {/* Row 2: Strategy Parameters (Collapsible) */}
          <div>
            {/* Collapse header bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: expandedParams ? 16 : 0,
              }}
            >
              <div style={{ ...FIELD_LABEL_STYLE, marginBottom: 0 }}>
                <SettingOutlined style={{ marginRight: 5 }} />
                策略参数
              </div>
              <Space size={8}>
                {/* JSON mode toggle */}
                <Segmented
                  size="small"
                  value={jsonMode ? 'json' : 'form'}
                  onChange={(val) => {
                    const isJson = val === 'json';
                    setJsonMode(isJson);
                    if (isJson) {
                      setJsonParams(JSON.stringify(strategyParams, null, 2));
                    }
                  }}
                  options={[
                    { label: '表单', value: 'form' },
                    { label: 'JSON', value: 'json' },
                  ]}
                />
                <Button
                  size="small"
                  type="text"
                  icon={expandedParams ? <CompressOutlined /> : <ExpandOutlined />}
                  onClick={() => setExpandedParams(!expandedParams)}
                  style={{ color: 'var(--text-tertiary)' }}
                />
              </Space>
            </div>

            {/* Collapsible content */}
            {expandedParams && (
              <div>
                {jsonMode ? (
                  /* JSON mode */
                  <textarea
                    value={jsonParams}
                    onChange={(e) => setJsonParams(e.target.value)}
                    style={{
                      width: '100%',
                      minHeight: 120,
                      background: 'var(--bg-void)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--cyan-400)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      padding: '12px 14px',
                      resize: 'vertical',
                      outline: 'none',
                      lineHeight: '20px',
                    }}
                    placeholder="输入 JSON 参数..."
                  />
                ) : (
                  /* Form mode - dynamic params */
                  <Space wrap size={16}>
                    {Object.entries(PARAMS_SCHEMA[strategyType] || {}).map(([key, config]) => (
                      <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={FIELD_LABEL_STYLE}>{config.label}</span>
                        <Tooltip title={key}>
                          <InputNumber
                            value={strategyParams[key]}
                            onChange={(v) =>
                              setStrategyParams((prev) => ({ ...prev, [key]: v ?? (config.default as number) }))
                            }
                            min={0}
                            step={String(config.default).includes('.') ? 0.1 : 1}
                            style={{ width: 100 }}
                          />
                        </Tooltip>
                      </div>
                    ))}
                    {Object.keys(PARAMS_SCHEMA[strategyType] || {}).length === 0 && (
                      <span style={{ color: 'var(--text-muted)', fontSize: 12, fontStyle: 'italic' }}>
                        此策略暂无参数配置
                      </span>
                    )}
                  </Space>
                )}
              </div>
            )}
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'var(--border-subtle)' }} />

          {/* Row 3: Action Buttons + Strategy ID badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
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
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  padding: '6px 12px',
                  background: 'rgba(34, 211, 238, 0.08)',
                  border: '1px solid var(--border-accent)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <TagOutlined style={{ color: 'var(--cyan-400)', fontSize: 12 }} />
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--text-tertiary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.8px',
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  ID
                </span>
                <span
                  style={{
                    fontSize: 12,
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--cyan-400)',
                    fontWeight: 600,
                  }}
                >
                  {strategyId}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Strategy Status Card */}
      <div className="animate-in stagger-2" style={{ ...CARD_STYLE, marginTop: 16 }}>
        <div style={{ ...SECTION_HEADER_STYLE, marginBottom: 16 }}>
          <UnorderedListOutlined style={{ color: 'var(--cyan-400)', fontSize: 15 }} />
          策略状态
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <Tooltip title="为全部16种策略类型×2个交易对创建并启用策略">
              <Button
                type="primary"
                size="small"
                icon={<ThunderboltOutlined />}
                loading={batchStartLoading}
                onClick={handleBatchCreateAndStart}
                style={{
                  background: 'rgba(52, 211, 153, 0.15)',
                  borderColor: 'rgba(52, 211, 153, 0.4)',
                  color: 'var(--gain)',
                  fontWeight: 600,
                }}
              >
                一键创建并启用
              </Button>
            </Tooltip>
            <Tooltip title="删除全部策略">
              <Button
                danger
                size="small"
                icon={<DeleteOutlined />}
                loading={batchDeleteLoading}
                onClick={handleBatchDeleteAll}
              >
                一键删除全部
              </Button>
            </Tooltip>
          </div>
        </div>

        {/* 聚合统计条 */}
        {strategies.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 12,
              marginBottom: 16,
              padding: '14px 16px',
              background: 'rgba(0,0,0,0.2)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {/* 总策略数 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BarChartOutlined style={{ color: '#22d3ee', fontSize: 15 }} />
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-sans)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 1 }}>总策略</div>
                <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', lineHeight: 1.1 }}>{stats.total}</div>
              </div>
            </div>

            {/* 运行中 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PlayCircleOutlined style={{ color: '#34d399', fontSize: 15 }} />
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-sans)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 1 }}>运行中</div>
                <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#34d399', lineHeight: 1.1 }}>
                  {stats.running}
                  <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 4 }}>/ {stats.total}</span>
                </div>
              </div>
            </div>

            {/* 平均收益率 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {(stats.avgReturn ?? 0) >= 0
                  ? <RiseOutlined style={{ color: '#fbbf24', fontSize: 15 }} />
                  : <FallOutlined style={{ color: '#f87171', fontSize: 15 }} />
                }
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-sans)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 1 }}>平均收益</div>
                <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-mono)', color: (stats.avgReturn ?? 0) >= 0 ? '#fbbf24' : '#f87171', lineHeight: 1.1 }}>
                  {stats.avgReturn != null ? `${(stats.avgReturn as number) >= 0 ? '+' : ''}${(stats.avgReturn as number).toFixed(2)}%` : '—'}
                </div>
              </div>
            </div>

            {/* 最佳策略 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <RocketOutlined style={{ color: '#a78bfa', fontSize: 15 }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-sans)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 1 }}>最佳收益</div>
                <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#a78bfa', lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {stats.best != null ? `${(stats.best as number) >= 0 ? '+' : ''}${(stats.best as number).toFixed(2)}%` : '—'}
                </div>
              </div>
            </div>
          </div>
        )}

        <Table
          dataSource={strategies}
          columns={strategyColumns}
          rowKey="id"
          pagination={false}
          locale={{
            emptyText: (
              <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
                {/* 动画扫描线效果的空状态 */}
                <div style={{ position: 'relative', display: 'inline-block', marginBottom: 16 }}>
                  <div style={{
                    width: 64, height: 64, borderRadius: 16,
                    background: 'rgba(34,211,238,0.06)',
                    border: '1px solid rgba(34,211,238,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    position: 'relative', overflow: 'hidden',
                  }}>
                    <RocketOutlined style={{ fontSize: 28, color: 'rgba(34,211,238,0.4)' }} />
                    {/* 扫描线动画 */}
                    <div style={{
                      position: 'absolute', top: 0, left: '-100%', width: '60%',
                      height: 1, background: 'linear-gradient(90deg, transparent, rgba(34,211,238,0.6), transparent)',
                      animation: 'scan-line 3s linear infinite',
                    }} />
                  </div>
                  {/* 外圈 */}
                  <div style={{
                    position: 'absolute', inset: -8, borderRadius: 24,
                    border: '1px dashed rgba(34,211,238,0.1)',
                  }} />
                </div>
                <div style={{ fontSize: 14, fontFamily: 'var(--font-sans)', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  暂无策略
                </div>
                <div style={{ fontSize: 12, fontFamily: 'var(--font-sans)', color: 'var(--text-muted)' }}>
                  上方配置参数后创建策略
                </div>
                <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'rgba(34,211,238,0.4)', marginTop: 8 }}>
                  // strategy not found
                </div>
              </div>
            ),
          }}
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
                    onChange={(v) =>
                      setEditingStrategy({
                        ...editingStrategy,
                        params: { ...editingStrategy.params, [key]: v || 0 },
                      })
                    }
                    style={{ flex: 1 }}
                  />
                </div>
              ))}
          </Space>
        )}
      </Modal>

      {/* Log Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileTextOutlined style={{ color: 'var(--cyan-400)' }} />
            <span>策略日志</span>
            <span
              style={{
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-muted)',
                fontWeight: 400,
                marginLeft: 4,
              }}
            >
              {logs.length} 条
            </span>
          </div>
        }
        open={logModalVisible}
        onCancel={() => setLogModalVisible(false)}
        footer={null}
        width={780}
      >
        {logs.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '40px 0',
              color: 'var(--text-muted)',
              fontSize: 13,
              fontFamily: 'var(--font-sans)',
            }}
          >
            暂无日志
          </div>
        ) : (
          <div
            style={{
              background: 'var(--bg-void)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 0',
              maxHeight: 520,
              overflowY: 'auto',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              lineHeight: '22px',
            }}
          >
            {logs.map((log, i) => {
              const timeStr = formatTimestamp(log.timestamp);

              const levelColor: Record<string, string> = {
                error: '#f87171',
                warning: '#fbbf24',
                warn: '#fbbf24',
                info: '#22d3ee',
                debug: '#94a3b8',
              };
              const color = levelColor[log.level?.toLowerCase()] ?? '#94a3b8';
              const levelTag = (log.level ?? 'info').toUpperCase().padEnd(5);

              return (
                <div
                  key={i}
                  style={{ display: 'flex', gap: 0, padding: '1px 16px', borderLeft: '2px solid transparent', transition: 'background 0.1s' }}
                  className="log-entry"
                  data-level-color={color}
                >
                  <span style={{ color: '#4b5563', minWidth: 110, flexShrink: 0 }}>{timeStr}</span>
                  <span style={{ color, minWidth: 52, flexShrink: 0, fontWeight: 700 }}>{levelTag}</span>
                  <span style={{ color: '#e2e8f0', wordBreak: 'break-all' }}>{log.message}</span>
                </div>
              );
            })}
          </div>
        )}
      </Modal>

      {/* Detail Drawer */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <InfoCircleOutlined style={{ color: 'var(--cyan-400)' }} />
            <span>策略详情</span>
            {selectedStrategy && (
              <span
                style={{
                  fontSize: 11,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-muted)',
                  fontWeight: 400,
                }}
              >
                {selectedStrategy.id}
              </span>
            )}
          </div>
        }
        placement="right"
        onClose={() => {
          setDetailDrawerVisible(false);
          setSelectedStrategy(null);
        }}
        open={detailDrawerVisible}
        mask={false}
        closable
        styles={{
          wrapper: { width: 640 },
          header: {
            background: 'var(--bg-surface)',
            borderBottom: '1px solid var(--border-subtle)',
          },
          body: {
            background: 'var(--bg-surface)',
            padding: '20px 24px',
          },
        }}
        extra={
          selectedStrategy && (
            <Button
              danger
              size="small"
              icon={<DeleteOutlined />}
              onClick={handleDeleteStrategy}
            >
              删除
            </Button>
          )
        }
      >
        {selectedStrategy && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Strategy Info */}
            <div>
              <div style={{ ...SECTION_HEADER_STYLE, marginBottom: 12 }}>
                基本信息
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Tag style={{ background: 'rgba(34,211,238,0.1)', borderColor: 'rgba(34,211,238,0.3)', color: 'var(--cyan-400)' }}>
                  {selectedStrategy.broker}
                </Tag>
                <Tag
                  style={{
                    background: selectedStrategy.running ? 'rgba(52,211,153,0.12)' : 'rgba(148,163,184,0.1)',
                    color: selectedStrategy.running ? 'var(--gain)' : 'var(--text-secondary)',
                    borderColor: selectedStrategy.running ? 'rgba(52,211,153,0.3)' : 'rgba(148,163,184,0.2)',
                  }}
                >
                  {selectedStrategy.running ? '运行中' : '已停止'}
                </Tag>
                <Tag style={{ background: 'rgba(148,163,184,0.1)', borderColor: 'rgba(148,163,184,0.2)', color: 'var(--text-secondary)' }}>
                  成交 {selectedStrategy.total_trades}
                </Tag>
                <Tag style={{ background: 'rgba(148,163,184,0.1)', borderColor: 'rgba(148,163,184,0.2)', color: 'var(--text-secondary)' }}>
                  日志 {selectedStrategy.log_count}
                </Tag>
              </div>
            </div>

            {/* Performance Metrics */}
            {performance && (
              <div>
                <div style={{ ...SECTION_HEADER_STYLE, marginBottom: 12 }}>
                  绩效指标
                </div>

                {/* 绩效主指标卡片 */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  {/* Total Return */}
                  <div style={{ ...METRIC_CARD_STYLE, position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: performance.total_return >= 0 ? 'linear-gradient(90deg, var(--gain), transparent)' : 'linear-gradient(90deg, var(--loss), transparent)' }} />
                    <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: 'var(--font-sans)', marginBottom: 8, marginTop: 4 }}>
                      总收益率
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-mono)', color: performance.total_return >= 0 ? 'var(--gain)' : 'var(--loss)', lineHeight: 1 }}>
                      {performance.total_return >= 0 ? '+' : ''}{performance.total_return.toFixed(2)}%
                    </div>
                  </div>
                  {/* Max Drawdown */}
                  <div style={{ ...METRIC_CARD_STYLE, position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, var(--loss), transparent)' }} />
                    <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: 'var(--font-sans)', marginBottom: 8, marginTop: 4 }}>
                      最大回撤
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--loss)', lineHeight: 1 }}>
                      -{performance.max_drawdown.toFixed(2)}%
                    </div>
                  </div>
                </div>

                {/* 胜率 & 盈亏比可视化 */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  {/* Win Rate with progress bar */}
                  <div style={{ ...METRIC_CARD_STYLE }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: 'var(--font-sans)' }}>
                        胜率
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-mono)', color: performance.win_rate >= 50 ? 'var(--gain)' : 'var(--loss)' }}>
                        {performance.win_rate.toFixed(0)}%
                      </div>
                    </div>
                    <div style={{ height: 6, background: 'rgba(248,113,113,0.2)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{
                        width: `${performance.win_rate}%`,
                        height: '100%',
                        background: performance.win_rate >= 50
                          ? 'linear-gradient(90deg, var(--gain), #6ee7b7)'
                          : 'linear-gradient(90deg, var(--loss), #fca5a5)',
                        borderRadius: 3,
                        transition: 'width 0.6s ease',
                        boxShadow: `0 0 8px ${performance.win_rate >= 50 ? 'rgba(52,211,153,0.5)' : 'rgba(248,113,113,0.5)'}`,
                      }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                      <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>0%</span>
                      <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>50%</span>
                      <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>100%</span>
                    </div>
                  </div>

                  {/* Profit/Loss Ratio with visual bar */}
                  <div style={{ ...METRIC_CARD_STYLE }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: 'var(--font-sans)' }}>
                        盈亏比
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--cyan-400)' }}>
                        {performance.profit_loss_ratio.toFixed(2)}
                      </div>
                    </div>
                    {/* 盈亏比迷你对比条 */}
                    <div style={{ display: 'flex', gap: 2, alignItems: 'center', height: 6 }}>
                      <div style={{
                        flex: Math.min(performance.profit_loss_ratio, 3),
                        height: '100%',
                        background: 'linear-gradient(90deg, var(--gain), #6ee7b7)',
                        borderRadius: '3px 0 0 3px',
                        boxShadow: '0 0 6px rgba(52,211,153,0.4)',
                      }} />
                      <div style={{
                        flex: 1,
                        height: '100%',
                        background: 'rgba(148,163,184,0.15)',
                        borderRadius: '0 3px 3px 0',
                      }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                      <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>盈利</span>
                      <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>亏损</span>
                    </div>
                  </div>
                </div>

                {/* 盈亏交易对比条 */}
                <div style={{ ...METRIC_CARD_STYLE, marginBottom: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: 'var(--font-sans)', marginBottom: 8 }}>
                    盈亏分布
                  </div>
                  {performance.total_trades > 0 ? (
                    <>
                      <div style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', gap: 2 }}>
                        <div style={{
                          flex: performance.winning_trades,
                          height: '100%',
                          background: 'linear-gradient(135deg, var(--gain), #6ee7b7)',
                          borderRadius: 5,
                          boxShadow: '0 0 6px rgba(52,211,153,0.4)',
                          transition: 'flex 0.6s ease',
                        }} />
                        <div style={{
                          flex: performance.losing_trades,
                          height: '100%',
                          background: 'linear-gradient(135deg, var(--loss), #fca5a5)',
                          borderRadius: 5,
                          boxShadow: '0 0 6px rgba(248,113,113,0.3)',
                          transition: 'flex 0.6s ease',
                        }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--gain)', fontWeight: 600 }}>
                          盈利 {performance.winning_trades} 次
                        </span>
                        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--loss)', fontWeight: 600 }}>
                          亏损 {performance.losing_trades} 次
                        </span>
                      </div>
                    </>
                  ) : (
                    <div style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', padding: '12px 0' }}>暂无交易数据</div>
                  )}
                </div>

                {/* Secondary metrics */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  <div style={{ ...METRIC_CARD_STYLE, padding: '12px 14px' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, fontFamily: 'var(--font-sans)' }}>总交易</div>
                    <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{performance.total_trades}</div>
                  </div>
                  <div style={{ ...METRIC_CARD_STYLE, padding: '12px 14px' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, fontFamily: 'var(--font-sans)' }}>平均盈利</div>
                    <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--gain)' }}>{performance.avg_profit.toFixed(4)}</div>
                  </div>
                  <div style={{ ...METRIC_CARD_STYLE, padding: '12px 14px' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, fontFamily: 'var(--font-sans)' }}>平均亏损</div>
                    <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--loss)' }}>{performance.avg_loss.toFixed(4)}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Signals */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ ...SECTION_HEADER_STYLE, marginBottom: 0 }}>
                  信号历史
                  <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontWeight: 400, marginLeft: 6 }}>
                    {filteredSignals.length} 条
                  </span>
                </div>
                <Segmented
                  size="small"
                  value={signalFilter}
                  onChange={(val) => setSignalFilter(val as 'all' | 'buy' | 'sell')}
                  options={[
                    { label: '全部', value: 'all' },
                    { label: '买入', value: 'buy' },
                    { label: '卖出', value: 'sell' },
                  ]}
                />
              </div>
              <Table
                dataSource={filteredSignals}
                columns={signalColumns}
                rowKey="id"
                pagination={{ pageSize: 10, size: 'small' }}
                size="small"
                locale={{ emptyText: '暂无信号记录' }}
              />
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
