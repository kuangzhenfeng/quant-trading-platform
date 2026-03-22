import { useState, useEffect } from 'react';
import { Form, Input, Button, message, Steps, Select, Tabs } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { accountApi } from '../services/account';
import { systemApi } from '../services/system';

export default function Setup() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
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
    } catch {
      console.error('检查初始化状态失败');
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
