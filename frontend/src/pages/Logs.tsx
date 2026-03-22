import { useState, useEffect, useCallback } from 'react';
import { Card, Table, Select, Tag } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';
import { logsApi } from '../services/logs';
import type { LogsResponse, LogEntry } from '../types/api';

export default function Logs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [level, setLevel] = useState<string | undefined>();

  const fetchLogs = useCallback(async () => {
    const data = await logsApi.getLogs({ level }) as LogsResponse;
    setLogs(data.logs);
  }, [level]);

  useEffect(() => {
    void fetchLogs();
    const timer = setInterval(fetchLogs, 5000);
    return () => clearInterval(timer);
  }, [fetchLogs]);

  const columns = [
    {
      title: (
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: 'var(--text-tertiary)' }}>
          时间
        </span>
      ),
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180,
      render: (t: string) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>
          {new Date(t).toLocaleString()}
        </span>
      ),
    },
    {
      title: (
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: 'var(--text-tertiary)' }}>
          级别
        </span>
      ),
      dataIndex: 'level',
      key: 'level',
      width: 100,
      render: (l: string) => {
        let color: string;
        let bg: string;

        if (l === 'error') {
          color = 'var(--loss)';
          bg = 'rgba(248, 113, 113, 0.12)';
        } else if (l === 'warning') {
          color = 'var(--amber-400)';
          bg = 'rgba(251, 191, 36, 0.12)';
        } else {
          color = 'var(--cyan-400)';
          bg = 'rgba(34, 211, 238, 0.12)';
        }

        return (
          <Tag
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 600,
              border: 'none',
              padding: '2px 8px',
              color,
              backgroundColor: bg,
              borderRadius: 'var(--radius-sm)',
            }}
          >
            {l.toUpperCase()}
          </Tag>
        );
      },
    },
    {
      title: (
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: 'var(--text-tertiary)' }}>
          来源
        </span>
      ),
      dataIndex: 'source',
      key: 'source',
      width: 160,
      render: (s: string) => (
        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 13 }}>
          {s}
        </span>
      ),
    },
    {
      title: (
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: 'var(--text-tertiary)' }}>
          消息
        </span>
      ),
      dataIndex: 'message',
      key: 'message',
      render: (m: string) => (
        <span style={{ color: 'var(--text-primary)', fontSize: 13 }}>
          {m}
        </span>
      ),
    },
  ];

  return (
    <div className="animate-in">
      <div className="page-header stagger-1">
        <h1 className="page-title">Logs</h1>
        <p className="page-subtitle">系统运行日志</p>
      </div>

      <div className="stagger-2" style={{ marginTop: 24 }}>
        <Card
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
          }}
          styles={{ body: { padding: 0 } }}
        >
          {/* Custom card header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <FileTextOutlined
                style={{ color: 'var(--cyan-400)', fontSize: 16 }}
              />
              <span
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  letterSpacing: '0.01em',
                }}
              >
                运行日志
              </span>
            </div>

            <Select
              style={{ width: 140 }}
              placeholder="全部级别"
              allowClear
              onChange={setLevel}
              styles={{
                popup: {
                  root: {
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-sm)',
                  },
                },
              }}
            >
              <Select.Option value="info">
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--cyan-400)' }}>INFO</span>
              </Select.Option>
              <Select.Option value="warning">
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--amber-400)' }}>WARNING</span>
              </Select.Option>
              <Select.Option value="error">
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--loss)' }}>ERROR</span>
              </Select.Option>
            </Select>
          </div>

          {/* Table */}
          <Table
            dataSource={logs}
            columns={columns}
            rowKey={(r) => r.timestamp}
            pagination={{ pageSize: 20, size: 'small' }}
            style={{ background: 'transparent' }}
          />
        </Card>
      </div>
    </div>
  );
}
