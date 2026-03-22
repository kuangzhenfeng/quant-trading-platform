import { useEffect, useCallback } from 'react';
import { Form, Button, message, Modal } from 'antd';
import { SettingOutlined, ExclamationCircleOutlined, DeleteOutlined } from '@ant-design/icons';
import request from '../services/request';

interface ConfigItem {
  key: string;
  value: string | null;
  category: string;
  is_sensitive: boolean;
}

export default function Settings() {
  const [form] = Form.useForm();

  const fetchConfig = useCallback(async () => {
    try {
      const res = await request.get('/system/config');
      const values: Record<string, string> = {};
      res.data.configs.forEach((c: ConfigItem) => {
        values[c.key] = c.value || '';
      });
      form.setFieldsValue(values);
    } catch {
      message.error('加载配置失败');
    }
  }, [form]);

  useEffect(() => {
    void fetchConfig();
  }, [fetchConfig]);

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
          await request.post('/system/reset', {});
          message.success('系统已重置');
          setTimeout(() => window.location.href = '/setup', 1000);
        } catch {
          message.error('重置失败');
        }
      }
    });
  };

  return (
    <>
      <style>{`
        .settings-card {
          position: relative;
        }
        .settings-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--cyan-400) 30%, transparent), transparent);
          pointer-events: none;
        }
        [data-theme="light"] .settings-card::before {
          background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--cyan-400) 20%, transparent), transparent);
        }
        .danger-card {
          border: 1px solid var(--border-subtle) !important;
          background: var(--bg-surface) !important;
        }
        [data-theme="light"] .danger-card {
          background: var(--bg-elevated) !important;
        }
        .settings-reset-btn {
          font-family: var(--font-sans) !important;
          font-weight: 600 !important;
          font-size: 13px !important;
          color: var(--bg-base) !important;
          background: var(--loss) !important;
          border: none !important;
          border-radius: var(--radius-sm) !important;
          height: 34px !important;
          padding-inline: 16px !important;
          letter-spacing: 0.3px !important;
          box-shadow: 0 0 12px rgba(248, 113, 113, 0.25) !important;
          cursor: pointer !important;
          transition: all 0.2s ease !important;
        }
        .settings-reset-btn:hover {
          box-shadow: 0 0 18px rgba(248, 113, 113, 0.4) !important;
          opacity: 0.9 !important;
        }
        [data-theme="light"] .settings-reset-btn {
          background: #991b1b !important;
          box-shadow: 0 0 12px rgba(153, 27, 27, 0.2) !important;
        }
        [data-theme="light"] .settings-reset-btn:hover {
          box-shadow: 0 0 18px rgba(153, 27, 27, 0.35) !important;
        }
      `}</style>

      <div className="page-content" style={{ padding: '32px 32px 48px', minHeight: '100vh', background: 'var(--bg-base)' }}>
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
              <SettingOutlined />
            </div>
            <div>
              <h1 className="page-title">Settings</h1>
              <p className="page-subtitle">系统配置管理</p>
            </div>
          </div>
        </div>

        {/* Main Card */}
        <div className="settings-card animate-in stagger-2" style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          marginBottom: 16,
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
            {/* Danger Zone Card */}
            <div className="danger-card" style={{
              borderRadius: 'var(--radius-md)',
              padding: '20px 24px',
              marginBottom: 16,
            }}>
              <h3 style={{
                marginBottom: 4,
                color: 'var(--loss)',
                fontFamily: 'var(--font-sans)',
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: '0.3px',
              }}>
                危险操作
              </h3>
              <p style={{
                marginBottom: 16,
                color: 'var(--text-muted)',
                fontSize: 13,
                fontFamily: 'var(--font-sans)',
                lineHeight: 1.5,
              }}>
                以下操作将对系统造成不可逆的影响，请谨慎操作
              </p>
              <Button
                danger
                className="settings-reset-btn"
                icon={<DeleteOutlined />}
                onClick={handleReset}
              >
                重置系统
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
