import { useState } from 'react';
import { Form, Input, DatePicker, Button, message, Select } from 'antd';
import { ExperimentOutlined, BarChartOutlined } from '@ant-design/icons';
import { backtestApi } from '../services/backtest';
import type { BacktestResult, BacktestFormValues } from '../types/api';
import dayjs from 'dayjs';

export default function Backtest() {
  const [form] = Form.useForm();
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRun = async (values: BacktestFormValues) => {
    setLoading(true);
    try {
      const config = {
        strategy_id: values.strategy_id,
        symbol: values.symbol,
        start_date: values.date_range[0].format('YYYY-MM-DD'),
        end_date: values.date_range[1].format('YYYY-MM-DD'),
        initial_capital: values.initial_capital
      };
      const { backtest_id } = await backtestApi.run(config);

      // 等待回测完成并获取结果
      setTimeout(async () => {
        const res = await backtestApi.getResult(backtest_id);
        setResult(res);
        setLoading(false);
        message.success('回测完成');
      }, 2000);
    } catch {
      setLoading(false);
      message.error('回测失败');
    }
  };

  return (
    <div
      style={{
        padding: '32px 24px',
        minHeight: '100vh',
        background: 'var(--bg-void)',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {/* Page Header */}
      <div className="page-header animate-in" style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <ExperimentOutlined
            style={{
              fontSize: 22,
              color: 'var(--cyan-400)',
              filter: 'drop-shadow(0 0 6px var(--cyan-400))',
            }}
          />
          <h1 className="page-title" style={{ margin: 0 }}>Backtest</h1>
        </div>
        <p className="page-subtitle" style={{ margin: 0 }}>策略回测与绩效分析</p>
      </div>

      {/* Form Container */}
      <div
        className="animate-in stagger-1"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '28px 32px',
          marginBottom: 24,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 24,
            paddingBottom: 16,
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <ExperimentOutlined style={{ color: 'var(--cyan-400)', fontSize: 15 }} />
          <span
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--text-secondary)',
            }}
          >
            回测配置
          </span>
        </div>

        <Form form={form} onFinish={handleRun} layout="vertical">
          <div
            className="page-grid-2"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '0 24px',
            }}
          >
            <Form.Item
              name="strategy_id"
              label={
                <span
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--text-secondary)',
                  }}
                >
                  策略 ID
                </span>
              }
              initialValue="ma_strategy"
              rules={[{ required: true }]}
            >
              <Select
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                }}
                options={[
                  { label: 'MA策略', value: 'ma_strategy' },
                  { label: 'MACD策略', value: 'macd_strategy' },
                  { label: '布林带策略', value: 'bollinger_strategy' },
                  { label: 'RSI策略', value: 'rsi_strategy' },
                ]}
              />
            </Form.Item>

            <Form.Item
              name="symbol"
              label={
                <span
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--text-secondary)',
                  }}
                >
                  交易标的
                </span>
              }
              initialValue="BTC-USDT"
              rules={[{ required: true }]}
            >
              <Select
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                }}
                options={[
                  { label: 'BTC-USDT', value: 'BTC-USDT' },
                  { label: 'ETH-USDT', value: 'ETH-USDT' },
                  { label: '600000.SH', value: '600000.SH' },
                  { label: '000001.SZ', value: '000001.SZ' },
                  { label: 'AAPL', value: 'AAPL' },
                  { label: 'TSLA', value: 'TSLA' },
                ]}
              />
            </Form.Item>

            <Form.Item
              name="date_range"
              label={
                <span
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--text-secondary)',
                  }}
                >
                  回测时间范围
                </span>
              }
              initialValue={[dayjs().subtract(1, 'month'), dayjs()]}
              rules={[{ required: true }]}
            >
              <DatePicker.RangePicker
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                  height: 38,
                  width: '100%',
                }}
              />
            </Form.Item>

            <Form.Item
              name="initial_capital"
              label={
                <span
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--text-secondary)',
                  }}
                >
                  初始资金
                </span>
              }
              initialValue={100000}
              rules={[{ required: true }]}
            >
              <Input
                type="number"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                  height: 38,
                }}
              />
            </Form.Item>
          </div>

          <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              icon={<ExperimentOutlined />}
              style={{
                height: 42,
                paddingInline: 32,
                fontSize: 13,
                fontFamily: 'var(--font-sans)',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                background: 'linear-gradient(135deg, var(--cyan-400) 0%, var(--cyan-500) 100%)',
                boxShadow: '0 0 16px rgba(34, 211, 238, 0.35), 0 2px 8px rgba(0,0,0,0.3)',
                cursor: 'pointer',
              }}
            >
              开始回测
            </Button>
          </Form.Item>
        </Form>
      </div>

      {/* Results */}
      {result ? (
        <div className="animate-in stagger-2">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 16,
            }}
          >
            <BarChartOutlined style={{ color: 'var(--cyan-400)', fontSize: 15 }} />
            <span
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--text-secondary)',
              }}
            >
              回测结果
            </span>
          </div>

          <div
            className="page-grid-4"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 16,
            }}
          >
            {/* 总收益率 */}
            <div
              className="apex-stat animate-in stagger-3"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '20px 24px',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 2,
                  background: result.total_return >= 0
                    ? 'var(--gain)'
                    : 'var(--loss)',
                  borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
                }}
              />
              <div
                className="apex-stat-label"
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--text-secondary)',
                  marginBottom: 10,
                }}
              >
                总收益率
              </div>
              <div
                className="apex-stat-value"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 28,
                  fontWeight: 700,
                  lineHeight: 1,
                  color: result.total_return >= 0 ? 'var(--gain)' : 'var(--loss)',
                }}
              >
                {result.total_return >= 0 ? '+' : ''}
                {(result.total_return * 100).toFixed(2)}%
              </div>
            </div>

            {/* 最大回撤 */}
            <div
              className="apex-stat animate-in stagger-4"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '20px 24px',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 2,
                  background: 'var(--loss)',
                  borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
                }}
              />
              <div
                className="apex-stat-label"
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--text-secondary)',
                  marginBottom: 10,
                }}
              >
                最大回撤
              </div>
              <div
                className="apex-stat-value"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 28,
                  fontWeight: 700,
                  lineHeight: 1,
                  color: 'var(--loss)',
                }}
              >
                -{(result.max_drawdown * 100).toFixed(2)}%
              </div>
            </div>

            {/* 胜率 */}
            <div
              className="apex-stat animate-in stagger-5"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '20px 24px',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 2,
                  background: 'var(--amber-400)',
                  borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
                }}
              />
              <div
                className="apex-stat-label"
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--text-secondary)',
                  marginBottom: 10,
                }}
              >
                胜率
              </div>
              <div
                className="apex-stat-value"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 28,
                  fontWeight: 700,
                  lineHeight: 1,
                  color: 'var(--amber-400)',
                }}
              >
                {(result.win_rate * 100).toFixed(2)}%
              </div>
            </div>

            {/* 总交易次数 */}
            <div
              className="apex-stat animate-in stagger-6"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '20px 24px',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 2,
                  background: 'var(--cyan-400)',
                  borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
                }}
              />
              <div
                className="apex-stat-label"
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--text-secondary)',
                  marginBottom: 10,
                }}
              >
                总交易次数
              </div>
              <div
                className="apex-stat-value"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 28,
                  fontWeight: 700,
                  lineHeight: 1,
                  color: 'var(--cyan-400)',
                }}
              >
                {result.total_trades}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Empty state */
        <div
          className="animate-in stagger-2"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '64px 24px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            gap: 14,
          }}
        >
          <BarChartOutlined
            style={{
              fontSize: 40,
              color: 'var(--text-muted)',
              opacity: 0.4,
            }}
          />
          <span
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              color: 'var(--text-muted)',
              letterSpacing: '0.04em',
            }}
          >
            运行回测查看结果
          </span>
        </div>
      )}
    </div>
  );
}
