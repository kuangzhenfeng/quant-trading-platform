import { Layout, Menu } from 'antd';
import { Link, Outlet } from 'react-router-dom';

const { Header, Sider, Content } = Layout;

export default function MainLayout() {
  return (
    <Layout style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Header style={{
        display: 'flex',
        alignItems: 'center',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)',
        padding: '0 24px'
      }}>
        <div style={{
          color: 'var(--accent-green)',
          fontSize: '18px',
          fontWeight: 600,
          letterSpacing: '0.05em'
        }}>
          ⚡ QUANT TERMINAL
        </div>
      </Header>
      <Layout style={{ background: 'var(--bg-primary)' }}>
        <Sider width={200} style={{ background: 'var(--bg-secondary)' }}>
          <Menu
            mode="inline"
            defaultSelectedKeys={['1']}
            style={{
              background: 'var(--bg-secondary)',
              border: 'none'
            }}
            theme="dark"
          >
            <Menu.Item key="1">
              <Link to="/" style={{ color: 'var(--text-primary)' }}>仪表盘</Link>
            </Menu.Item>
            <Menu.Item key="2">
              <Link to="/trading" style={{ color: 'var(--text-primary)' }}>交易</Link>
            </Menu.Item>
          </Menu>
        </Sider>
        <Content style={{ padding: '24px', background: 'var(--bg-primary)' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
