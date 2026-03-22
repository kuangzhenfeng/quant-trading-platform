import { useState, useEffect, useCallback } from 'react';
import { Form, Input, Button, message, Steps, Select, Tabs } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { accountApi } from '../services/account';
import { systemApi } from '../services/system';

export default function Setup() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const checkInitStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/system/init-status');
      const data = await res.json();
      if (data.has_admin) {
        navigate('/login');
      }
    } catch {
      console.error('检查初始化状态失败');
    }
  }, [navigate]);

  useEffect(() => {
    checkInitStatus();
  }, [checkInitStatus]);

  const handleCreateAdmin = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      });
      if (!res.ok) throw new Error();

      await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      });
      message.success('管理员账户创建成功');
      setStep(1);
    } catch {
      message.error('创建失败');
    } finally {
      setLoading(false);
    }
  };

  const handleConfigBroker = async (values: Record<string, unknown>) => {
    setLoading(true);
    try {
      const accounts: Array<{ broker: string; name: string; config: Record<string, unknown> }> = [];

      // OKX 账户
      if (values.OKX_PAPER_API_KEY) {
        const isPaper = values.TRADING_MODE === 'paper';
        accounts.push({
          broker: 'okx',
          name: isPaper ? 'OKX模拟盘' : 'OKX实盘',
          config: {
            api_key: values.OKX_PAPER_API_KEY,
            secret_key: values.OKX_PAPER_SECRET_KEY,
            passphrase: values.OKX_PAPER_PASSPHRASE,
            is_paper: String(isPaper)
          }
        });
      }

      // Moomoo 账户
      if (values.MOOMOO_PAPER_HOST) {
        accounts.push({
          broker: 'moomoo',
          name: '富途证券',
          config: {
            host: values.MOOMOO_PAPER_HOST,
            port: values.MOOMOO_PAPER_PORT || 11111,
            unlock_password: ''
          }
        });
      }

      // 国金证券账户
      if (values.GUOJIN_LIVE_ACCOUNT_ID) {
        accounts.push({
          broker: 'guojin',
          name: '国金证券',
          config: {
            account_id: values.GUOJIN_LIVE_ACCOUNT_ID,
            password: values.GUOJIN_LIVE_PASSWORD,
            trading_password: ''
          }
        });
      }

      // 保存交易模式
      await systemApi.updateConfig([{
        key: 'TRADING_MODE',
        value: (values.TRADING_MODE as string) || 'mock',
        category: 'trading_mode',
        is_sensitive: false
      }]);

      // 保存券商账户
      if (accounts.length > 0) {
        for (const account of accounts) {
          await accountApi.add({
            id: `${account.broker}_setup_${Date.now()}`,
            ...account,
            active: true
          });
        }
      }

      message.success('配置保存成功');
      navigate('/login');
    } catch (error) {
      message.error('保存配置失败');
      console.error('保存配置失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    message.info('已跳过券商配置，可稍后在设置中配置');
    navigate('/login');
  };

  return (
    <>
      <style>{`
        .setup-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-base);
          position: relative;
          overflow: hidden;
        }

        /* 全屏暗色环境光渐变 */
        .setup-page::before {
          content: '';
          position: fixed;
          inset: 0;
          background:
            radial-gradient(ellipse at 85% 15%, rgba(34, 211, 238, 0.07) 0%, transparent 55%),
            radial-gradient(ellipse at 15% 85%, rgba(251, 191, 36, 0.05) 0%, transparent 50%);
          pointer-events: none;
          z-index: 0;
        }

        /* 亮色主题环境光 */
        [data-theme="light"] .setup-page::before {
          background:
            radial-gradient(ellipse at 85% 15%, rgba(245, 158, 11, 0.09) 0%, transparent 55%),
            radial-gradient(ellipse at 15% 85%, rgba(251, 191, 36, 0.04) 0%, transparent 50%);
        }

        /* 玻璃态卡片 */
        .setup-glass {
          position: relative;
          z-index: 1;
          width: 520px;
          max-height: 90vh;
          overflow-y: auto;
          padding: 44px 40px;
          background: rgba(22, 24, 31, 0.82);
          border: 1px solid rgba(34, 211, 238, 0.18);
          border-radius: 16px;
          backdrop-filter: blur(20px) saturate(160%);
          -webkit-backdrop-filter: blur(20px) saturate(160%);
          box-shadow:
            0 0 0 1px rgba(34, 211, 238, 0.04),
            0 24px 48px rgba(0, 0, 0, 0.4),
            0 0 60px rgba(34, 211, 238, 0.04);
          animation: setupCardIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.15s both;
        }

        /* 亮色主题玻璃态卡片 */
        [data-theme="light"] .setup-glass {
          background: rgba(255, 255, 255, 0.88);
          border: 1px solid rgba(245, 158, 11, 0.22);
          box-shadow:
            0 0 0 1px rgba(245, 158, 11, 0.05),
            0 24px 48px rgba(30, 41, 59, 0.1),
            0 0 60px rgba(245, 158, 11, 0.04);
        }

        /* 卡片左上角装饰光晕 */
        .setup-glass::before {
          content: '';
          position: absolute;
          top: -40px;
          left: -30px;
          width: 180px;
          height: 180px;
          background: radial-gradient(circle, rgba(34, 211, 238, 0.08) 0%, transparent 70%);
          pointer-events: none;
          border-radius: 50%;
        }

        [data-theme="light"] .setup-glass::before {
          background: radial-gradient(circle, rgba(245, 158, 11, 0.07) 0%, transparent 70%);
        }

        /* 标题 */
        .setup-title {
          font-family: var(--font-sans);
          font-size: 24px;
          font-weight: 800;
          color: var(--text-primary);
          text-align: center;
          margin-bottom: 6px;
          letter-spacing: -0.03em;
        }

        .setup-subtitle {
          font-family: var(--font-sans);
          font-size: 13px;
          color: var(--text-muted);
          text-align: center;
          margin-bottom: 28px;
        }

        /* 步骤指示器 */
        .setup-steps .ant-steps {
          margin-bottom: 32px;
        }

        .setup-steps .ant-steps-item-title {
          font-family: var(--font-sans) !important;
          font-size: 12px !important;
          font-weight: 600 !important;
        }

        .setup-steps .ant-steps-item-process .ant-steps-item-icon {
          background: linear-gradient(135deg, var(--cyan-400), var(--cyan-500)) !important;
          border-color: var(--cyan-400) !important;
          box-shadow: 0 0 12px rgba(34, 211, 238, 0.25) !important;
        }

        .setup-steps .ant-steps-item-finish .ant-steps-item-icon {
          border-color: var(--cyan-400) !important;
          background: rgba(34, 211, 238, 0.1) !important;
        }

        .setup-steps .ant-steps-item-finish .ant-steps-item-icon > .ant-steps-icon {
          color: var(--cyan-400) !important;
        }

        .setup-steps .ant-steps-item-finish > .ant-steps-item-container > .ant-steps-item-tail::after {
          background-color: var(--cyan-400) !important;
        }

        .setup-steps .ant-steps-item-wait .ant-steps-item-icon {
          background: rgba(255, 255, 255, 0.04) !important;
          border-color: var(--border-default) !important;
        }

        [data-theme="light"] .setup-steps .ant-steps-item-wait .ant-steps-item-icon {
          background: var(--bg-elevated) !important;
          border-color: var(--border-default) !important;
        }

        /* 步骤内容过渡 */
        .setup-step-content {
          animation: stepFadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes stepFadeIn {
          from { opacity: 0; transform: translateX(10px); }
          to { opacity: 1; transform: translateX(0); }
        }

        /* 表单标签 */
        .setup-form .ant-form-item-label > label {
          font-family: var(--font-mono) !important;
          font-size: 11px !important;
          font-weight: 600 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.8px !important;
          color: var(--text-secondary) !important;
        }

        /* 输入框 — 与 Login 风格统一 */
        .setup-input .ant-input-affix-wrapper,
        .setup-input .ant-input {
          height: 46px !important;
          border-radius: 8px !important;
          background: rgba(255, 255, 255, 0.05) !important;
          border: 1px solid var(--border-default) !important;
          font-family: var(--font-mono) !important;
          font-size: 13px !important;
          color: var(--text-primary) !important;
          padding: 0 14px !important;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }

        .setup-input .ant-input-prefix {
          color: var(--text-muted) !important;
          margin-right: 10px !important;
          font-size: 14px !important;
          transition: color 0.25s !important;
        }

        .setup-input .ant-input::placeholder {
          color: rgba(71, 85, 105, 0.7) !important;
        }

        .setup-input .ant-input-password-icon {
          color: var(--text-muted) !important;
        }

        .setup-input .ant-input-affix-wrapper-focused,
        .setup-input .ant-input:focus,
        .setup-input .ant-input-affix-wrapper:focus,
        .setup-input .ant-input-focused {
          background: rgba(255, 255, 255, 0.06) !important;
          border-color: var(--cyan-400) !important;
          box-shadow: 0 0 0 3px rgba(34, 211, 238, 0.1), 0 0 16px rgba(34, 211, 238, 0.06) !important;
        }

        .setup-input .ant-input-affix-wrapper-focused .ant-input-prefix,
        .setup-input .ant-input-affix-wrapper:focus .ant-input-prefix {
          color: var(--cyan-400) !important;
        }

        .setup-input .ant-input-affix-wrapper:hover,
        .setup-input .ant-input:hover {
          border-color: rgba(34, 211, 238, 0.3) !important;
        }

        /* 亮色主题输入框 */
        [data-theme="light"] .setup-input .ant-input-affix-wrapper,
        [data-theme="light"] .setup-input .ant-input {
          background: var(--bg-elevated) !important;
          border-color: var(--border-default) !important;
          color: var(--text-primary) !important;
        }

        [data-theme="light"] .setup-input .ant-input::placeholder {
          color: var(--text-tertiary) !important;
        }

        [data-theme="light"] .setup-input .ant-input-affix-wrapper-focused,
        [data-theme="light"] .setup-input .ant-input:focus,
        [data-theme="light"] .setup-input .ant-input-affix-wrapper:focus {
          border-color: var(--cyan-400) !important;
          box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1), 0 0 16px rgba(245, 158, 11, 0.06) !important;
        }

        [data-theme="light"] .setup-input .ant-input-affix-wrapper:hover,
        [data-theme="light"] .setup-input .ant-input:hover {
          border-color: rgba(245, 158, 11, 0.35) !important;
        }

        [data-theme="light"] .setup-input .ant-input-prefix,
        [data-theme="light"] .setup-input .ant-input-password-icon {
          color: var(--text-tertiary) !important;
        }

        [data-theme="light"] .setup-input .ant-input-affix-wrapper-focused .ant-input-prefix {
          color: var(--cyan-400) !important;
        }

        /* Select */
        .setup-select .ant-select-selector {
          height: 46px !important;
          border-radius: 8px !important;
          background: rgba(255, 255, 255, 0.05) !important;
          border: 1px solid var(--border-default) !important;
          font-family: var(--font-mono) !important;
          font-size: 13px !important;
          color: var(--text-primary) !important;
          padding: 4px 12px !important;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }

        [data-theme="light"] .setup-select .ant-select-selector {
          background: var(--bg-elevated) !important;
          border-color: var(--border-default) !important;
        }

        .setup-select .ant-select-selection-item,
        .setup-select .ant-select-selection-placeholder {
          line-height: 36px !important;
          color: var(--text-primary) !important;
        }

        [data-theme="light"] .setup-select .ant-select-selection-item {
          color: var(--text-primary) !important;
        }

        .setup-select .ant-select-selection-item::after {
          line-height: 36px !important;
        }

        .setup-select .ant-select-arrow {
          color: var(--text-muted) !important;
        }

        .setup-select.ant-select-focused .ant-select-selector {
          border-color: var(--cyan-400) !important;
          box-shadow: 0 0 0 3px rgba(34, 211, 238, 0.1) !important;
        }

        .setup-select .ant-select-selector:hover {
          border-color: rgba(34, 211, 238, 0.3) !important;
        }

        [data-theme="light"] .setup-select.ant-select-focused .ant-select-selector {
          border-color: var(--cyan-400) !important;
          box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1) !important;
        }

        /* Tabs */
        .setup-tabs .ant-tabs-nav {
          margin-bottom: 20px !important;
        }

        .setup-tabs .ant-tabs-tab {
          font-family: var(--font-sans) !important;
          font-size: 13px !important;
          font-weight: 600 !important;
          color: var(--text-muted) !important;
          padding: 10px 0 !important;
          transition: color 0.25s !important;
        }

        .setup-tabs .ant-tabs-tab:hover {
          color: var(--text-secondary) !important;
        }

        .setup-tabs .ant-tabs-tab.ant-tabs-tab-active .ant-tabs-tab-btn {
          color: var(--cyan-400) !important;
          font-weight: 700 !important;
        }

        .setup-tabs .ant-tabs-ink-bar {
          background: var(--cyan-400) !important;
          height: 2px !important;
          border-radius: 1px !important;
        }

        .setup-tabs .ant-tabs-nav::before {
          border-color: var(--border-subtle) !important;
        }

        /* 步骤描述 */
        .setup-step-desc {
          font-size: 13px;
          color: var(--text-muted);
          margin-bottom: 24px;
          font-family: var(--font-sans);
        }

        /* 按钮组 */
        .setup-btn-group {
          display: flex;
          gap: 12px;
          margin-top: 24px;
        }

        /* 主按钮 */
        .setup-btn-primary {
          flex: 1;
          height: 46px !important;
          border-radius: 8px !important;
          font-family: var(--font-sans) !important;
          font-size: 13px !important;
          font-weight: 700 !important;
          letter-spacing: 0.02em !important;
          background: linear-gradient(135deg, var(--cyan-400), var(--cyan-500)) !important;
          border: none !important;
          color: #fff !important;
          box-shadow: 0 4px 16px rgba(34, 211, 238, 0.2), 0 0 0 1px rgba(34, 211, 238, 0.1) !important;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }

        .setup-btn-primary:hover {
          transform: translateY(-2px) !important;
          box-shadow: 0 8px 24px rgba(34, 211, 238, 0.3), 0 0 0 1px rgba(34, 211, 238, 0.15) !important;
          filter: brightness(1.05) !important;
        }

        .setup-btn-primary:active {
          transform: translateY(0px) !important;
          box-shadow: 0 2px 8px rgba(34, 211, 238, 0.15) !important;
        }

        [data-theme="light"] .setup-btn-primary {
          box-shadow: 0 4px 16px rgba(245, 158, 11, 0.2), 0 0 0 1px rgba(245, 158, 11, 0.1) !important;
        }

        [data-theme="light"] .setup-btn-primary:hover {
          box-shadow: 0 8px 24px rgba(245, 158, 11, 0.3), 0 0 0 1px rgba(245, 158, 11, 0.15) !important;
        }

        /* 次要按钮 */
        .setup-btn-secondary {
          flex: 1;
          height: 46px !important;
          border-radius: 8px !important;
          font-family: var(--font-sans) !important;
          font-size: 13px !important;
          font-weight: 600 !important;
          background: transparent !important;
          border: 1px solid var(--border-default) !important;
          color: var(--text-secondary) !important;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }

        .setup-btn-secondary:hover {
          border-color: var(--border-strong) !important;
          color: var(--text-primary) !important;
          background: rgba(255, 255, 255, 0.03) !important;
        }

        [data-theme="light"] .setup-btn-secondary {
          border-color: var(--border-default) !important;
          color: var(--text-secondary) !important;
          background: transparent !important;
        }

        [data-theme="light"] .setup-btn-secondary:hover {
          border-color: rgba(245, 158, 11, 0.35) !important;
          color: var(--text-primary) !important;
          background: rgba(245, 158, 11, 0.03) !important;
        }

        /* Form item margin */
        .setup-form .ant-form-item {
          margin-bottom: 16px;
        }

        /* 动画 */
        @keyframes setupCardIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* 移动端适配 */
        @media (max-width: 580px) {
          .setup-glass {
            width: calc(100vw - 24px) !important;
            padding: 32px 20px !important;
            border-radius: 12px !important;
            max-height: 95vh !important;
          }
          .setup-title {
            font-size: 20px !important;
          }
          .setup-btn-group {
            flex-direction: column !important;
          }
        }
      `}</style>

      <div className="setup-page">
        <div className="setup-glass">
          {/* 标题 */}
          <h1 className="setup-title">欢迎使用量化交易平台</h1>
          <p className="setup-subtitle">首次使用需要完成初始化设置</p>

          {/* 步骤指示器 */}
          <div className="setup-steps">
            <Steps current={step} items={[
              { title: '创建管理员' },
              { title: '配置券商' }
            ]} />
          </div>

          {step === 0 && (
            <div className="setup-step-content" key="step-0">
              <Form onFinish={handleCreateAdmin} layout="vertical" className="setup-form">
                <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
                  <Input
                    className="setup-input"
                    prefix={<UserOutlined />}
                    placeholder="管理员用户名"
                    size="large"
                  />
                </Form.Item>
                <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
                  <Input.Password
                    className="setup-input"
                    prefix={<LockOutlined />}
                    placeholder="密码"
                    size="large"
                  />
                </Form.Item>
                <Form.Item style={{ marginBottom: 0 }}>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    size="large"
                    block
                    className="setup-btn-primary"
                  >
                    创建管理员账户
                  </Button>
                </Form.Item>
              </Form>
            </div>
          )}

          {step === 1 && (
            <div className="setup-step-content" key="step-1">
              <p className="setup-step-desc">
                配置券商账户以开始交易（可跳过，稍后在设置中配置）
              </p>
              <Form onFinish={handleConfigBroker} layout="vertical" className="setup-form">
                <Form.Item name="TRADING_MODE" label="交易模式" initialValue="mock">
                  <Select className="setup-select">
                    <Select.Option value="mock">Mock 模式</Select.Option>
                    <Select.Option value="paper">模拟盘</Select.Option>
                    <Select.Option value="live">实盘</Select.Option>
                  </Select>
                </Form.Item>

                <div className="setup-tabs">
                  <Tabs items={[
                    {
                      key: 'okx',
                      label: 'OKX',
                      children: (
                        <>
                          <Form.Item name="OKX_PAPER_API_KEY" label="API Key">
                            <Input.Password className="setup-input" placeholder="输入 API Key（可选）" />
                          </Form.Item>
                          <Form.Item name="OKX_PAPER_SECRET_KEY" label="Secret Key">
                            <Input.Password className="setup-input" placeholder="输入 Secret Key（可选）" />
                          </Form.Item>
                          <Form.Item name="OKX_PAPER_PASSPHRASE" label="Passphrase">
                            <Input.Password className="setup-input" placeholder="输入 Passphrase（可选）" />
                          </Form.Item>
                        </>
                      )
                    },
                    {
                      key: 'moomoo',
                      label: 'Moomoo',
                      children: (
                        <>
                          <Form.Item name="MOOMOO_PAPER_HOST" label="Host">
                            <Input className="setup-input" placeholder="127.0.0.1（可选）" />
                          </Form.Item>
                          <Form.Item name="MOOMOO_PAPER_PORT" label="Port">
                            <Input className="setup-input" placeholder="11111（可选）" />
                          </Form.Item>
                        </>
                      )
                    },
                    {
                      key: 'guojin',
                      label: '国金证券',
                      children: (
                        <>
                          <Form.Item name="GUOJIN_LIVE_ACCOUNT_ID" label="账户 ID">
                            <Input.Password className="setup-input" placeholder="输入账户 ID（可选）" />
                          </Form.Item>
                          <Form.Item name="GUOJIN_LIVE_PASSWORD" label="密码">
                            <Input.Password className="setup-input" placeholder="输入密码（可选）" />
                          </Form.Item>
                        </>
                      )
                    }
                  ]} />
                </div>

                <div className="setup-btn-group">
                  <Button
                    size="large"
                    onClick={handleSkip}
                    className="setup-btn-secondary"
                  >
                    跳过
                  </Button>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    size="large"
                    className="setup-btn-primary"
                  >
                    保存并登录
                  </Button>
                </div>
              </Form>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
