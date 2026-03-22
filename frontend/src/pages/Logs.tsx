import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Table, Select, Tag, Input } from 'antd';
import { FileTextOutlined, SearchOutlined, FilterOutlined } from '@ant-design/icons';
import { logsApi } from '../services/logs';
import type { LogsResponse, LogEntry } from '../types/api';

export default function Logs() {
  const [allLogs, setAllLogs] = useState<LogEntry[]>([]);
  const [level, setLevel] = useState<string | undefined>();
  const [source, setSource] = useState<string | undefined>();
  const [searchText, setSearchText] = useState('');

  // 可选的来源列表（从已加载日志中提取唯一值）
  const sourceOptions = useMemo(() => {
    const sources = [...new Set(allLogs.map((l) => l.source))].sort();
    return sources.map((s) => ({ value: s, label: s }));
  }, [allLogs]);

  const fetchLogs = useCallback(async () => {
    // 不带 source 过滤，获取全量用于提取来源选项
    // 后端 LogLevel 枚举是大写 (ERROR/WARNING/INFO)，需转换
    const params = new URLSearchParams({ limit: '500' });
    if (level) params.set('level', level.toUpperCase());
    const data = await logsApi.getLogsRaw(params) as LogsResponse;
    setAllLogs(data.logs);
  }, [level]);

  useEffect(() => {
    void fetchLogs();
    const timer = setInterval(fetchLogs, 5000);
    return () => clearInterval(timer);
  }, [fetchLogs]);

  // 根据搜索文本和来源过滤
  const logs = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return allLogs.filter((l) => {
      if (q && !l.message.toLowerCase().includes(q)) return false;
      if (source && l.source !== source) return false;
      return true;
    });
  }, [allLogs, searchText, source]);

  const getLogTagStyle = (l: string): { color: string; bg: string } => {
    if (l === 'error') {
      return { color: 'var(--loss)', bg: 'rgba(248, 113, 113, 0.12)' };
    } else if (l === 'warning') {
      return { color: 'var(--amber-400)', bg: 'rgba(251, 191, 36, 0.12)' };
    }
    return { color: 'var(--cyan-400)', bg: 'rgba(34, 211, 238, 0.12)' };
  };

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
        const { color, bg } = getLogTagStyle(l);
        return (
          <Tag
            className={`log-tag log-tag-${l}`}
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
    <>
      <style>{`
        .logs-card {
          position: relative;
        }
        .logs-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--cyan-400) 30%, transparent), transparent);
          pointer-events: none;
        }
        [data-theme="light"] .logs-card::before {
          background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--cyan-400) 20%, transparent), transparent);
        }
        .logs-table .ant-table-thead > tr > th {
          background: rgba(34, 211, 238, 0.04) !important;
          border-bottom: 1px solid var(--border-subtle) !important;
        }
        [data-theme="light"] .logs-table .ant-table-thead > tr > th {
          background: rgba(245, 158, 11, 0.04) !important;
        }
        .logs-table .ant-table-tbody > tr:hover > td {
          background: rgba(34, 211, 238, 0.03) !important;
        }
        [data-theme="light"] .logs-table .ant-table-tbody > tr:hover > td {
          background: rgba(245, 158, 11, 0.03) !important;
        }
        .logs-table .ant-table-tbody > tr:nth-child(even) > td {
          background: transparent;
        }
        [data-theme="light"] .logs-table .ant-table-tbody > tr:nth-child(even) > td {
          background: rgba(0, 0, 0, 0.015);
        }
        [data-theme="light"] .logs-table .ant-table-tbody > tr:nth-child(even):hover > td {
          background: rgba(245, 158, 11, 0.03) !important;
        }
        /* Light mode log level tag overrides — deeper colors for contrast */
        [data-theme="light"] .log-tag-error {
          color: #991b1b !important;
          background: rgba(153, 27, 27, 0.1) !important;
        }
        [data-theme="light"] .log-tag-warning {
          color: #92400e !important;
          background: rgba(146, 64, 14, 0.1) !important;
        }
        [data-theme="light"] .log-tag-info {
          color: #b45309 !important;
          background: rgba(180, 83, 9, 0.1) !important;
        }
      `}</style>

      <div className="page-content animate-in" style={{ padding: '32px 32px 48px', minHeight: '100vh', background: 'var(--bg-base)' }}>
        {/* Page Header */}
        <div className="page-header stagger-1" style={{ marginBottom: 24 }}>
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
              <FileTextOutlined />
            </div>
            <div>
              <h1 className="page-title">Logs</h1>
              <p className="page-subtitle">系统运行日志</p>
            </div>
          </div>
        </div>

        <div className="stagger-2">
          <Card
            className="logs-card"
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
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
                  <FileTextOutlined />
                </div>
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

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {/* 搜索框 */}
                <Input
                  prefix={<SearchOutlined style={{ color: 'var(--text-muted)', fontSize: 12 }} />}
                  placeholder="搜索消息内容..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  allowClear
                  style={{ width: 200 }}
                  styles={{
                    root: {
                      background: 'var(--bg-elevated)',
                      borderColor: 'var(--border-default)',
                    },
                  }}
                />

                {/* 来源过滤 */}
                <Select
                  style={{ width: 160 }}
                  placeholder={
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <FilterOutlined style={{ fontSize: 11 }} />
                      全部来源
                    </span>
                  }
                  allowClear
                  value={source}
                  onChange={setSource}
                  options={sourceOptions}
                  styles={{
                    popup: {
                      root: {
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-default)',
                        borderRadius: 'var(--radius-sm)',
                      },
                    },
                  }}
                />

                {/* 级别过滤 */}
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
            </div>

            {/* Table */}
            <Table
              className="logs-table"
              dataSource={logs}
              columns={columns}
              rowKey={(r) => r.timestamp}
              pagination={{ pageSize: 20, size: 'small' }}
              style={{ background: 'transparent' }}
              footer={() => (
                <div style={{ padding: '8px 16px', color: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                  共 {logs.length} 条日志
                  {(searchText || source || level) && (
                    <span style={{ marginLeft: 8 }}>
                      （筛选自 {allLogs.length} 条）
                    </span>
                  )}
                </div>
              )}
            />
          </Card>
        </div>
      </div>
    </>
  );
}
