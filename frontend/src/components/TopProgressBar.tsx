import { useEffect, useRef, useState } from 'react';
import { useTradingModeStore } from '../stores/tradingModeStore';

/** 各模式对应的进度条颜色 */
const modeColor: Record<string, string> = {
  live: '#f87171',   // 红 — 实盘
  paper: '#fbbf24',  // 黄 — 模拟盘
  mock: '#34d399',   // 绿 — MOCK
};

/**
 * 顶部进度条：切换交易模式时显示。
 * - 挂载在 header 底部边缘，高度 3px
 * - 颜色跟随目标模式（而非当前模式）
 * - 分两段：快速冲到 85%（API 响应前），API 完成后瞬跳 100% 再淡出
 */
export default function TopProgressBar() {
  const { switchingTo } = useTradingModeStore();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const [color, setColor] = useState('#22d3ee');
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (switchingTo) {
      // 开始切换：重置并显示
      setColor(modeColor[switchingTo] ?? '#22d3ee');
      setProgress(0);
      setVisible(true);

      // 用 rAF 模拟进度，快速推进到 85%，之后放慢
      let current = 0;
      const step = () => {
        current += current < 50 ? 4 : current < 75 ? 1.5 : 0.4;
        if (current >= 85) {
          setProgress(85);
          return; // 停在 85% 等 API 完成
        }
        setProgress(current);
        rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
    } else {
      // switchingTo 变为 null：API 完成，推进到 100% 然后淡出
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      setProgress(100);
      timerRef.current = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 400); // 400ms 后淡出
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [switchingTo]);

  if (!visible && progress === 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 3,
        background: 'transparent',
        zIndex: 200,
        overflow: 'hidden',
      }}
    >
      {/* 进度填充 */}
      <div
        style={{
          height: '100%',
          width: `${progress}%`,
          background: `linear-gradient(90deg, ${color}99, ${color})`,
          boxShadow: `0 0 10px ${color}cc, 0 0 4px ${color}`,
          borderRadius: '0 2px 2px 0',
          transition: progress === 100
            ? 'width 0.15s ease-out, opacity 0.3s ease'
            : 'width 0.08s linear',
          opacity: visible ? 1 : 0,
        }}
      />
      {/* 右端光晕点 */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: `${progress}%`,
          transform: 'translate(-50%, -50%)',
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: color,
          boxShadow: `0 0 8px 2px ${color}`,
          opacity: visible && progress < 100 ? 1 : 0,
          transition: 'opacity 0.2s ease',
        }}
      />
    </div>
  );
}
