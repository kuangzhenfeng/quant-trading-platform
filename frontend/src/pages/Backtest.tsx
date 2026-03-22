import { useState, useEffect } from 'react';
import { Form, Input, DatePicker, Button, message, Select, Table, Tag } from 'antd';
import {
  ExperimentOutlined,
  BarChartOutlined,
  ThunderboltOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined,
} from '@ant-design/icons';
import { backtestApi } from '../services/backtest';
import type { BacktestFormValues, StrategyInfo, BatchResult, BacktestResult } from '../types/api';
import dayjs from 'dayjs';
import type { TableColumnsType } from 'antd';
import type { SortOrder } from 'antd/es/table/interface';

interface TableRow extends BatchResult {
  key: string;
  rank?: number;
  isTop?: boolean;
  isBottom?: boolean;
}

// 对结果排序并标记最佳/最差
function sortAndTagResults(
  results: BatchResult[],
  sortField: string,
  sortOrder: SortOrder,
): TableRow[] {
  const valid = results.filter(r => r.result !== null);
  if (sortField && sortOrder) {
    valid.sort((a, b) => {
      const aVal = a.result![sortField as keyof BacktestResult] as number;
      const bVal = b.result![sortField as keyof BacktestResult] as number;
      return sortOrder === 'ascend' ? aVal - bVal : bVal - aVal;
    });
  }
  return valid.map((r, i) => ({
    ...r,
    key: r.strategy_id,
    rank: i + 1,
    isTop: i < 3,
    isBottom: i === valid.length - 1,
  }));
}

export default function Backtest() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [runAllLoading, setRunAllLoading] = useState(false);
  const [results, setResults] = useState<BatchResult[]>([]);
  const [strategies, setStrategies] = useState<StrategyInfo[]>([]);
  const [sortField, setSortField] = useState<string>('total_return');
  const [sortOrder, setSortOrder] = useState<SortOrder>('descend');

  // 加载策略列表
  useEffect(() => {
    backtestApi.getStrategies().then(data => {
      setStrategies(data.strategies);
    }).catch(() => {
      setStrategies(FALLBACK_STRATEGIES);
    });
  }, []);

  // 内部排序用（传递给 Table，由 Table 管理）
  const sortedData = sortAndTagResults(results, sortField, sortOrder);

  const handleRun = async (values: BacktestFormValues) => {
    setLoading(true);
    setResults([]);
    try {
      const config = {
        strategy_id: values.strategy_id,
        symbol: values.symbol,
        start_date: values.date_range[0].format('YYYY-MM-DD'),
        end_date: values.date_range[1].format('YYYY-MM-DD'),
        initial_capital: values.initial_capital,
      };
      const { backtest_id } = await backtestApi.run(config);
      setTimeout(async () => {
        const res = await backtestApi.getResult(backtest_id);
        const strategy = strategies.find(s => s.strategy_id === values.strategy_id);
        setResults([{
          strategy_id: values.strategy_id,
          name: strategy?.name ?? values.strategy_id,
          category: strategy?.category ?? '',
          result: res,
          error: null,
        }]);
        setLoading(false);
        message.success('回测完成');
      }, 2000);
    } catch {
      setLoading(false);
      message.error('回测失败');
    }
  };

  const handleRunAll = async (values: BacktestFormValues) => {
    setRunAllLoading(true);
    setResults([]);
    try {
      const config = {
        strategy_id: 'ma_strategy',
        symbol: values.symbol,
        start_date: values.date_range[0].format('YYYY-MM-DD'),
        end_date: values.date_range[1].format('YYYY-MM-DD'),
        initial_capital: values.initial_capital,
      };
      const data = await backtestApi.runAll(config);
      setResults(data.results);
      setRunAllLoading(false);
      message.success('全部策略回测完成');
    } catch {
      setRunAllLoading(false);
      message.error('批量回测失败');
    }
  };

  // 排序变化时更新 state，用于重新计算排名
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleTableChange = (_: any, __: any, sorter: any) => {
    if (!sorter || !sorter.field) {
      setSortField('total_return');
      setSortOrder('descend');
      return;
    }
    setSortField(String(sorter.field));
    setSortOrder(sorter.order ?? 'descend');
  };

  const columns: TableColumnsType<TableRow> = [
    {
      title: '排名',
      dataIndex: 'rank',
      key: 'rank',
      width: 60,
      render: (rank: number, row: TableRow) => {
        if (row.isTop) {
          const medalColors = ['#f59e0b', '#94a3b8', '#cd7f32'];
          return (
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              fontWeight: 700,
              color: medalColors[rank - 1],
            }}>
              #{rank}
            </span>
          );
        }
        return (
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            color: 'var(--text-muted)',
          }}>
            #{rank}
          </span>
        );
      },
    },
    {
      title: '策略',
      dataIndex: 'name',
      key: 'name',
      width: 140,
      render: (name: string, row: TableRow) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}>
            {name}
          </span>
          <Tag
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              padding: '0 5px',
              lineHeight: '16px',
              borderRadius: 3,
              border: 'none',
              background: categoryColor(row.category),
              color: '#fff',
              width: 'fit-content',
            }}
          >
            {row.category}
          </Tag>
        </div>
      ),
    },
    {
      title: '总收益率',
      dataIndex: ['result', 'total_return'],
      key: 'total_return',
      sorter: true,
      sortOrder: sortField === 'total_return' ? sortOrder : null,
      width: 120,
      align: 'right',
      render: (val: number) => {
        const pct = val * 100;
        const color = pct >= 0 ? 'var(--gain)' : 'var(--loss)';
        const prefix = pct >= 0 ? '+' : '';
        return (
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 14,
            fontWeight: 700,
            color,
          }}>
            {prefix}{pct.toFixed(2)}%
          </span>
        );
      },
    },
    {
      title: '最大回撤',
      dataIndex: ['result', 'max_drawdown'],
      key: 'max_drawdown',
      sorter: true,
      sortOrder: sortField === 'max_drawdown' ? sortOrder : null,
      width: 110,
      align: 'right',
      render: (val: number) => (
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--loss)',
        }}>
          -{val >= 0 ? (val * 100).toFixed(2) : val.toFixed(2)}%
        </span>
      ),
    },
    {
      title: '胜率',
      dataIndex: ['result', 'win_rate'],
      key: 'win_rate',
      sorter: true,
      sortOrder: sortField === 'win_rate' ? sortOrder : null,
      width: 90,
      align: 'right',
      render: (val: number) => (
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--amber-400)',
        }}>
          {(val * 100).toFixed(1)}%
        </span>
      ),
    },
    {
      title: '交易次数',
      dataIndex: ['result', 'total_trades'],
      key: 'total_trades',
      sorter: true,
      sortOrder: sortField === 'total_trades' ? sortOrder : null,
      width: 100,
      align: 'right',
      render: (val: number) => (
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--cyan-400)',
        }}>
          {val}
        </span>
      ),
    },
  ];

  const hasResults = sortedData.length > 0;
  const strategyOptions = buildSelectOptions(strategies);

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
                  策略
                </span>
              }
              initialValue="ma_strategy"
              rules={[{ required: true }]}
            >
              <Select
                showSearch
                filterOption={(input, option) =>
                  (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                }
                style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}
                options={strategyOptions}
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
                style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}
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
            <div style={{ display: 'flex', gap: 12 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                icon={<ExperimentOutlined />}
                style={{
                  height: 42,
                  paddingInline: 28,
                  fontSize: 13,
                  fontFamily: 'var(--font-sans)',
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  background: 'linear-gradient(135deg, var(--cyan-400) 0%, var(--cyan-500) 100%)',
                  boxShadow: '0 0 16px rgba(34, 211, 238, 0.35), 0 2px 8px rgba(0,0,0,0.3)',
                }}
              >
                运行回测
              </Button>
              <Button
                icon={<ThunderboltOutlined />}
                onClick={() => {
                  form.validateFields().then(values => handleRunAll(values));
                }}
                loading={runAllLoading}
                style={{
                  height: 42,
                  paddingInline: 28,
                  fontSize: 13,
                  fontFamily: 'var(--font-sans)',
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  borderRadius: 'var(--radius-sm)',
                  background: 'linear-gradient(135deg, var(--amber-400) 0%, var(--amber-500) 100%)',
                  border: 'none',
                  color: '#000',
                  boxShadow: '0 0 16px rgba(245, 158, 11, 0.3), 0 2px 8px rgba(0,0,0,0.3)',
                }}
              >
                一键回测全部
              </Button>
            </div>
          </Form.Item>
        </Form>
      </div>

      {/* Results */}
      {hasResults ? (
        <div className="animate-in stagger-2">
          {/* Section Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
                回测结果 {sortedData.length > 1 ? `(${sortedData.length} 个策略)` : ''}
              </span>
            </div>
            {/* Sort hint */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--text-muted)',
              }}
            >
              {sortOrder === 'descend'
                ? <SortDescendingOutlined />
                : <SortAscendingOutlined />
              }
              <span>
                {sortField === 'total_return' ? '按收益率' :
                 sortField === 'max_drawdown' ? '按回撤' :
                 sortField === 'win_rate' ? '按胜率' : '按交易次数'} {sortOrder === 'descend' ? '↓' : '↑'}
              </span>
            </div>
          </div>

          <Table
            columns={columns}
            dataSource={sortedData}
            pagination={false}
            onChange={handleTableChange}
            rowClassName={(record: TableRow) => {
              let cls = 'backtest-row';
              if (record.isTop) cls += ' backtest-row-top';
              if (record.isBottom) cls += ' backtest-row-bottom';
              return cls;
            }}
            style={{
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
            }}
          />
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
            配置参数后运行回测，查看策略绩效对比
          </span>
          <div
            style={{
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
              justifyContent: 'center',
              marginTop: 4,
            }}
          >
            {FALLBACK_STRATEGIES.slice(0, 5).map(s => (
              <Tag
                key={s.strategy_id}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  padding: '2px 8px',
                  borderRadius: 4,
                  border: 'none',
                  background: categoryColor(s.category),
                  color: '#fff',
                }}
              >
                {s.name}
              </Tag>
            ))}
            <Tag
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                padding: '2px 8px',
                borderRadius: 4,
                border: '1px solid var(--border-default)',
                background: 'transparent',
                color: 'var(--text-muted)',
              }}
            >
              +{strategies.length > 5 ? strategies.length - 5 : 11} more
            </Tag>
          </div>
        </div>
      )}

      <style>{`
        .backtest-row-top {
          background: rgba(34, 211, 238, 0.03) !important;
        }
        .backtest-row-top td {
          background: transparent !important;
        }
        .backtest-row-top:hover > td {
          background: rgba(34, 211, 238, 0.06) !important;
        }
        .backtest-row-bottom {
          background: rgba(248, 113, 113, 0.03) !important;
        }
        .backtest-row-bottom td {
          background: transparent !important;
        }
        .backtest-row-bottom:hover > td {
          background: rgba(248, 113, 113, 0.06) !important;
        }
      `}</style>
    </div>
  );
}

// 分类颜色映射
function categoryColor(category: string): string {
  switch (category) {
    case '趋势跟踪': return 'rgba(34, 211, 238, 0.8)';
    case '均值回归': return 'rgba(245, 158, 11, 0.8)';
    case '通道突破': return 'rgba(52, 211, 153, 0.8)';
    default: return 'rgba(148, 163, 184, 0.6)';
  }
}

// 构建带分组的下拉选项
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildSelectOptions(strategies: StrategyInfo[]): any[] {
  if (strategies.length === 0) {
    return FALLBACK_STRATEGIES.map(s => ({
      label: s.name,
      value: s.strategy_id,
    }));
  }

  const groups: Record<string, StrategyInfo[]> = {};
  for (const s of strategies) {
    if (!groups[s.category]) groups[s.category] = [];
    groups[s.category].push(s);
  }

  return Object.entries(groups).map(([category, items]) => ({
    label: category,
    options: items.map(s => ({
      label: `${s.name} — ${s.description}`,
      value: s.strategy_id,
    })),
  }));
}

// 内置策略列表（作为降级方案）
const FALLBACK_STRATEGIES: StrategyInfo[] = [
  { type: 'ma', strategy_id: 'ma_strategy', name: 'MA', description: '均线交叉', category: '趋势跟踪' },
  { type: 'macd', strategy_id: 'macd_strategy', name: 'MACD', description: 'MACD 指标', category: '趋势跟踪' },
  { type: 'bollinger', strategy_id: 'bollinger_strategy', name: 'Bollinger', description: '布林带', category: '均值回归' },
  { type: 'rsi', strategy_id: 'rsi_strategy', name: 'RSI', description: '相对强弱指标', category: '均值回归' },
  { type: 'supertrend', strategy_id: 'supertrend_strategy', name: 'Supertrend', description: '超级趋势', category: '趋势跟踪' },
  { type: 'parabolic', strategy_id: 'parabolic_strategy', name: 'Parabolic SAR', description: '抛物线止损', category: '趋势跟踪' },
  { type: 'stochastic', strategy_id: 'stochastic_strategy', name: 'Stochastic', description: '随机指标', category: '均值回归' },
  { type: 'adx', strategy_id: 'adx_strategy', name: 'ADX', description: '平均趋向指数', category: '趋势跟踪' },
  { type: 'momentum', strategy_id: 'momentum_strategy', name: 'Momentum', description: '动量策略', category: '趋势跟踪' },
  { type: 'cci', strategy_id: 'cci_strategy', name: 'CCI', description: '顺势指标', category: '均值回归' },
  { type: 'atr_channel', strategy_id: 'atr_channel_strategy', name: 'ATR Channel', description: 'ATR 通道', category: '通道突破' },
  { type: 'keltner', strategy_id: 'keltner_strategy', name: 'Keltner', description: '肯特纳通道', category: '通道突破' },
  { type: 'donchian', strategy_id: 'donchian_strategy', name: 'Donchian', description: '唐奇安通道', category: '通道突破' },
  { type: 'dual_rsi', strategy_id: 'dual_rsi_strategy', name: 'Dual RSI', description: '双 RSI 策略', category: '均值回归' },
  { type: 'ma_rsi', strategy_id: 'ma_rsi_strategy', name: 'MA+RSI', description: '均线 RSI 组合', category: '趋势跟踪' },
  { type: 'ichimoku', strategy_id: 'ichimoku_strategy', name: 'Ichimoku', description: '一目均衡表', category: '趋势跟踪' },
];
