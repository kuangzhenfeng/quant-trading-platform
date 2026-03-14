import { useState, useCallback } from 'react';
import { Card, Table, Select, Button } from 'antd';
import { useMarketWebSocket } from '../hooks/useMarketWebSocket';

interface TickData {
  symbol: string;
  price: number;
  volume: number;
  timestamp: string;
}

export default function Market() {
  const [ticks, setTicks] = useState<Record<string, TickData>>({});
  const [broker, setBroker] = useState('okx');

  const handleTick = useCallback((tick: TickData) => {
    setTicks(prev => ({ ...prev, [tick.symbol]: tick }));
  }, []);

  const { subscribe } = useMarketWebSocket('client-1', handleTick);

  const handleSubscribe = () => {
    const symbols = broker === 'okx'
      ? ['BTC-USDT', 'ETH-USDT']
      : broker === 'guojin'
      ? ['600000.SH', '000001.SZ']
      : ['AAPL', 'TSLA'];

    subscribe(broker, symbols);
  };

  const columns = [
    { title: '代码', dataIndex: 'symbol', key: 'symbol' },
    {
      title: '价格',
      dataIndex: 'price',
      key: 'price',
      render: (price: number) => (
        <span style={{ color: 'var(--accent-green)', fontFamily: 'monospace' }}>
          {price.toFixed(2)}
        </span>
      )
    },
    {
      title: '成交量',
      dataIndex: 'volume',
      key: 'volume',
      render: (vol: number) => (
        <span style={{ fontFamily: 'monospace' }}>{vol.toLocaleString()}</span>
      )
    },
  ];

  return (
    <div>
      <h1 style={{ color: 'var(--text-primary)', marginBottom: '24px', fontSize: '24px' }}>
        行情看板
      </h1>

      <Card style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', marginBottom: '16px' }}>
        <Select
          value={broker}
          onChange={setBroker}
          style={{ width: 200, marginRight: '16px' }}
          options={[
            { label: 'OKX', value: 'okx' },
            { label: '国金证券', value: 'guojin' },
            { label: 'moomoo', value: 'moomoo' },
          ]}
        />
        <Button type="primary" onClick={handleSubscribe}>
          订阅行情
        </Button>
      </Card>

      <Card style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
        <Table
          columns={columns}
          dataSource={Object.values(ticks)}
          rowKey="symbol"
          pagination={false}
        />
      </Card>
    </div>
  );
}
