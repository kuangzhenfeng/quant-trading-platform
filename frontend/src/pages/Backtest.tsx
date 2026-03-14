import { useState } from 'react';
import { Card, Form, Input, DatePicker, Button, Statistic, Row, Col, message } from 'antd';
import { backtestApi } from '../services/backtest';
import dayjs from 'dayjs';

export default function Backtest() {
  const [form] = Form.useForm();
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleRun = async (values: any) => {
    setLoading(true);
    try {
      const config = {
        strategy_id: values.strategy_id,
        symbol: values.symbol,
        start_date: values.date_range[0].format('YYYY-MM-DD'),
        end_date: values.date_range[1].format('YYYY-MM-DD'),
        initial_capital: values.initial_capital
      };
      const { backtest_id } = await backtestApi.run(config);

      // 等待回测完成并获取结果
      setTimeout(async () => {
        const res = await backtestApi.getResult(backtest_id);
        setResult(res);
        setLoading(false);
        message.success('回测完成');
      }, 2000);
    } catch (error) {
      setLoading(false);
      message.error('回测失败');
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Card title="回测配置">
        <Form form={form} onFinish={handleRun} layout="vertical">
          <Form.Item name="strategy_id" label="策略ID" initialValue="ma_strategy" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="symbol" label="交易标的" initialValue="BTC-USDT" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="date_range" label="回测时间范围" rules={[{ required: true }]}>
            <DatePicker.RangePicker />
          </Form.Item>
          <Form.Item name="initial_capital" label="初始资金" initialValue={100000} rules={[{ required: true }]}>
            <Input type="number" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              开始回测
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {result && (
        <Card title="回测结果" style={{ marginTop: 24 }}>
          <Row gutter={16}>
            <Col span={6}>
              <Statistic
                title="总收益率"
                value={result.total_return * 100}
                precision={2}
                suffix="%"
                styles={{ value: { color: result.total_return >= 0 ? '#3f8600' : '#cf1322' } }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="最大回撤"
                value={result.max_drawdown * 100}
                precision={2}
                suffix="%"
                styles={{ value: { color: '#cf1322' } }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="胜率"
                value={result.win_rate * 100}
                precision={2}
                suffix="%"
              />
            </Col>
            <Col span={6}>
              <Statistic title="总交易次数" value={result.total_trades} />
            </Col>
          </Row>
        </Card>
      )}
    </div>
  );
}
