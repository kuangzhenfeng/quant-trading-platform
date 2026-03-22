import { useState, useEffect, useRef } from 'react';
import { Button, Select, Switch } from 'antd';
import { ReloadOutlined, RiseOutlined, FallOutlined } from '@ant-design/icons';
import { createChart, type IChartApi, type ISeriesApi, type CandlestickData, type Time, CandlestickSeries, createSeriesMarkers, type ISeriesMarkersPluginApi } from 'lightweight-charts';
import { useBrokerStore } from '../stores/brokerStore';
import { marketApi } from '../services/market';
import { useStrategyMarkers } from '../hooks/useStrategyMarkers';
import type { StrategySignal } from '../types/api';

// 深度优化样式
const marketStyles = `
  @keyframes scan-market {
    0%   { left: -100%; }
    100% { left: 200%; }
  }
  @keyframes price-flash-up {
    0%   { opacity: 1; }
    50%  { opacity: 0.3; color: var(--gain); }
    100% { opacity: 1; }
  }
  @keyframes price-flash-down {
    0%   { opacity: 1; }
    50%  { opacity: 0.3; color: var(--loss); }
    100% { opacity: 1; }
  }
  @keyframes indicator-pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50%       { opacity: 0.4; transform: scale(0.85); }
  }
  @keyframes bar-fill {
    from { width: 0; }
    to   { width: var(--target-width); }
  }

  /* 控制面板玻璃态 */
  .market-control-panel {
    padding: 16px 20px 14px;
    background: var(--bg-surface);
    border-bottom: 1px solid var(--border-subtle);
    position: relative;
    overflow: hidden;
  }
  .market-control-panel::before {
    content: '';
    position: absolute;
    top: 0; left: -100%;
    width: 50%;
    height: 2px;
    background: linear-gradient(90deg, transparent, var(--cyan-400), transparent);
    animation: scan-market 4s linear infinite;
    pointer-events: none;
    opacity: 0.7;
  }

  /* 价格行情条 */
  .price-ticker-strip {
    display: grid;
    grid-template-columns: 1.4fr 1.6fr 1fr 1fr 1.2fr;
    gap: 0;
    margin-bottom: 14px;
    background: var(--bg-elevated);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    overflow: hidden;
    position: relative;
  }
  .price-ticker-strip::after {
    content: '';
    position: absolute;
    bottom: 0; left: 0; right: 0;
    height: 2px;
    background: linear-gradient(90deg, var(--cyan-400), var(--cyan-600), transparent);
    opacity: 0.4;
  }
  .ticker-cell {
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    position: relative;
    transition: background 0.2s;
  }
  .ticker-cell:not(:last-child)::after {
    content: '';
    position: absolute;
    right: 0; top: 20%; bottom: 20%;
    width: 1px;
    background: var(--border-subtle);
  }
  .ticker-cell:hover {
    background: var(--bg-surface);
  }
  .ticker-label {
    font-family: var(--font-sans);
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1.2px;
    color: var(--text-tertiary);
    margin-bottom: 4px;
  }
  .ticker-main-price {
    font-family: var(--font-mono);
    font-size: 22px;
    font-weight: 800;
    line-height: 1.1;
    letter-spacing: -0.02em;
    transition: color 0.3s;
  }
  .ticker-main-price.flash-up { animation: price-flash-up 0.5s ease-out; color: var(--gain) !important; }
  .ticker-main-price.flash-down { animation: price-flash-down 0.5s ease-out; color: var(--loss) !important; }
  .ticker-change {
    font-family: var(--font-mono);
    font-size: 13px;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .ticker-hl {
    font-family: var(--font-mono);
    font-size: 14px;
    font-weight: 700;
  }
  .ticker-controls {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
  }

  /* 控制行 */
  .market-ctrl-row {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }
  .market-ctrl-label {
    font-family: var(--font-sans);
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--text-tertiary);
  }

  /* 区间选择器（自定义胶囊） */
  .interval-pills {
    display: flex;
    gap: 2px;
    background: var(--bg-elevated);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-sm);
    padding: 3px;
  }
  .interval-pill {
    padding: 4px 10px;
    border-radius: 4px;
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    color: var(--text-tertiary);
    border: none;
    background: transparent;
  }
  .interval-pill:hover { color: var(--text-secondary); background: var(--bg-surface); }
  .interval-pill.active {
    background: var(--cyan-400);
    color: #fff;
    box-shadow: 0 2px 8px rgba(34,211,238,0.3);
  }
  [data-theme="light"] .interval-pill.active {
    background: var(--cyan-400);
    color: #fff;
    box-shadow: 0 2px 8px rgba(245,158,11,0.25);
  }

  /* 刷新按钮 */
  .market-refresh-btn {
    border: 1px solid var(--cyan-400) !important;
    color: var(--cyan-400) !important;
    border-radius: var(--radius-sm) !important;
    font-family: var(--font-sans) !important;
    font-size: 11px !important;
    font-weight: 600 !important;
    transition: all 0.2s !important;
  }
  .market-refresh-btn:hover {
    background: rgba(34,211,238,0.1) !important;
    box-shadow: 0 0 12px rgba(34,211,238,0.15) !important;
    transform: translateY(-1px);
  }
  [data-theme="light"] .market-refresh-btn {
    border-color: var(--amber-400) !important;
    color: var(--amber-500) !important;
  }
  [data-theme="light"] .market-refresh-btn:hover {
    background: rgba(245,158,11,0.08) !important;
    box-shadow: 0 0 12px rgba(245,158,11,0.15) !important;
  }

  /* 模式指示器 */
  .market-mode-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    display: inline-block;
    animation: indicator-pulse 2s ease-in-out infinite;
  }
  .market-mode-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 10px;
    border-radius: 20px;
    font-family: var(--font-sans);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }
  .market-mode-live { background: rgba(239,68,68,0.15); color: var(--loss); }
  .market-mode-paper { background: rgba(234,179,8,0.15); color: var(--amber-400); }
  .market-mode-mock { background: rgba(34,197,94,0.15); color: var(--gain); }

  /* 图表容器 */
  .market-chart-wrap {
    position: relative;
    min-height: 520px;
    overflow: hidden;
  }
  .market-chart-bg {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 0;
  }

  /* 信号开关 */
  .market-signal-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  /* 迷你指示器面板 */
  .mini-indicators {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    padding: 0 16px 14px;
    background: var(--bg-surface);
    border-bottom: 1px solid var(--border-subtle);
  }
  .mini-indicator-card {
    background: var(--bg-elevated);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-sm);
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    position: relative;
    overflow: hidden;
    transition: all 0.25s;
  }
  .mini-indicator-card:hover {
    border-color: var(--cyan-400);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(34,211,238,0.06);
  }
  .mini-indicator-card::before {
    content: '';
    position: absolute;
    bottom: 0; left: 0; right: 0;
    height: 2px;
    background: linear-gradient(90deg, var(--cyan-400), transparent);
    opacity: 0;
    transition: opacity 0.3s;
  }
  .mini-indicator-card:hover::before { opacity: 1; }
  [data-theme="light"] .mini-indicator-card:hover {
    border-color: var(--amber-400);
    box-shadow: 0 4px 12px rgba(245,158,11,0.08);
  }
  [data-theme="light"] .mini-indicator-card::before {
    background: linear-gradient(90deg, var(--amber-400), transparent);
  }
  .mini-indicator-label {
    font-family: var(--font-sans);
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--text-tertiary);
  }
  .mini-indicator-value {
    font-family: var(--font-mono);
    font-size: 15px;
    font-weight: 800;
    color: var(--text-primary);
    letter-spacing: -0.01em;
  }

  /* 工具提示 */
  .market-tooltip {
    position: absolute;
    z-index: 100;
    background: var(--bg-surface);
    border: 1px solid var(--cyan-400);
    border-radius: var(--radius-md);
    padding: 12px 14px;
    font-size: 12px;
    color: var(--text-primary);
    pointer-events: none;
    box-shadow: 0 8px 32px rgba(34,211,238,0.12), 0 2px 8px rgba(0,0,0,0.4);
    backdrop-filter: blur(12px);
    min-width: 210px;
  }
  [data-theme="light"] .market-tooltip {
    border-color: var(--amber-400);
    box-shadow: 0 8px 32px rgba(245,158,11,0.1), 0 2px 8px rgba(0,0,0,0.1);
  }

  /* 加载骨架屏 */
  .market-skeleton {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 5;
    background: rgba(0,0,0,0.3);
    backdrop-filter: blur(2px);
  }
  .market-skeleton-inner {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }
  .skeleton-bar {
    width: 180px;
    height: 3px;
    background: var(--border-subtle);
    border-radius: 2px;
    overflow: hidden;
    position: relative;
  }
  .skeleton-bar::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, var(--cyan-400), transparent);
    animation: scan-market 1.5s linear infinite;
    opacity: 0.6;
  }

  /* 移动端 */
  @media (max-width: 768px) {
    .price-ticker-strip {
      grid-template-columns: 1fr 1fr;
    }
    .ticker-cell:nth-child(3),
    .ticker-cell:nth-child(4) {
      display: none;
    }
    .mini-indicators {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  @media (max-width: 480px) {
    .price-ticker-strip {
      grid-template-columns: 1fr 1fr;
      gap: 0;
    }
    .ticker-cell { padding: 10px 10px; }
    .ticker-main-price { font-size: 18px; }
  }
`;

// K线图专用颜色
function getKlineColors() {
  const root = document.documentElement;
  const isDark = root.getAttribute('data-theme') !== 'light';
  return {
    layoutBg: isDark ? 'rgba(15, 23, 42, 0.8)' : 'rgba(248, 249, 251, 0.95)',
    textColor: isDark ? '#94a3b8' : '#475569',
    gridColor: isDark ? 'rgba(51, 65, 85, 0.3)' : 'rgba(30, 41, 59, 0.1)',
    containerBg: isDark ? 'rgba(22, 24, 31, 0.85)' : 'rgba(255, 255, 255, 0.95)',
    containerBorder: isDark ? 'rgba(51, 65, 85, 0.5)' : 'rgba(30, 41, 59, 0.15)',
    textSecondary: isDark ? '#94a3b8' : '#475569',
    upColor: '#10b981',
    downColor: '#ef4444',
    borderUpColor: '#10b981',
    borderDownColor: '#ef4444',
    wickUpColor: '#10b981',
    wickDownColor: '#ef4444',
    accentColor: isDark ? '#22d3ee' : '#0891b2',
    cardBg: isDark ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.03)',
    divider: isDark ? 'rgba(51,65,85,0.3)' : 'rgba(30,41,59,0.1)',
  };
}

export default function Market() {
  const { broker } = useBrokerStore();
  const [klineInterval, setKlineInterval] = useState('1H');
  const [klineSymbol, setKlineSymbol] = useState('BTC-USDT');
  const [klineLoading, setKlineLoading] = useState(false);
  const [chartColors, setChartColors] = useState(getKlineColors);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const markersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const [tooltipData, setTooltipData] = useState({
    visible: false, x: 0, y: 0, signal: null as { strategy_id: string; side: string; price: number; quantity: number; timestamp: string; reason: string } | null,
  });
  const tooltipContainerRef = useRef<HTMLDivElement>(null);
  const [_klineMode, setKlineMode] = useState<'mock' | 'paper' | 'live'>('mock');

  // 价格行情条数据
  const [priceTicker, setPriceTicker] = useState<{
    last: number; change: number; changePct: number;
    high: number; low: number; open: number; volume: number;
  } | null>(null);
  // 价格闪烁
  const [priceFlash, setPriceFlash] = useState<'up' | 'down' | null>(null);

  // 迷你指标
  const [miniIndicators, setMiniIndicators] = useState({ rsi: '—', volatility: '—', trend: '—' });

  const marker = useStrategyMarkers();
  const signalsRef = useRef<Record<string, StrategySignal[]>>({});
  const enabledRef = useRef(true);
  const chartReadyRef = useRef(false);
  const isMountedRef = useRef(true);
  const activeLoadIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  // 上一次价格用于闪烁检测
  const lastPriceRef = useRef<number | null>(null);
  enabledRef.current = marker.enabled;
  signalsRef.current = marker.signals;

  // 主题变化监听
  useEffect(() => {
    setChartColors(getKlineColors);
    const observer = new MutationObserver(() => setChartColors(getKlineColors));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  // 加载K线数据
  const loadKlineData = async () => {
    // 分配本次调用的唯一 ID
    const loadId = ++activeLoadIdRef.current;
    console.log('[Market] loadKlineData id:', loadId, 'active:', activeLoadIdRef.current);
    setKlineLoading(true);
    try {
      // 创建图表（如果尚未创建）。StrictMode 双调用场景下复用已有图表，避免图表在 async 完成前被销毁
      if (chartContainerRef.current && !chartRef.current) {
        console.log('[Market] 创建图表 id:', loadId);
        const kc = getKlineColors();
        const chart = createChart(chartContainerRef.current, {
          layout: { background: { color: kc.layoutBg }, textColor: kc.textColor },
          grid: { vertLines: { color: kc.gridColor }, horzLines: { color: kc.gridColor } },
          width: chartContainerRef.current.clientWidth,
          height: 500,
        });
        const candlestickSeries = chart.addSeries(CandlestickSeries, {
          upColor: kc.upColor,
          downColor: kc.downColor,
          borderUpColor: kc.borderUpColor,
          borderDownColor: kc.borderDownColor,
          wickUpColor: kc.wickUpColor,
          wickDownColor: kc.wickDownColor,
        });
        chartRef.current = chart;
        candlestickSeriesRef.current = candlestickSeries;
        chartReadyRef.current = true;
        markersRef.current = createSeriesMarkers(candlestickSeries, []);

        chart.subscribeCrosshairMove((param) => {
          if (!param.time || !candlestickSeriesRef.current) {
            setTooltipData(prev => ({ ...prev, visible: false }));
            return;
          }
          const bar = param.seriesData.get(candlestickSeriesRef.current) as CandlestickData<Time> | undefined;
          if (!bar) {
            setTooltipData(prev => ({ ...prev, visible: false }));
            return;
          }
          const sigTime = (param.time as number) * 1000;
          let found: StrategySignal | null = null;
          if (enabledRef.current) {
            for (const sList of Object.values(signalsRef.current)) {
              for (const s of sList) {
                const sTs = new Date(s.timestamp).getTime();
                if (Math.abs(sTs - sigTime) < 3600000) {
                  found = s;
                  break;
                }
              }
              if (found) break;
            }
          }
          if (found && param.point) {
            const rect = chartContainerRef.current?.getBoundingClientRect();
            if (rect) {
              setTooltipData({ visible: true, x: param.point.x, y: param.point.y, signal: found });
            }
          } else {
            setTooltipData(prev => ({ ...prev, visible: false }));
          }
        });
      }
      if (chartRef.current && chartContainerRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
      }

      // 获取并设置数据
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const data = await marketApi.getKlines(klineSymbol, broker, klineInterval, 100, controller.signal);
      console.log('[Market] API返回 id:', loadId, 'active:', activeLoadIdRef.current, 'series:', !!candlestickSeriesRef.current, 'data:', data.klines?.length);
      // 如果 loadId 不是当前活跃的（说明组件已卸载或重新加载），忽略
      if (loadId !== activeLoadIdRef.current) { console.log('[Market] 跳过 (id不匹配)'); return; }
      if (candlestickSeriesRef.current && data.klines) {
        setKlineMode(data.mode || 'mock');
        const candleData: CandlestickData<Time>[] = data.klines.map(k => ({
          time: (new Date(k.time).getTime() / 1000) as Time,
          open: k.open, high: k.high, low: k.low, close: k.close,
        }));
        // 计算价格行情条
        if (candleData.length > 0) {
          const last = candleData[candleData.length - 1].close;
          const first = candleData[0].open;
          const change = last - first;
          const changePct = first !== 0 ? (change / first) * 100 : 0;
          const high = Math.max(...candleData.map(c => c.high));
          const low = Math.min(...candleData.map(c => c.low));
          setPriceTicker({ last, change, changePct, high, low, open: first, volume: 0 });

          // 价格闪烁检测
          if (lastPriceRef.current !== null && last !== lastPriceRef.current) {
            setPriceFlash(last > lastPriceRef.current ? 'up' : 'down');
            setTimeout(() => setPriceFlash(null), 500);
          }
          lastPriceRef.current = last;

          // 计算迷你指标
          if (candleData.length >= 14) {
            // RSI 简化计算
            let gains = 0, losses = 0;
            for (let i = 1; i < candleData.length; i++) {
              const diff = candleData[i].close - candleData[i - 1].close;
              if (diff > 0) gains += diff;
              else losses += Math.abs(diff);
            }
            const avgGain = gains / candleData.length;
            const avgLoss = losses / candleData.length;
            const rsi = avgLoss === 0 ? 100 : Math.round(100 - 100 / (1 + avgGain / avgLoss));

            // 波动率（标准差简化）
            const mean = candleData.reduce((s, c) => s + c.close, 0) / candleData.length;
            const variance = candleData.reduce((s, c) => s + Math.pow(c.close - mean, 2), 0) / candleData.length;
            const volatility = Math.round(Math.sqrt(variance) / mean * 100 * 10) / 10;

            // 趋势（基于最近5根K线）
            const recent = candleData.slice(-5);
            const trendUp = recent.filter((c, i) => i === 0 || c.close > recent[i - 1].close).length;
            const trend = trendUp >= 4 ? '强势上涨' : trendUp <= 1 ? '弱势下跌' : '震荡整理';

            setMiniIndicators({
              rsi: `${rsi}`,
              volatility: `${volatility}%`,
              trend,
            });
          }
        }
        candlestickSeriesRef.current.setData(candleData);
        chartRef.current?.timeScale().fitContent();
        if (marker.enabled) {
          marker.updateKlineSymbol(klineSymbol);
          await marker.initialize(klineSymbol, marker.selectedStrategies);
        }
      }
    } catch (error) {
      // AbortController 取消的请求不打印错误日志
      if (loadId === activeLoadIdRef.current && !(error instanceof Error && error.name === 'CanceledError')) {
        console.error('加载K线数据失败:', error);
      }
    } finally {
      if (loadId === activeLoadIdRef.current) {
        setKlineLoading(false);
      }
    }
  };

  // 挂载时加载K线数据
  useEffect(() => {
    loadKlineData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 信号开关变化时，加载或清理信号
  useEffect(() => {
    if (marker.enabled) {
      marker.initialize(klineSymbol, marker.selectedStrategies);
    } else {
      marker.cleanup();
      setSignalsEmpty();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marker.enabled]);

  // 信号列表或筛选变化时，更新图表上的 markers
  useEffect(() => {
    if (!chartReadyRef.current || !marker.enabled || !markersRef.current) return;
    const kc = chartColors;
    const markers = marker.getMarkers(kc.upColor, kc.downColor);
    markersRef.current.setMarkers(markers as any);
  }, [marker.signals, marker.selectedStrategies, marker.sideFilter, marker.enabled, chartColors]);

  const setSignalsEmpty = () => {
    if (chartReadyRef.current && markersRef.current) {
      markersRef.current.setMarkers([]);
    }
  };

  // 图表 resize 监听和组件卸载清理
  useEffect(() => {
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    const observer = new MutationObserver(() => {
      activeLoadIdRef.current += 1;
      chartRef.current?.remove();
      chartRef.current = null;
      candlestickSeriesRef.current = null;
      chartReadyRef.current = false;
      markersRef.current = null;
      setTimeout(() => isMountedRef.current && loadKlineData(), 100);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    return () => {
      console.log('[Market] cleanup');
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
      marker.cleanup();
      // 取消 pending 的 API 请求，防止 cleanup 后响应到达导致竞态
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
      // 销毁图表并清理所有 refs
      chartRef.current?.remove();
      chartRef.current = null;
      candlestickSeriesRef.current = null;
      chartReadyRef.current = false;
      markersRef.current = null;
      isMountedRef.current = false;
    };
    // marker.cleanup 是 useCallback 稳定引用，只在实际 enabled 切换时变化
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marker.cleanup]);

  return (
    <>
      <style>{marketStyles}</style>
      <div>
        {/* 页面头部 */}
        <div className="page-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 className="page-title">Market</h1>
            {/* 模式徽章 */}
            <span className={`market-mode-badge market-mode-${_klineMode}`}>
              <span className="market-mode-dot" />
              {{ live: '实盘', paper: '模拟盘', mock: 'Mock' }[_klineMode]}
            </span>
          </div>
          <p className="page-subtitle">K线图表 · 实时行情</p>
        </div>

        {/* 价格行情条 */}
        {priceTicker && (
          <div className="price-ticker-strip animate-in stagger-1" style={{ marginBottom: 16 }}>
            {/* 当前价格 */}
            <div className="ticker-cell">
              <span className="ticker-label">当前价格</span>
              <span className={`ticker-main-price ${priceFlash ? `flash-${priceFlash}` : ''}`} style={{ color: priceTicker.change >= 0 ? 'var(--gain)' : 'var(--loss)' }}>
                {priceTicker.last.toFixed(2)}
              </span>
            </div>
            {/* 涨跌幅 */}
            <div className="ticker-cell">
              <span className="ticker-label">24h 涨跌</span>
              <span className="ticker-change" style={{ color: priceTicker.change >= 0 ? 'var(--gain)' : 'var(--loss)' }}>
                {priceTicker.change >= 0 ? <RiseOutlined /> : <FallOutlined />}
                {priceTicker.change >= 0 ? '+' : ''}{priceTicker.change.toFixed(2)}
                <span style={{ fontSize: 11, opacity: 0.8 }}>
                  ({priceTicker.changePct >= 0 ? '+' : ''}{priceTicker.changePct.toFixed(2)}%)
                </span>
              </span>
            </div>
            {/* 24h 高 */}
            <div className="ticker-cell">
              <span className="ticker-label">24h 高</span>
              <span className="ticker-hl" style={{ color: 'var(--gain)' }}>{priceTicker.high.toFixed(2)}</span>
            </div>
            {/* 24h 低 */}
            <div className="ticker-cell">
              <span className="ticker-label">24h 低</span>
              <span className="ticker-hl" style={{ color: 'var(--loss)' }}>{priceTicker.low.toFixed(2)}</span>
            </div>
            {/* 交易对选择 */}
            <div className="ticker-cell" style={{ justifyContent: 'center' }}>
              <Select
                value={klineSymbol}
                onChange={(val) => { setKlineSymbol(val); setPriceTicker(null); }}
                style={{ width: 110 }}
                options={[{ label: 'BTC-USDT', value: 'BTC-USDT' }, { label: 'ETH-USDT', value: 'ETH-USDT' }]}
                size="small"
              />
            </div>
          </div>
        )}

        {/* 主图表卡片 */}
        <div
          className="animate-in stagger-2"
          style={{
            background: chartColors.containerBg,
            border: `1px solid ${chartColors.containerBorder}`,
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
          }}
        >
          {/* 控制面板 */}
          <div className="market-control-panel">
            {/* 控制行：周期选择 + 信号 + 刷新 */}
            <div className="market-ctrl-row">
              <span className="market-ctrl-label">周期</span>
              {/* 自定义胶囊周期选择器 */}
              <div className="interval-pills">
                {[
                  { label: '1m', value: '1m' },
                  { label: '5m', value: '5m' },
                  { label: '15m', value: '15m' },
                  { label: '1H', value: '1H' },
                  { label: '1D', value: '1D' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    className={`interval-pill ${klineInterval === opt.value ? 'active' : ''}`}
                    onClick={() => { setKlineInterval(opt.value); setPriceTicker(null); }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div style={{ width: 1, height: 20, background: chartColors.divider, margin: '0 4px' }} />

              {/* 策略信号开关 */}
              <div className="market-signal-toggle">
                <span className="market-ctrl-label">策略信号</span>
                <Switch
                  size="small"
                  checked={marker.enabled}
                  onChange={(checked) => marker.setEnabled(checked)}
                  style={{ '--ant-color-primary': chartColors.accentColor } as React.CSSProperties}
                />
              </div>

              {/* 信号筛选 */}
              {marker.enabled && (
                <>
                  <div style={{ width: 1, height: 20, background: chartColors.divider }} />
                  <Select
                    mode="multiple"
                    size="small"
                    placeholder="选择策略"
                    style={{ minWidth: 140, maxWidth: 240 }}
                    value={marker.selectedStrategies}
                    onChange={(vals) => marker.setSelectedStrategies(vals as string[])}
                    options={marker.selectedStrategies.map(sid => ({ label: sid, value: sid }))}
                    maxTagCount={2}
                    allowClear
                  />
                  <Select
                    size="small"
                    value={marker.sideFilter}
                    onChange={(val) => marker.setSideFilter(val)}
                    style={{ width: 72 }}
                    options={[{ label: '全部', value: 'all' }, { label: '买入', value: 'buy' }, { label: '卖出', value: 'sell' }]}
                  />
                </>
              )}

              <div style={{ marginLeft: 'auto' }}>
                <Button
                  size="small"
                  onClick={loadKlineData}
                  loading={klineLoading}
                  icon={<ReloadOutlined />}
                  className="market-refresh-btn"
                >
                  刷新
                </Button>
              </div>
            </div>
          </div>

          {/* 迷你指标面板 */}
          <div className="mini-indicators">
            <div className="mini-indicator-card">
              <span className="mini-indicator-label">RSI (14)</span>
              <span className="mini-indicator-value" style={{
                color: miniIndicators.rsi === '—' ? 'var(--text-secondary)' :
                  parseInt(miniIndicators.rsi) > 70 ? 'var(--loss)' :
                  parseInt(miniIndicators.rsi) < 30 ? 'var(--gain)' : 'var(--text-primary)'
              }}>
                {miniIndicators.rsi}
              </span>
            </div>
            <div className="mini-indicator-card">
              <span className="mini-indicator-label">波动率</span>
              <span className="mini-indicator-value">{miniIndicators.volatility}</span>
            </div>
            <div className="mini-indicator-card">
              <span className="mini-indicator-label">趋势</span>
              <span className="mini-indicator-value" style={{
                color: miniIndicators.trend === '—' ? 'var(--text-secondary)' :
                  miniIndicators.trend.includes('上涨') ? 'var(--gain)' :
                  miniIndicators.trend.includes('下跌') ? 'var(--loss)' : 'var(--text-secondary)',
                fontSize: 12,
              }}>
                {miniIndicators.trend}
              </span>
            </div>
          </div>

          {/* 图表区域 */}
          <div
            ref={chartContainerRef}
            className="market-chart-wrap"
            style={{
              width: '100%',
              minHeight: 520,
              position: 'relative',
              backgroundImage: `
                linear-gradient(${chartColors.divider} 1px, transparent 1px),
                linear-gradient(90deg, ${chartColors.divider} 1px, transparent 1px)
              `,
              backgroundSize: '40px 40px',
              backgroundPosition: '-1px -1px',
            }}
          >
            {/* 加载骨架屏 */}
            {klineLoading && (
              <div className="market-skeleton">
                <div className="market-skeleton-inner">
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: chartColors.textSecondary }}>
                    加载K线数据...
                  </span>
                  <div className="skeleton-bar" />
                </div>
              </div>
            )}

            {/* 信号工具提示 */}
            {tooltipData.visible && tooltipData.signal && (
              <div ref={tooltipContainerRef} className="market-tooltip" style={{
                left: tooltipData.x + 12,
                top: tooltipData.y - 10,
              }}>
                <div style={{
                  fontWeight: 700,
                  marginBottom: 8,
                  color: tooltipData.signal.side === 'buy' ? 'var(--gain)' : 'var(--loss)',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 13,
                }}>
                  {tooltipData.signal.side === 'buy' ? '▲ 买入信号' : '▼ 卖出信号'}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                  <div><span style={{ color: chartColors.textSecondary }}>策略:</span> <span style={{ color: 'var(--text-primary)' }}>{tooltipData.signal.strategy_id}</span></div>
                  <div><span style={{ color: chartColors.textSecondary }}>价格:</span> <span style={{ color: 'var(--text-primary)' }}>{tooltipData.signal.price}</span></div>
                  <div><span style={{ color: chartColors.textSecondary }}>数量:</span> <span style={{ color: 'var(--text-primary)' }}>{tooltipData.signal.quantity}</span></div>
                  <div><span style={{ color: chartColors.textSecondary }}>时间:</span> <span style={{ color: 'var(--text-primary)' }}>{new Date(tooltipData.signal.timestamp).toLocaleString()}</span></div>
                </div>
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${chartColors.divider}`, fontSize: 11, color: chartColors.textSecondary, fontFamily: 'var(--font-sans)' }}>
                  {tooltipData.signal.reason}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
