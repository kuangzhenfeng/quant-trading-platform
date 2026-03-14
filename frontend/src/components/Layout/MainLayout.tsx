import { Layout, Menu } from 'antd';
import { Link, Outlet } from 'react-router-dom';

const { Header, Sider, Content } = Layout;

const menuItems = [
  { key: '1', label: <Link to="/">仪表盘</Link> },
  { key: '2', label: <Link to="/market">行情看板</Link> },
  { key: '3', label: <Link to="/trading">交易</Link> },
  { key: '4', label: <Link to="/strategy">策略</Link> },
  { key: '5', label: <Link to="/monitor">监控</Link> },
  { key: '6', label: <Link to="/account">账户</Link> },
  { key: '7', label: <Link to="/logs">日志</Link> },
  { key: '8', label: <Link to="/backtest">回测</Link> },
];

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
            items={menuItems}
            style={{
              background: 'var(--bg-secondary)',
              border: 'none'
            }}
            theme="dark"
          />
        </Sider>
        <Content style={{ padding: '24px', background: 'var(--bg-primary)' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
