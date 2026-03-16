import { useState, useEffect } from 'react';
import { Form, Input, Button, message, Steps, Select, Tabs } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

export default function Setup() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    checkInitStatus();
  }, []);

  const checkInitStatus = async () => {
    try {
      const res = await fetch('/api/system/init-status');
      const data = await res.json();
      if (data.has_admin) {
        navigate('/login');
      }
    } catch (error) {
      console.error('检查初始化状态失败:', error);
    }
  };

  const handleCreateAdmin = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      });
      if (!res.ok) throw new Error();

      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      });
      const loginData = await loginRes.json();
      setToken(loginData.access_token);

      message.success('管理员账户创建成功');
      setStep(1);
    } catch (error) {
      message.error('创建失败');
    } finally {
      setLoading(false);
    }
  };

  const handleConfigBroker = async (values: any) => {
    setLoading(true);
    try {
      const configs = [
        { key: 'TRADING_MODE', value: values.TRADING_MODE || 'mock', category: 'trading_mode', is_sensitive: false },
        { key: 'OKX_PAPER_API_KEY', value: values.OKX_PAPER_API_KEY || '', category: 'okx', is_sensitive: true },
        { key: 'OKX_PAPER_SECRET_KEY', value: values.OKX_PAPER_SECRET_KEY || '', category: 'okx', is_sensitive: true },
        { key: 'OKX_PAPER_PASSPHRASE', value: values.OKX_PAPER_PASSPHRASE || '', category: 'okx', is_sensitive: true },
        { key: 'MOOMOO_PAPER_HOST', value: values.MOOMOO_PAPER_HOST || '', category: 'moomoo', is_sensitive: false },
        { key: 'MOOMOO_PAPER_PORT', value: values.MOOMOO_PAPER_PORT || '', category: 'moomoo', is_sensitive: false },
        { key: 'GUOJIN_LIVE_ACCOUNT_ID', value: values.GUOJIN_LIVE_ACCOUNT_ID || '', category: 'guojin', is_sensitive: true },
        { key: 'GUOJIN_LIVE_PASSWORD', value: values.GUOJIN_LIVE_PASSWORD || '', category: 'guojin', is_sensitive: true },
      ];

      await fetch('/api/system/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ configs })
      });
      message.success('配置保存成功');
      navigate('/login');
    } catch (error) {
      message.error('保存配置失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    message.info('已跳过券商配置，可稍后在设置中配置');
    navigate('/login');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-base)',
    }}>
      <div style={{
        width: 500,
        padding: 40,
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
            欢迎使用量化交易平台
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
            首次使用需要完成初始化设置
          </p>
        </div>

        <Steps current={step} style={{ marginBottom: 32 }} items={[
          { title: '创建管理员' },
          { title: '配置券商' }
        ]} />

        {step === 0 && (
          <Form onFinish={handleCreateAdmin} layout="vertical">
            <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
              <Input prefix={<UserOutlined />} placeholder="管理员用户名" size="large" />
            </Form.Item>
            <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
              <Input.Password prefix={<LockOutlined />} placeholder="密码" size="large" />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} size="large" block>
              创建管理员账户
            </Button>
          </Form>
        )}

        {step === 1 && (
          <div>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 24 }}>
              配置券商账户以开始交易（可跳过，稍后在设置中配置）
            </p>
            <Form onFinish={handleConfigBroker} layout="vertical">
              <Form.Item name="TRADING_MODE" label="交易模式" initialValue="mock">
                <Select>
                  <Select.Option value="mock">Mock 模式</Select.Option>
                  <Select.Option value="paper">模拟盘</Select.Option>
                  <Select.Option value="live">实盘</Select.Option>
                </Select>
              </Form.Item>

              <Tabs items={[
                {
                  key: 'okx',
                  label: 'OKX',
                  children: (
                    <>
                      <Form.Item name="OKX_PAPER_API_KEY" label="API Key">
                        <Input.Password placeholder="输入 API Key（可选）" />
                      </Form.Item>
                      <Form.Item name="OKX_PAPER_SECRET_KEY" label="Secret Key">
                        <Input.Password placeholder="输入 Secret Key（可选）" />
                      </Form.Item>
                      <Form.Item name="OKX_PAPER_PASSPHRASE" label="Passphrase">
                        <Input.Password placeholder="输入 Passphrase（可选）" />
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
                        <Input placeholder="127.0.0.1（可选）" />
                      </Form.Item>
                      <Form.Item name="MOOMOO_PAPER_PORT" label="Port">
                        <Input placeholder="11111（可选）" />
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
                        <Input.Password placeholder="输入账户 ID（可选）" />
                      </Form.Item>
                      <Form.Item name="GUOJIN_LIVE_PASSWORD" label="密码">
                        <Input.Password placeholder="输入密码（可选）" />
                      </Form.Item>
                    </>
                  )
                }
              ]} />

              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <Button size="large" block onClick={handleSkip}>
                  跳过
                </Button>
                <Button type="primary" htmlType="submit" loading={loading} size="large" block>
                  保存并登录
                </Button>
              </div>
            </Form>
          </div>
        )}
      </div>
    </div>
  );
}
