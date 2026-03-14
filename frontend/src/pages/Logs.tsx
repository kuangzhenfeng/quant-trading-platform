import { useState, useEffect, useCallback } from 'react';
import { Card, Table, Select, Tag } from 'antd';
import { logsApi } from '../services/logs';
import type { LogsResponse, LogEntry } from '../types/api';

export default function Logs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [level, setLevel] = useState<string | undefined>();

  const fetchLogs = useCallback(async () => {
    const data = await logsApi.getLogs(level) as LogsResponse;
    setLogs(data.logs);
  }, [level]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchLogs();
    const timer = setInterval(fetchLogs, 5000);
    return () => clearInterval(timer);
  }, [fetchLogs]);

  const columns = [
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (t: string) => new Date(t).toLocaleString()
    },
    {
      title: '级别',
      dataIndex: 'level',
      key: 'level',
      render: (l: string) => {
        const color = l === 'error' ? 'red' : l === 'warning' ? 'orange' : 'blue';
        return <Tag color={color}>{l.toUpperCase()}</Tag>;
      }
    },
    { title: '来源', dataIndex: 'source', key: 'source' },
    { title: '消息', dataIndex: 'message', key: 'message' }
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card
        title="系统日志"
        extra={
          <Select
            style={{ width: 120 }}
            placeholder="全部级别"
            allowClear
            onChange={setLevel}
          >
            <Select.Option value="info">INFO</Select.Option>
            <Select.Option value="warning">WARNING</Select.Option>
            <Select.Option value="error">ERROR</Select.Option>
          </Select>
        }
      >
        <Table dataSource={logs} columns={columns} rowKey={(r) => r.timestamp} />
      </Card>
    </div>
  );
}
