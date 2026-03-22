import { useEffect, useState, useCallback } from 'react';
import { Descriptions, Tag, message } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { api } from '../services/api';

interface SystemInfo {
  app_name: string;
  version: string;
}

const brokers = [
  { name: 'OKX', desc: '虚拟货币交易' },
  { name: '国金证券', desc: 'A股交易' },
  { name: 'moomoo', desc: '美股/港股交易' },
];

export default function About() {
  const [info, setInfo] = useState<SystemInfo | null>(null);

  const fetchInfo = useCallback(async () => {
    try {
      const data = await api.get('/system/info');
      setInfo(data);
    } catch {
      message.error('加载系统信息失败');
    }
  }, []);

  useEffect(() => {
    fetchInfo();
  }, [fetchInfo]);

  return (
    <div style={{ padding: '32px 32px 48px', minHeight: '100vh', background: 'var(--bg-base)' }}>
      <div className="page-header animate-in stagger-1">
        <div>
          <h1 className="page-title">About</h1>
          <p className="page-subtitle">关于 QuantApex</p>
        </div>
      </div>

      <div className="animate-in stagger-2" style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-subtle)',
        }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 'var(--radius-sm)',
            background: 'color-mix(in srgb, var(--cyan-400) 12%, transparent)',
            border: '1px solid color-mix(in srgb, var(--cyan-400) 25%, transparent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--cyan-400)',
            fontSize: 14,
          }}>
            <InfoCircleOutlined />
          </div>
          <div style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}>
            系统信息
          </div>
        </div>

        <Descriptions
          column={1}
          style={{ padding: '24px' }}
          labelStyle={{ color: 'var(--text-muted)', fontFamily: 'var(--font-sans)', fontSize: 13, width: 140 }}
          contentStyle={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: 13 }}
        >
          <Descriptions.Item label="应用名称">{info?.app_name || '-'}</Descriptions.Item>
          <Descriptions.Item label="版本">{info?.version || '-'}</Descriptions.Item>
        </Descriptions>

        <div style={{ padding: '0 24px 24px' }}>
          <div style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 12,
            color: 'var(--text-muted)',
            marginBottom: 10,
          }}>
            支持的券商平台
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {brokers.map((b) => (
              <Tag
                key={b.name}
                style={{
                  borderRadius: 6,
                  fontFamily: 'var(--font-sans)',
                  fontSize: 13,
                  padding: '4px 12px',
                  borderColor: 'var(--border-default)',
                  color: 'var(--text-primary)',
                  background: 'var(--bg-raised)',
                }}
              >
                {b.name} — {b.desc}
              </Tag>
            ))}
          </div>
        </div>
      </div>

      <div className="animate-in stagger-3" style={{
        marginTop: 16,
        textAlign: 'center',
        fontFamily: 'var(--font-sans)',
        fontSize: 12,
        color: 'var(--text-muted)',
      }}>
        Copyright © 2026 QuantApex. All rights reserved.
      </div>
    </div>
  );
}
