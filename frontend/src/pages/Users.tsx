import { useState, useEffect, useCallback } from 'react';
import { Table, Button, Modal, Form, Input, message } from 'antd';
import { TeamOutlined, PlusOutlined } from '@ant-design/icons';
import { userApi } from '../services/user';
import { authService } from '../services/auth';
import type { User } from '../types/api';

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentUsername, setCurrentUsername] = useState('');
  const [form] = Form.useForm();

  const fetchUsers = useCallback(async () => {
    const data = await userApi.list();
    setUsers(data);
  }, []);

  useEffect(() => {
    void fetchUsers();
    const fetchCurrentUser = async () => {
      const user = await authService.getCurrentUser();
      setCurrentUsername(user.username);
    };
    void fetchCurrentUser();
  }, [fetchUsers]);

  const handleAdd = async (values: { username: string; password: string }) => {
    await authService.register(values.username, values.password);
    message.success('用户添加成功');
    setModalOpen(false);
    form.resetFields();
    fetchUsers();
  };

  const handleRemove = async (username: string) => {
    await userApi.delete(username);
    message.success('用户删除成功');
    await fetchUsers();
  };

  const columns = [
    {
      title: (
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.5px', color: 'var(--text-tertiary)' }}>
          用户名
        </span>
      ),
      dataIndex: 'username',
      key: 'username',
      render: (username: string) => (
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>
          {username}
        </span>
      ),
    },
    {
      title: (
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.5px', color: 'var(--text-tertiary)' }}>
          创建时间
        </span>
      ),
      dataIndex: 'created_at',
      key: 'created_at',
      render: (created_at: string) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-secondary)' }}>
          {new Date(created_at).toLocaleString('zh-CN')}
        </span>
      ),
    },
    {
      title: (
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.5px', color: 'var(--text-tertiary)' }}>
          操作
        </span>
      ),
      key: 'action',
      render: (_: unknown, record: User) => {
        const isCurrentUser = record.username === currentUsername;
        return (
          <Button
            size="small"
            onClick={() => handleRemove(record.username)}
            disabled={isCurrentUser}
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 12,
              fontWeight: 500,
              color: isCurrentUser ? 'var(--text-muted)' : 'var(--loss)',
              background: isCurrentUser ? 'var(--bg-elevated)' : 'color-mix(in srgb, var(--loss) 8%, transparent)',
              border: `1px solid ${isCurrentUser ? 'var(--border-default)' : 'color-mix(in srgb, var(--loss) 25%, transparent)'}`,
              borderRadius: 'var(--radius-sm)',
              letterSpacing: '0.3px',
              cursor: isCurrentUser ? 'not-allowed' : 'pointer',
            }}
          >
            删除
          </Button>
        );
      },
    },
  ];

  return (
    <div style={{ padding: '32px 32px 48px', minHeight: '100vh', background: 'var(--bg-base)' }}>
      <div className="page-header animate-in stagger-1">
        <div>
          <h1 className="page-title">Users</h1>
          <p className="page-subtitle">用户管理</p>
        </div>
      </div>

      <div
        className="animate-in stagger-2"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
        }}
      >
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
              <TeamOutlined />
            </div>
            <div>
              <div style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--text-primary)',
                letterSpacing: '0.1px',
              }}>
                用户列表
              </div>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                color: 'var(--text-muted)',
                marginTop: 1,
              }}>
                {users.length} 个用户
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
            添加用户
          </Button>
        </div>

        <div style={{ padding: '0 0 4px' }}>
          <Table
            dataSource={users}
            columns={columns}
            rowKey="username"
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
                  <TeamOutlined style={{ fontSize: 32, color: 'var(--text-muted)' }} />
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-muted)' }}>
                    暂无用户，点击右上角添加
                  </span>
                </div>
              ),
            }}
          />
        </div>
      </div>

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
              添加用户
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
            name="username"
            label={
              <span style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 12,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: 'var(--text-secondary)',
              }}>
                用户名
              </span>
            }
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input placeholder="输入用户名" />
          </Form.Item>

          <Form.Item
            name="password"
            label={
              <span style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 12,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: 'var(--text-secondary)',
              }}>
                密码
              </span>
            }
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password placeholder="输入密码" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
