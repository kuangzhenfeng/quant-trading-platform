import { useState, useCallback, useRef, useEffect } from 'react';
import { type SeriesMarker, type Time } from 'lightweight-charts';
import { strategyApi } from '../services/strategy';
import { monitorApi } from '../services/monitor';
import type { StrategySignal } from '../types/api';

export function useStrategyMarkers() {
  const [signals, setSignals] = useState<Record<string, StrategySignal[]>>({});
  const [selectedStrategies, setSelectedStrategies] = useState<string[]>([]);
  const [sideFilter, setSideFilter] = useState<'all' | 'buy' | 'sell'>('all');
  const [enabled, setEnabled] = useState(false);

  const pollingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // 用 ref 保存 symbol，避免闭包问题
  const klineSymbolRef = useRef<string>('');

  // 规范化参数：Proxy对象或任何值 → 字符串
  const toStr = (v: unknown): string => {
    if (typeof v === 'string') return v;
    if (v && typeof v === 'object' && 'current' in (v as any)) return String((v as any).current);
    return String(v ?? '');
  };

  // 规范化数组
  const toStrArr = (v: unknown): string[] => {
    if (Array.isArray(v)) return v.map(toStr);
    if (typeof v === 'object' && v !== null) {
      // 可能是 Proxy 包装的数组，尝试 Object.values
      return Object.values(v as Record<string, unknown>).map(toStr);
    }
    return [];
  };

  // 加载策略列表
  const loadStrategies = useCallback(async () => {
    try {
      const data = await monitorApi.getStrategies();
      if (data.strategies) {
        const ids = data.strategies.map((s: { id: string }) => s.id);
        setSelectedStrategies(ids);
      }
    } catch (e) {
      console.error('[useStrategyMarkers] 加载策略列表失败:', e);
    }
  }, []);

  // 加载信号历史
  const loadSignals = useCallback(
    async (symbol: string, strategyIds: string[]) => {
      const sym = toStr(symbol);
      const ids = toStrArr(strategyIds).filter(Boolean);
      if (!ids.length || !sym) return;
      try {
        const data = await strategyApi.getSignalsBySymbol(sym, ids);
        setSignals(data.signals || {});
      } catch (e) {
        console.error('[useStrategyMarkers] 加载信号失败:', e);
      }
    },
    []
  );

  // 轮询新信号
  const pollNewSignals = useCallback(
    async (symbol: string, strategyIds: string[]) => {
      const sym = toStr(symbol);
      const ids = toStrArr(strategyIds).filter(Boolean);
      if (!ids.length || !sym) return;
      try {
        const data = await strategyApi.getSignalsBySymbol(sym, ids);
        const newSignals = data.signals || {};
        setSignals(prev => {
          const merged = { ...prev };
          for (const [sid, sigs] of Object.entries(newSignals)) {
            const list = sigs as StrategySignal[];
            if (!merged[sid]) merged[sid] = [];
            const existingIds = new Set(merged[sid].map(s => s.id));
            for (const s of list) {
              if (!existingIds.has(s.id)) {
                merged[sid] = [s, ...merged[sid]];
              }
            }
          }
          return merged;
        });
      } catch (e) {
        console.error('[useStrategyMarkers] 轮询信号失败:', e);
      }
    },
    []
  );

  // 初始化
  const initialize = useCallback(
    async (symbol: string, strategyIds: string[]) => {
      const sym = toStr(symbol);
      const ids = toStrArr(strategyIds).filter(Boolean);
      klineSymbolRef.current = sym;
      await loadSignals(sym, ids);
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = setInterval(() => {
        pollNewSignals(sym, ids);
      }, 3000);
    },
    [loadSignals, pollNewSignals]
  );

  // 清理
  const cleanup = useCallback(() => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
  }, []);

  // 更新 symbol
  const updateKlineSymbol = useCallback((symbol: string) => {
    klineSymbolRef.current = toStr(symbol);
  }, []);

  // enabled 切换
  useEffect(() => {
    if (enabled) {
      loadStrategies();
    } else {
      cleanup();
      setSignals({});
    }
  }, [enabled, loadStrategies, cleanup]);

  // 转换为 lightweight-charts markers
  const getMarkers = useCallback(
    (upColor: string, downColor: string): SeriesMarker<Time>[] => {
      const markers: SeriesMarker<Time>[] = [];
      const ids = toStrArr(selectedStrategies).filter(Boolean);
      for (const sid of ids) {
        const raw = signals[sid];
        const list = Array.isArray(raw) ? raw : [];
        for (const s of list) {
          if (sideFilter !== 'all' && s.side !== sideFilter) continue;
          if (s.status === 'failed') continue;
          const ts = new Date(s.timestamp).getTime() / 1000;
          markers.push({
            time: ts as any,
            position: s.side === 'buy' ? 'aboveBar' : 'belowBar',
            color: s.side === 'buy' ? upColor : downColor,
            shape: s.side === 'buy' ? 'arrowUp' : 'arrowDown',
            text: s.side === 'buy' ? '▲' : '▼',
            id: `sig-${s.id}`,
          });
        }
      }
      return markers;
    },
    [signals, selectedStrategies, sideFilter]
  );

  return {
    enabled,
    setEnabled,
    selectedStrategies,
    setSelectedStrategies,
    sideFilter,
    setSideFilter,
    signals,
    initialize,
    cleanup,
    getMarkers,
    updateKlineSymbol,
  };
}
