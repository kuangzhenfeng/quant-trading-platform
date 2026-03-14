import { useState, useEffect, useCallback } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, Switch, message } from 'antd';
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

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id' },
    { title: '平台', dataIndex: 'broker', key: 'broker' },
    { title: '名称', dataIndex: 'name', key: 'name' },
    {
      title: '状态',
      dataIndex: 'active',
      key: 'active',
      render: (active: boolean, record: BrokerConfig) => (
        <Switch checked={active} onChange={(checked) => handleToggle(record.id, checked)} />
      )
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: BrokerConfig) => (
        <Button danger size="small" onClick={() => handleRemove(record.id)}>删除</Button>
      )
    }
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card
        title="账户管理"
        extra={<Button type="primary" onClick={() => setModalOpen(true)}>添加账户</Button>}
      >
        <Table dataSource={accounts} columns={columns} rowKey="id" />
      </Card>

      <Modal
        title="添加账户"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} onFinish={handleAdd} layout="vertical">
          <Form.Item name="broker" label="平台" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="okx">OKX</Select.Option>
              <Select.Option value="guojin">国金证券</Select.Option>
              <Select.Option value="moomoo">moomoo</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="name" label="账户名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="config" label="配置 (JSON)">
            <Input.TextArea rows={4} placeholder='{"api_key": "xxx"}' />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
