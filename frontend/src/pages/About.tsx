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
    void fetchInfo();
  }, [fetchInfo]);

  return (
    <>
      <style>{`
        .about-card {
          position: relative;
        }
        .about-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--cyan-400) 30%, transparent), transparent);
          pointer-events: none;
        }
        [data-theme="light"] .about-card::before {
          background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--cyan-400) 20%, transparent), transparent);
        }
        .about-broker-tag {
          border-radius: 6px !important;
          font-family: var(--font-sans) !important;
          font-size: 13px !important;
          padding: 4px 12px !important;
          border-color: var(--border-default) !important;
          color: var(--text-primary) !important;
          background: var(--bg-elevated) !important;
        }
        [data-theme="light"] .about-broker-tag {
          background: #ffffff !important;
          border-color: #e2e8f0 !important;
        }
      `}</style>

      <div style={{ padding: '32px 32px 48px', minHeight: '100vh', background: 'var(--bg-base)' }}>
        {/* Page Header */}
        <div className="page-header animate-in stagger-1">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 'var(--radius-sm)',
              background: 'color-mix(in srgb, var(--cyan-400) 10%, transparent)',
              border: '1px solid color-mix(in srgb, var(--cyan-400) 25%, transparent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--cyan-400)',
              fontSize: 14,
            }}>
              <InfoCircleOutlined />
            </div>
            <div>
              <h1 className="page-title">About</h1>
              <p className="page-subtitle">关于 QuantApex</p>
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="about-card animate-in stagger-2" style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
        }}>
          {/* Card Header */}
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
                  className="about-broker-tag"
                >
                  {b.name} — {b.desc}
                </Tag>
              ))}
            </div>
          </div>
        </div>

        {/* Copyright */}
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
    </>
  );
}
