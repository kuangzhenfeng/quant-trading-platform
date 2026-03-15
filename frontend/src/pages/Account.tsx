import { useState, useEffect, useCallback } from 'react';
import { Table, Button, Modal, Form, Input, Select, Switch, message } from 'antd';
import { UserOutlined, PlusOutlined } from '@ant-design/icons';
import { accountApi, type BrokerConfig } from '../services/account';
import type { AccountFormValues } from '../types/api';

export default function Account() {
  const [accounts, setAccounts] = useState<BrokerConfig[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const fetchAccounts = useCallback(async () => {
    const data = await accountApi.list();
    setAccounts(data.accounts);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchAccounts();
  }, [fetchAccounts]);

  const handleAdd = async (values: AccountFormValues) => {
    await accountApi.add({
      id: `${values.broker}_${Date.now()}`,
      broker: values.broker,
      name: values.name,
      config: JSON.parse(values.config || '{}'),
      active: true
    });
    message.success('账户添加成功');
    setModalOpen(false);
    form.resetFields();
    fetchAccounts();
  };

  const handleRemove = async (id: string) => {
    await accountApi.remove(id);
    message.success('账户删除成功');
    fetchAccounts();
  };

  const handleToggle = async (id: string, active: boolean) => {
    await accountApi.setActive(id, active);
    fetchAccounts();
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
    <div style={{ padding: '32px 32px 48px', minHeight: '100vh', background: 'var(--bg-base)' }}>
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
            <Select placeholder="选择交易平台">
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

          <Form.Item
            name="config"
            label={
              <span style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 12,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: 'var(--text-secondary)',
              }}>
                配置 (JSON)
              </span>
            }
          >
            <Input.TextArea
              rows={4}
              placeholder='{"api_key": "xxx"}'
              style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
