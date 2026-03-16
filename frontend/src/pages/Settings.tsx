import { useState, useEffect } from 'react';
import { Form, Button, message, Modal } from 'antd';
import { SettingOutlined, ExclamationCircleOutlined, DeleteOutlined } from '@ant-design/icons';
import { api } from '../services/api';

interface ConfigItem {
  key: string;
  value: string | null;
  category: string;
  is_sensitive: boolean;
}

export default function Settings() {
  const [form] = Form.useForm();

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const data = await api.get('/system/config');
      const values: Record<string, string> = {};
      data.configs.forEach((c: ConfigItem) => {
        values[c.key] = c.value || '';
      });
      form.setFieldsValue(values);
    } catch (error) {
      message.error('加载配置失败');
    }
  };

  const handleReset = () => {
    Modal.confirm({
      title: '确认重置系统',
      icon: <ExclamationCircleOutlined />,
      content: '此操作将删除所有用户数据，系统将恢复到初始状态。此操作不可撤销！',
      okText: '确认重置',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await api.post('/system/reset', {});
          message.success('系统已重置');
          setTimeout(() => window.location.href = '/setup', 1000);
        } catch (error) {
          message.error('重置失败');
        }
      }
    });
  };

  return (
    <div style={{ padding: '32px 32px 48px', minHeight: '100vh', background: 'var(--bg-base)' }}>
      <div className="page-header animate-in stagger-1">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">系统配置管理</p>
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
            <SettingOutlined />
          </div>
          <div style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}>
            系统配置
          </div>
        </div>

        <div style={{ padding: 24 }}>
          <h3 style={{ marginBottom: 8, color: 'var(--text-primary)' }}>危险操作</h3>
          <p style={{ marginBottom: 16, color: 'var(--text-muted)', fontSize: 14 }}>
            以下操作将对系统造成不可逆的影响，请谨慎操作
          </p>
          <Button danger icon={<DeleteOutlined />} onClick={handleReset}>
            重置系统
          </Button>
        </div>
      </div>
    </div>
  );
}
