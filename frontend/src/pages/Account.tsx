import { useState, useEffect, useCallback } from 'react';
import { Table, Button, Modal, Form, Input, Select, Switch, message } from 'antd';
import { UserOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons';
import { accountApi, type BrokerConfig } from '../services/account';

const { TextArea } = Input;

export default function Account() {
  const [accounts, setAccounts] = useState<BrokerConfig[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [selectedBroker, setSelectedBroker] = useState<string>('');
  const [importText, setImportText] = useState<string>('');

  const fetchAccounts = useCallback(async () => {
    const data = await accountApi.list();
    setAccounts(data.accounts);
  }, []);

  useEffect(() => {
    void fetchAccounts();
  }, [fetchAccounts]);

  const handleAdd = async (values: Record<string, string>) => {
    const { broker, name, ...configFields } = values;
    await accountApi.add({
      id: `${broker}_${Date.now()}`,
      broker,
      name,
      config: configFields,
      active: true
    });
    message.success('账户添加成功');
    setModalOpen(false);
    form.resetFields();
    setSelectedBroker('');
    fetchAccounts();
  };

  const handleRemove = async (id: string) => {
    await accountApi.remove(id);
    message.success('账户删除成功');
    fetchAccounts();
  };

  const handleToggle = async (id: string, active: boolean) => {
    if (active) {
      const account = accounts.find(a => a.id === id);
      const isPaper = account?.config.is_paper === 'true' || account?.config.is_paper === true;
      const sameBrokerModeActive = accounts.find(a =>
        a.broker === account?.broker &&
        a.id !== id &&
        a.active &&
        (a.config.is_paper === 'true' || a.config.is_paper === true) === isPaper
      );
      if (sameBrokerModeActive) {
        message.info(`已自动停用同平台同模式的账号：${sameBrokerModeActive.name}`);
      }
    }
    await accountApi.setActive(id, active);
    message.success(active ? '账号已启用' : '账号已停用');
    fetchAccounts();
  };

  const handleImport = async () => {
    try {
      const json = JSON.parse(importText);
      const result = await accountApi.batchImport(json.accounts);

      if (result.success > 0) {
        message.success(`成功导入 ${result.success} 个账户`);
      }

      if (result.failed && result.failed.length > 0) {
        const errors = result.failed.map((f: { name: string; error: string }) =>
          `${f.name}: ${f.error}`
        ).join('\n');
        message.error(`导入失败 ${result.failed.length} 个:\n${errors}`, 5);
      }

      setImportModalOpen(false);
      setImportText('');
      fetchAccounts();
    } catch (e) {
      const error = e as { response?: { data?: { detail?: string } }; message?: string };
      const errorMsg = error.response?.data?.detail || error.message || '未知错误';
      message.error('导入失败：' + errorMsg);
    }
  };

  const brokerLabel: Record<string, string> = {
    okx: 'OKX',
    guojin: '国金证券',
    moomoo: 'moomoo',
  };

  const columns = [
    {
      title: (
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.5px', color: 'var(--text-tertiary)' }}>
          ID
        </span>
      ),
      dataIndex: 'id',
      key: 'id',
      render: (id: string) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-secondary)' }}>
          {id}
        </span>
      ),
    },
    {
      title: (
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.5px', color: 'var(--text-tertiary)' }}>
          平台
        </span>
      ),
      dataIndex: 'broker',
      key: 'broker',
      render: (broker: string) => (
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--cyan-400)',
          background: 'color-mix(in srgb, var(--cyan-400) 10%, transparent)',
          border: '1px solid color-mix(in srgb, var(--cyan-400) 25%, transparent)',
          borderRadius: 'var(--radius-sm)',
          padding: '2px 8px',
          letterSpacing: '0.3px',
        }}>
          {brokerLabel[broker] ?? broker}
        </span>
      ),
    },
    {
      title: (
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.5px', color: 'var(--text-tertiary)' }}>
          名称
        </span>
      ),
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => (
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>
          {name}
        </span>
      ),
    },
    {
      title: (
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.5px', color: 'var(--text-tertiary)' }}>
          模式
        </span>
      ),
      dataIndex: 'config',
      key: 'mode',
      render: (config: Record<string, unknown>) => {
        const isPaper = config.is_paper === 'true' || config.is_paper === true;
        return (
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            fontWeight: 600,
            color: isPaper ? 'var(--yellow-400)' : 'var(--loss)',
            background: isPaper ? 'color-mix(in srgb, var(--yellow-400) 10%, transparent)' : 'color-mix(in srgb, var(--loss) 10%, transparent)',
            border: isPaper ? '1px solid color-mix(in srgb, var(--yellow-400) 25%, transparent)' : '1px solid color-mix(in srgb, var(--loss) 25%, transparent)',
            borderRadius: 'var(--radius-sm)',
            padding: '2px 8px',
            letterSpacing: '0.3px',
          }}>
            {isPaper ? '模拟盘' : '实盘'}
          </span>
        );
      },
    },
    {
      title: (
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.5px', color: 'var(--text-tertiary)' }}>
          状态
        </span>
      ),
      dataIndex: 'active',
      key: 'active',
      render: (active: boolean, record: BrokerConfig) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Switch
            checked={active}
            onChange={(checked) => handleToggle(record.id, checked)}
          />
          <span style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 12,
            fontWeight: 500,
            color: active ? 'var(--gain)' : 'var(--text-muted)',
            letterSpacing: '0.3px',
          }}>
            {active ? '已启用' : '已停用'}
          </span>
        </div>
      ),
    },
    {
      title: (
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.5px', color: 'var(--text-tertiary)' }}>
          操作
        </span>
      ),
      key: 'action',
      render: (_: unknown, record: BrokerConfig) => (
        <Button
          size="small"
          onClick={() => handleRemove(record.id)}
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 12,
            fontWeight: 500,
            color: 'var(--loss)',
            background: 'color-mix(in srgb, var(--loss) 8%, transparent)',
            border: '1px solid color-mix(in srgb, var(--loss) 25%, transparent)',
            borderRadius: 'var(--radius-sm)',
            letterSpacing: '0.3px',
          }}
        >
          删除
        </Button>
      ),
    },
  ];

  return (
    <div className="page-content" style={{ padding: '32px 32px 48px', minHeight: '100vh', background: 'var(--bg-base)' }}>
      {/* Page Header */}
      <div className="page-header animate-in stagger-1">
        <div>
          <h1 className="page-title">Account</h1>
          <p className="page-subtitle">账户配置与管理</p>
        </div>
      </div>

      {/* Table Card */}
      <div
        className="animate-in stagger-2"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
        }}
      >
        {/* Card Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-subtle)',
        }}>
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
              <UserOutlined />
            </div>
            <div>
              <div style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--text-primary)',
                letterSpacing: '0.1px',
              }}>
                账户列表
              </div>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                color: 'var(--text-muted)',
                marginTop: 1,
              }}>
                {accounts.length} 个账户
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              icon={<UploadOutlined />}
              onClick={() => setImportModalOpen(true)}
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text-primary)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-sm)',
                height: 34,
                paddingInline: 16,
                letterSpacing: '0.3px',
              }}
            >
              批量导入
            </Button>
            <Button
              icon={<PlusOutlined />}
              onClick={() => setModalOpen(true)}
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--bg-base)',
                background: 'var(--cyan-400)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                height: 34,
                paddingInline: 16,
                letterSpacing: '0.3px',
                boxShadow: '0 0 12px color-mix(in srgb, var(--cyan-400) 35%, transparent)',
                cursor: 'pointer',
              }}
            >
              添加账户
            </Button>
          </div>
        </div>

        {/* Table */}
        <div style={{ padding: '0 0 4px' }}>
          <Table
            dataSource={accounts}
            columns={columns}
            rowKey="id"
            pagination={false}
            locale={{
              emptyText: (
                <div style={{
                  padding: '48px 0',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 12,
                }}>
                  <UserOutlined style={{ fontSize: 32, color: 'var(--text-muted)' }} />
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-muted)' }}>
                    暂无账户，点击右上角添加
                  </span>
                </div>
              ),
            }}
          />
        </div>
      </div>

      {/* Add Account Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 28,
              height: 28,
              borderRadius: 'var(--radius-sm)',
              background: 'color-mix(in srgb, var(--cyan-400) 12%, transparent)',
              border: '1px solid color-mix(in srgb, var(--cyan-400) 25%, transparent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--cyan-400)',
              fontSize: 13,
            }}>
              <PlusOutlined />
            </div>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
              添加账户
            </span>
          </div>
        }
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        okText="确认添加"
        cancelText="取消"
        okButtonProps={{
          style: {
            fontFamily: 'var(--font-sans)',
            fontWeight: 600,
            fontSize: 13,
            background: 'var(--cyan-400)',
            borderColor: 'var(--cyan-400)',
            color: 'var(--bg-base)',
            letterSpacing: '0.3px',
          },
        }}
        cancelButtonProps={{
          style: {
            fontFamily: 'var(--font-sans)',
            fontWeight: 500,
            fontSize: 13,
            color: 'var(--text-secondary)',
            borderColor: 'var(--border-default)',
          },
        }}
      >
        <Form form={form} onFinish={handleAdd} layout="vertical" style={{ marginTop: 20 }}>
          <Form.Item
            name="broker"
            label={
              <span style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 12,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: 'var(--text-secondary)',
              }}>
                平台
              </span>
            }
            rules={[{ required: true, message: '请选择平台' }]}
          >
            <Select placeholder="选择交易平台" onChange={(value) => setSelectedBroker(value)}>
              <Select.Option value="okx">OKX</Select.Option>
              <Select.Option value="guojin">国金证券</Select.Option>
              <Select.Option value="moomoo">moomoo</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="name"
            label={
              <span style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 12,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: 'var(--text-secondary)',
              }}>
                账户名称
              </span>
            }
            rules={[{ required: true, message: '请输入账户名称' }]}
          >
            <Input placeholder="例如：主账户、测试账户" />
          </Form.Item>

          {selectedBroker === 'okx' && (
            <>
              <Form.Item name="api_key" label="API Key" rules={[{ required: true }]}>
                <Input.Password placeholder="输入 API Key" />
              </Form.Item>
              <Form.Item name="secret_key" label="Secret Key" rules={[{ required: true }]}>
                <Input.Password placeholder="输入 Secret Key" />
              </Form.Item>
              <Form.Item name="passphrase" label="Passphrase" rules={[{ required: true }]}>
                <Input.Password placeholder="输入 Passphrase" />
              </Form.Item>
              <Form.Item name="is_paper" label="交易模式" initialValue="true">
                <Select>
                  <Select.Option value="true">模拟盘</Select.Option>
                  <Select.Option value="false">实盘</Select.Option>
                </Select>
              </Form.Item>
            </>
          )}

          {selectedBroker === 'moomoo' && (
            <>
              <Form.Item name="host" label="Host" rules={[{ required: true }]} initialValue="127.0.0.1">
                <Input placeholder="127.0.0.1" />
              </Form.Item>
              <Form.Item name="port" label="Port" rules={[{ required: true }]} initialValue="11111">
                <Input placeholder="11111" />
              </Form.Item>
              <Form.Item name="is_paper" label="交易模式" initialValue="true">
                <Select>
                  <Select.Option value="true">模拟盘</Select.Option>
                  <Select.Option value="false">实盘</Select.Option>
                </Select>
              </Form.Item>
            </>
          )}

          {selectedBroker === 'guojin' && (
            <>
              <Form.Item name="account_id" label="账户 ID" rules={[{ required: true }]}>
                <Input.Password placeholder="输入账户 ID" />
              </Form.Item>
              <Form.Item name="password" label="密码" rules={[{ required: true }]}>
                <Input.Password placeholder="输入密码" />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>

      {/* Import Modal */}
      <Modal
        title="批量导入账户"
        open={importModalOpen}
        onCancel={() => {
          setImportModalOpen(false);
          setImportText('');
        }}
        onOk={handleImport}
        okText="导入"
        cancelText="取消"
        width={600}
      >
        <TextArea
          rows={16}
          placeholder={`粘贴 JSON 格式的账户配置，例如：

{
  "accounts": [
    {
      "broker": "okx",
      "name": "OKX账户",
      "config": {
        "api_key": "xxx",
        "secret_key": "xxx",
        "passphrase": "xxx",
        "mode": "paper"
      }
    }
  ]
}`}
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          style={{ fontFamily: 'var(--font-mono)', fontSize: 13, marginTop: 16 }}
        />
      </Modal>
    </div>
  );
}
