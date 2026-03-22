import { useState, useEffect, useCallback } from 'react';
import { Form, Input, Button, App } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { message } = App.useApp();

  const checkInitStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/system/init-status');
      const data = await res.json();
      if (!data.has_admin) {
        navigate('/setup');
      }
    } catch {
      console.error('检查初始化状态失败');
    }
  }, [navigate]);

  useEffect(() => {
    checkInitStatus();
  }, [checkInitStatus]);

  const handleLogin = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      await authService.login(values.username, values.password);
      message.success('登录成功');
      window.location.href = '/';
    } catch (error) {
      console.error('登录错误:', error);
      message.error('登录失败，请检查用户名和密码');
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-base);
          position: relative;
          overflow: hidden;
        }

        /* 全屏暗色环境光渐变 */
        .login-page::before {
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
        [data-theme="light"] .login-page::before {
          background:
            radial-gradient(ellipse at 85% 15%, rgba(245, 158, 11, 0.09) 0%, transparent 55%),
            radial-gradient(ellipse at 15% 85%, rgba(251, 191, 36, 0.04) 0%, transparent 50%);
        }

        /* 玻璃态卡片容器 */
        .login-glass {
          position: relative;
          z-index: 1;
          width: 340px;
          padding: 32px 28px;
          background: rgba(22, 24, 31, 0.82);
          border: 1px solid rgba(34, 211, 238, 0.18);
          border-radius: 14px;
          backdrop-filter: blur(20px) saturate(160%);
          -webkit-backdrop-filter: blur(20px) saturate(160%);
          box-shadow:
            0 0 0 1px rgba(34, 211, 238, 0.04),
            0 20px 40px rgba(0, 0, 0, 0.4),
            0 0 50px rgba(34, 211, 238, 0.04);
          animation: loginCardIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.15s both;
        }

        /* 亮色主题玻璃态卡片 */
        [data-theme="light"] .login-glass {
          background: rgba(255, 255, 255, 0.88);
          border: 1px solid rgba(245, 158, 11, 0.22);
          box-shadow:
            0 0 0 1px rgba(245, 158, 11, 0.05),
            0 24px 48px rgba(30, 41, 59, 0.1),
            0 0 60px rgba(245, 158, 11, 0.04);
        }

        /* 卡片左上角装饰光晕 */
        .login-glass::before {
          content: '';
          position: absolute;
          top: -30px;
          left: -20px;
          width: 140px;
          height: 140px;
          background: radial-gradient(circle, rgba(34, 211, 238, 0.08) 0%, transparent 70%);
          pointer-events: none;
          border-radius: 50%;
        }

        [data-theme="light"] .login-glass::before {
          background: radial-gradient(circle, rgba(245, 158, 11, 0.07) 0%, transparent 70%);
        }

        /* Logo 区域 */
        .login-logo {
          width: 52px;
          height: 52px;
          margin: 0 auto 20px;
          background: linear-gradient(135deg, var(--cyan-400) 0%, var(--cyan-600) 100%);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-sans);
          font-size: 22px;
          font-weight: 800;
          color: #fff;
          letter-spacing: -0.05em;
          box-shadow:
            0 6px 20px rgba(34, 211, 238, 0.25),
            0 0 0 1px rgba(34, 211, 238, 0.1);
          animation: logoIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.05s both;
        }

        [data-theme="light"] .login-logo {
          background: linear-gradient(135deg, var(--cyan-400) 0%, var(--cyan-600) 100%);
          box-shadow:
            0 6px 20px rgba(245, 158, 11, 0.2),
            0 0 0 1px rgba(245, 158, 11, 0.1);
        }

        /* 标题区域 */
        .login-title {
          font-family: var(--font-sans);
          font-size: 20px;
          font-weight: 800;
          color: var(--text-primary);
          text-align: center;
          margin-bottom: 4px;
          letter-spacing: -0.03em;
        }

        .login-subtitle {
          font-family: var(--font-sans);
          font-size: 12px;
          color: var(--text-muted);
          text-align: center;
          margin-bottom: 24px;
        }

        /* 表单 */
        .login-form .ant-form-item {
          margin-bottom: 14px;
        }

        /* 输入框 */
        .login-input .ant-input-affix-wrapper,
        .login-input .ant-input {
          height: 42px !important;
          border-radius: 8px !important;
          background: rgba(255, 255, 255, 0.05) !important;
          border: 1px solid var(--border-default) !important;
          font-family: var(--font-mono) !important;
          font-size: 13px !important;
          color: var(--text-primary) !important;
          padding: 0 14px !important;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }

        .login-input .ant-input-prefix {
          color: var(--text-muted) !important;
          margin-right: 10px !important;
          font-size: 15px !important;
          transition: color 0.25s !important;
        }

        .login-input .ant-input::placeholder {
          color: var(--text-muted) !important;
          opacity: 0.6 !important;
        }

        .login-input .ant-input-password-icon {
          color: var(--text-muted) !important;
        }

        .login-input .ant-input-affix-wrapper-focused,
        .login-input .ant-input-affix-wrapper-focused,
        .login-input .ant-input:focus,
        .login-input .ant-input-affix-wrapper:focus,
        .login-input .ant-input-focused {
          background: rgba(255, 255, 255, 0.06) !important;
          border-color: var(--cyan-400) !important;
          box-shadow: 0 0 0 3px rgba(34, 211, 238, 0.1), 0 0 16px rgba(34, 211, 238, 0.06) !important;
        }

        .login-input .ant-input-affix-wrapper-focused .ant-input-prefix,
        .login-input .ant-input:focus + .ant-input-prefix,
        .login-input .ant-input-affix-wrapper-focused .ant-input-prefix {
          color: var(--cyan-400) !important;
        }

        .login-input .ant-input-affix-wrapper:hover,
        .login-input .ant-input:hover {
          border-color: rgba(34, 211, 238, 0.3) !important;
        }

        /* 亮色主题输入框 */
        [data-theme="light"] .login-input .ant-input-affix-wrapper,
        [data-theme="light"] .login-input .ant-input {
          background: var(--bg-elevated) !important;
          border-color: var(--border-default) !important;
          color: var(--text-primary) !important;
        }

        [data-theme="light"] .login-input .ant-input::placeholder {
          color: var(--text-tertiary) !important;
        }

        [data-theme="light"] .login-input .ant-input-affix-wrapper-focused,
        [data-theme="light"] .login-input .ant-input:focus,
        [data-theme="light"] .login-input .ant-input-affix-wrapper:focus {
          border-color: var(--cyan-400) !important;
          box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1), 0 0 16px rgba(245, 158, 11, 0.06) !important;
        }

        [data-theme="light"] .login-input .ant-input-affix-wrapper:hover,
        [data-theme="light"] .login-input .ant-input:hover {
          border-color: rgba(245, 158, 11, 0.35) !important;
        }

        [data-theme="light"] .login-input .ant-input-prefix,
        [data-theme="light"] .login-input .ant-input-password-icon {
          color: var(--text-tertiary) !important;
        }

        [data-theme="light"] .login-input .ant-input-affix-wrapper-focused .ant-input-prefix {
          color: var(--cyan-400) !important;
        }

        /* 登录按钮 */
        .login-btn {
          width: 100% !important;
          height: 42px !important;
          border-radius: 8px !important;
          font-family: var(--font-sans) !important;
          font-size: 13px !important;
          font-weight: 700 !important;
          letter-spacing: 0.02em !important;
          background: linear-gradient(135deg, var(--cyan-400), var(--cyan-500)) !important;
          border: none !important;
          color: #fff !important;
          box-shadow: 0 4px 16px rgba(34, 211, 238, 0.2), 0 0 0 1px rgba(34, 211, 238, 0.1) !important;
          margin-top: 6px;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }

        .login-btn:hover {
          transform: translateY(-2px) !important;
          box-shadow: 0 8px 24px rgba(34, 211, 238, 0.3), 0 0 0 1px rgba(34, 211, 238, 0.15) !important;
          filter: brightness(1.05) !important;
        }

        .login-btn:active {
          transform: translateY(0px) !important;
          box-shadow: 0 2px 8px rgba(34, 211, 238, 0.15) !important;
        }

        .login-btn .ant-btn-loading-icon {
          color: #fff !important;
        }

        /* 亮色主题按钮 */
        [data-theme="light"] .login-btn {
          box-shadow: 0 4px 16px rgba(245, 158, 11, 0.2), 0 0 0 1px rgba(245, 158, 11, 0.1) !important;
        }

        [data-theme="light"] .login-btn:hover {
          box-shadow: 0 8px 24px rgba(245, 158, 11, 0.3), 0 0 0 1px rgba(245, 158, 11, 0.15) !important;
        }

        /* 暗色背景输入框 placeholder */
        .login-input .ant-input::placeholder {
          color: rgba(71, 85, 105, 0.7) !important;
        }

        /* 动画 */
        @keyframes loginCardIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes logoIn {
          from {
            opacity: 0;
            transform: scale(0.7) rotate(-10deg);
          }
          to {
            opacity: 1;
            transform: scale(1) rotate(0deg);
          }
        }

        /* 移动端适配 */
        @media (max-width: 480px) {
          .login-glass {
            width: calc(100vw - 24px) !important;
            padding: 28px 20px !important;
            border-radius: 12px !important;
          }
          .login-logo {
            width: 44px !important;
            height: 44px !important;
            font-size: 18px !important;
            border-radius: 10px !important;
          }
          .login-title {
            font-size: 18px !important;
          }
        }
      `}</style>

      <div className="login-page">
        <div className="login-glass">
          {/* Logo */}
          <div className="login-logo">Q</div>

          {/* 标题 */}
          <h1 className="login-title">量化交易平台</h1>
          <p className="login-subtitle">请登录以继续</p>

          {/* 表单 */}
          <Form onFinish={handleLogin} layout="vertical" className="login-form">
            <Form.Item
              name="username"
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input
                className="login-input"
                prefix={<UserOutlined />}
                placeholder="用户名"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password
                className="login-input"
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
                className="login-btn"
              >
                登录
              </Button>
            </Form.Item>
          </Form>
        </div>
      </div>
    </>
  );
}
