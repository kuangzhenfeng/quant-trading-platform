import { useState, useEffect, useCallback } from 'react';
import { Select, InputNumber, Button, Space, message } from 'antd';
import {
  RocketOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  SettingOutlined,
  CodeOutlined,
  TagOutlined,
  ApartmentOutlined,
} from '@ant-design/icons';
import { strategyApi } from '../services/strategy';
import type { ApiError } from '../types/api';

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
  const [broker, setBroker] = useState('okx');
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
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

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
    } catch (error: unknown) {
      message.error((error as ApiError).response?.data?.detail || '创建失败');
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    if (!strategyId) return;
    try {
      await strategyApi.start(strategyId);
      message.success('策略已启动');
    } catch (error: unknown) {
      message.error((error as ApiError).response?.data?.detail || '启动失败');
    }
  };

  const handleStop = async () => {
    if (!strategyId) return;
    try {
      await strategyApi.stop(strategyId);
      message.success('策略已停止');
    } catch (error: unknown) {
      message.error((error as ApiError).response?.data?.detail || '停止失败');
    }
  };

  const handleRefreshLogs = useCallback(async () => {
    if (!strategyId) return;
    try {
      const logs = await strategyApi.getLogs(strategyId);
      setLogs(logs);
    } catch {
      message.error('获取日志失败');
    }
  }, [strategyId]);

  useEffect(() => {
    if (!strategyId) return;
    handleRefreshLogs();
    const interval = setInterval(handleRefreshLogs, 5000);
    return () => clearInterval(interval);
  }, [strategyId, handleRefreshLogs]);

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

          {/* Row 1: Broker + Symbol */}
          <div>
            <div style={{ ...FIELD_LABEL_STYLE, marginBottom: 12 }}>
              <ApartmentOutlined style={{ marginRight: 5 }} />
              交易标的
            </div>
            <Space wrap size={16}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={FIELD_LABEL_STYLE}>券商</span>
                <Select
                  value={broker}
                  onChange={setBroker}
                  style={{ width: 140 }}
                  options={[
                    { label: 'OKX', value: 'okx' },
                    { label: '国金证券', value: 'guojin' },
                    { label: 'moomoo', value: 'moomoo' },
                  ]}
                />
              </div>
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
            <Space size={8}>
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
              <Button
                icon={<PlayCircleOutlined />}
                onClick={handleStart}
                disabled={!strategyId}
                style={{
                  fontWeight: 600,
                  ...(strategyId
                    ? {
                        color: 'var(--gain)',
                        borderColor: 'rgba(52, 211, 153, 0.35)',
                        background: 'rgba(52, 211, 153, 0.08)',
                      }
                    : {}),
                }}
              >
                启动
              </Button>
              <Button
                icon={<PauseCircleOutlined />}
                onClick={handleStop}
                disabled={!strategyId}
                style={{
                  fontWeight: 600,
                  ...(strategyId
                    ? {
                        color: 'var(--loss)',
                        borderColor: 'rgba(248, 113, 113, 0.35)',
                        background: 'rgba(248, 113, 113, 0.08)',
                      }
                    : {}),
                }}
              >
                停止
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={handleRefreshLogs}
                disabled={!strategyId}
                style={{ fontWeight: 600 }}
              >
                刷新日志
              </Button>
            </Space>

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

      {/* Strategy Logs Card */}
      <div
        className="animate-in stagger-2"
        style={CARD_STYLE}
      >
        {/* Section Header */}
        <div style={{ ...SECTION_HEADER_STYLE, marginBottom: 16 }}>
          <CodeOutlined style={{ color: 'var(--amber-400)', fontSize: 15 }} />
          策略日志
          {logs.length > 0 && (
            <span style={{
              marginLeft: 4,
              padding: '2px 8px',
              background: 'rgba(251, 191, 36, 0.1)',
              border: '1px solid rgba(251, 191, 36, 0.2)',
              borderRadius: 99,
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
              color: 'var(--amber-400)',
              fontWeight: 600,
            }}>
              {logs.length}
            </span>
          )}
        </div>

        {/* Terminal Container */}
        <div style={{
          background: 'var(--bg-void)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-sm)',
          maxHeight: 400,
          overflow: 'auto',
          padding: '4px 0',
        }}>
          {/* Terminal Top Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px 10px',
            borderBottom: '1px solid var(--border-subtle)',
            marginBottom: 4,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f87171', display: 'inline-block' }} />
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fbbf24', display: 'inline-block' }} />
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#34d399', display: 'inline-block' }} />
            <span style={{
              marginLeft: 8,
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-muted)',
              letterSpacing: '0.5px',
            }}>
              strategy.log
            </span>
          </div>

          {logs.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '36px 20px',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
            }}>
              <span style={{ opacity: 0.5 }}>{'>'}</span>
              {' '}
              <span style={{ color: 'var(--text-tertiary)' }}>
                {strategyId ? '暂无日志...' : '请先创建并启动策略'}
              </span>
            </div>
          ) : (
            logs.map((log, index) => (
              <div
                key={index}
                style={{
                  padding: '5px 14px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  borderBottom: index < logs.length - 1 ? '1px solid rgba(148, 163, 184, 0.04)' : 'none',
                  lineHeight: 1.7,
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-start',
                }}
              >
                <span style={{ color: 'var(--text-muted)', userSelect: 'none', minWidth: 24, textAlign: 'right', fontWeight: 500 }}>
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span style={{ color: 'var(--cyan-400)', opacity: 0.6, userSelect: 'none' }}>{'>'}</span>
                <span style={{ flex: 1, wordBreak: 'break-all' }}>{log}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
