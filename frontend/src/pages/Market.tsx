import { useState, useEffect, useRef } from 'react';
import { Button, Tabs, Select, Switch } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { createChart, type IChartApi, type ISeriesApi, type CandlestickData, type Time, CandlestickSeries, createSeriesMarkers, type ISeriesMarkersPluginApi } from 'lightweight-charts';
import { useBrokerStore } from '../stores/brokerStore';
import { marketApi } from '../services/market';
import { useStrategyMarkers } from '../hooks/useStrategyMarkers';
import type { StrategySignal } from '../types/api';

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

  const marker = useStrategyMarkers();
  const signalsRef = useRef<Record<string, StrategySignal[]>>({});
  const enabledRef = useRef(false);
  const chartReadyRef = useRef(false);
  const isMountedRef = useRef(true);
  // 追踪当前 async 操作的 ID，用于处理 StrictMode 双调用
  const activeLoadIdRef = useRef(0);
  // 用于取消 pending 的 API 请求（StrictMode cleanup 时）
  const abortControllerRef = useRef<AbortController | null>(null);
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
        const candleData: CandlestickData<Time>[] = data.klines.map(k => ({
          time: (new Date(k.time).getTime() / 1000) as Time,
          open: k.open, high: k.high, low: k.low, close: k.close,
        }));
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
    <div>
      <div className="page-header">
        <h1 className="page-title">Market</h1>
        <p className="page-subtitle">K线图表</p>
      </div>

      <div className="animate-in" style={{ background: chartColors.containerBg, border: `1px solid ${chartColors.containerBorder}`, borderRadius: 8, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, paddingBottom: 16, borderBottom: `1px solid ${chartColors.gridColor}`, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: chartColors.textSecondary, fontWeight: 600 }}>交易对:</span>
          <div className="hide-mobile">
            <Tabs size="small" activeKey={klineSymbol} onChange={(key) => setKlineSymbol(key)} items={[{ key: 'BTC-USDT', label: 'BTC-USDT' }, { key: 'ETH-USDT', label: 'ETH-USDT' }]} style={{ minWidth: 200 }} />
          </div>
          <Select value={klineSymbol} onChange={setKlineSymbol} className="show-mobile-only" style={{ width: 120 }} options={[{ label: 'BTC-USDT', value: 'BTC-USDT' }, { label: 'ETH-USDT', value: 'ETH-USDT' }]} />

          <span style={{ fontSize: 12, color: chartColors.textSecondary, fontWeight: 600, marginLeft: 8 }}>周期:</span>
          <div className="hide-mobile">
            <Tabs size="small" activeKey={klineInterval} onChange={(key) => setKlineInterval(key)} items={[{ key: '1m', label: '1分钟' }, { key: '5m', label: '5分钟' }, { key: '15m', label: '15分钟' }, { key: '1H', label: '1小时' }, { key: '1D', label: '1天' }]} style={{ minWidth: 300 }} />
          </div>
          <Select value={klineInterval} onChange={setKlineInterval} className="show-mobile-only" style={{ width: 100 }} options={[{ label: '1分钟', value: '1m' }, { label: '5分钟', value: '5m' }, { label: '15分钟', value: '15m' }, { label: '1小时', value: '1H' }, { label: '1天', value: '1D' }]} />

          <Button size="small" onClick={loadKlineData} loading={klineLoading} icon={<ReloadOutlined />}>刷新</Button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 16, paddingLeft: 16, borderLeft: `1px solid ${chartColors.gridColor}`, flexShrink: 0 }}>
            <span style={{ fontSize: 12, color: chartColors.textSecondary, fontWeight: 600 }}>信号:</span>
            <Switch size="small" checked={marker.enabled} onChange={(checked) => marker.setEnabled(checked)} />
            {marker.enabled && (
              <>
                <Select mode="multiple" size="small" placeholder="选择策略" style={{ minWidth: 160, maxWidth: 280 }} value={marker.selectedStrategies} onChange={(vals) => marker.setSelectedStrategies(vals as string[])} options={marker.selectedStrategies.map(sid => ({ label: sid, value: sid }))} maxTagCount={2} allowClear />
                <Select size="small" value={marker.sideFilter} onChange={(val) => marker.setSideFilter(val)} style={{ width: 80 }} options={[{ label: '全部', value: 'all' }, { label: '买入', value: 'buy' }, { label: '卖出', value: 'sell' }]} />
              </>
            )}
          </div>
        </div>

        <div ref={chartContainerRef} style={{ width: '100%', minHeight: 500, position: 'relative' }}>
          {tooltipData.visible && tooltipData.signal && (
            <div ref={tooltipContainerRef} style={{ position: 'absolute', left: tooltipData.x + 12, top: tooltipData.y - 10, zIndex: 100, background: chartColors.containerBg, border: `1px solid ${chartColors.containerBorder}`, borderRadius: 8, padding: '8px 12px', fontSize: 12, color: chartColors.textColor, pointerEvents: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', minWidth: 200 }}>
              <div style={{ fontWeight: 600, marginBottom: 6, color: tooltipData.signal.side === 'buy' ? chartColors.upColor : chartColors.downColor }}>
                {tooltipData.signal.side === 'buy' ? '▲ 买入信号' : '▼ 卖出信号'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div><span style={{ color: chartColors.textSecondary }}>策略:</span> {tooltipData.signal.strategy_id}</div>
                <div><span style={{ color: chartColors.textSecondary }}>价格:</span> {tooltipData.signal.price}</div>
                <div><span style={{ color: chartColors.textSecondary }}>数量:</span> {tooltipData.signal.quantity}</div>
                <div><span style={{ color: chartColors.textSecondary }}>时间:</span> {new Date(tooltipData.signal.timestamp).toLocaleString()}</div>
                <div style={{ color: chartColors.textSecondary, fontSize: 11, marginTop: 2 }}>{tooltipData.signal.reason}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
