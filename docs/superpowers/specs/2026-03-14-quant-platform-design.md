# 量化交易平台设计文档

**日期**: 2026-03-14
**策略**: 抽象优先策略
**开发模式**: 多平台并行 + 完全模拟环境

## 1. 项目概述

### 1.1 目标
构建一个支持多平台（国金证券、moomoo、OKX）的量化交易平台，实现统一的行情获取、策略执行和订单管理。

### 1.2 技术栈
- **前端**: React 18 + TypeScript 5 + Vite 5 + Ant Design 5 + Zustand
- **后端**: Python 3.11+ + FastAPI + Pydantic + SQLAlchemy + WebSocket
- **部署**: Docker + Docker Compose
- **数据库**: SQLite（开发）/ PostgreSQL（生产）

### 1.3 开发阶段
1. **阶段1**: 核心抽象层（2-3天）
2. **阶段2**: Mock 实现（1-2天）
3. **阶段3**: 并行开发真实功能（5-7天）

## 2. 系统架构

### 2.1 整体架构

```
前端 (React) ←→ WebSocket/REST ←→ 后端 (FastAPI)
                                      ↓
                              BrokerAdapter 抽象层
                                      ↓
                    ┌─────────────────┼─────────────────┐
                    ↓                 ↓                 ↓
              GuojinAdapter    MoomooAdapter      OKXAdapter
```

### 2.2 核心分层
1. **API Gateway Layer**: REST API + WebSocket + 风控中间件
2. **Business Logic Layer**: 策略引擎 + 订单管理 + 持仓管理
3. **Adapter Layer**: BrokerAdapter 抽象 + 各平台实现

## 3. BrokerAdapter 抽象层

### 3.1 核心接口

```python
class BrokerAdapter(ABC):
    # 连接管理
    async def connect() -> bool
    async def disconnect() -> bool

    # 行情接口
    async def get_tick(symbol: str) -> Dict
    async def subscribe_market_data(symbols: List[str], callback)

    # 交易接口
    async def place_order(...) -> str
    async def cancel_order(order_id: str) -> bool
    async def get_order(order_id: str) -> Dict

    # 账户接口
    async def get_account() -> Dict
    async def get_positions() -> List[Dict]
```

### 3.2 数据模型

- **Tick**: symbol, price, volume, timestamp
- **Order**: order_id, symbol, side, type, quantity, price, status
- **Position**: symbol, quantity, avg_price, unrealized_pnl
- **Account**: broker, balance, available, frozen

## 4. WebSocket 通信

### 4.1 消息格式
```json
{
  "type": "tick|order|position|strategy",
  "broker": "guojin|moomoo|okx",
  "data": {...},
  "timestamp": "ISO8601"
}
```

### 4.2 实现要点
- 后端: ConnectionManager 管理连接，支持广播
- 前端: WebSocketClient 自动重连，事件订阅机制

## 5. 前端架构

### 5.1 目录结构
```
src/
├── components/  # 通用组件
├── pages/       # 页面（Dashboard, Trading, Strategy, Monitor）
├── stores/      # Zustand 状态管理
├── services/    # API + WebSocket
└── types/       # TypeScript 类型
```

### 5.2 状态管理
使用 Zustand 管理：
- marketStore: 行情数据
- orderStore: 订单状态
- accountStore: 账户信息
- strategyStore: 策略状态

## 6. 后端架构

### 6.1 目录结构
```
app/
├── api/         # API 路由
├── core/        # 核心配置
├── models/      # 数据模型
├── services/    # 业务逻辑
├── adapters/    # BrokerAdapter 实现
│   ├── base.py
│   ├── mock.py
│   ├── guojin.py
│   ├── moomoo.py
│   ├── okx.py
│   └── factory.py
├── strategies/  # 策略引擎
└── websocket/   # WebSocket 处理
```

## 7. 开发计划

### 7.1 Phase 1: 基础架构（2-3天）
- [ ] 前端项目初始化（Vite + React + TS + Ant Design）
- [ ] 后端项目初始化（FastAPI + 项目结构）
- [ ] BrokerAdapter 抽象基类定义
- [ ] 统一数据模型定义
- [ ] WebSocket 通信框架
- [ ] 前端基础 UI 布局（导航、路由）

### 7.2 Phase 2: Mock 实现（1-2天）
- [ ] MockAdapter 实现（模拟行情、交易）
- [ ] 三个平台的 Mock Adapter（GuojinAdapter, MoomooAdapter, OKXAdapter）
- [ ] 前端与 Mock 后端联调
- [ ] 基础行情看板页面
- [ ] 基础交易面板页面

### 7.3 Phase 3: 真实功能开发（5-7天）
- [ ] 国金证券 API 集成（行情 + 交易）
- [ ] moomoo API 集成（行情 + 交易）
- [ ] OKX API 集成（行情 + 交易）
- [ ] 策略引擎框架
- [ ] 策略脚本加载和执行
- [ ] 回测引擎
- [ ] 风控模块
- [ ] 监控仪表盘
- [ ] 多账户管理
- [ ] Docker 配置

## 8. 技术要点

### 8.1 前端
- TypeScript 严格模式
- 函数式组件 + Hooks
- Ant Design 组件库
- WebSocket 自动重连
- 错误边界处理

### 8.2 后端
- Python 3.11+ 类型注解
- async/await 异步编程
- Pydantic 数据校验
- pytest 单元测试
- 统一异常处理

### 8.3 部署
- Docker Compose 多容器编排
- 环境变量配置管理
- 日志收集和监控

## 9. 风险与挑战

### 9.1 技术风险
- 各平台 API 差异较大，抽象层设计需要灵活
- WebSocket 连接稳定性需要处理重连和心跳
- 实时行情数据量大，需要优化性能

### 9.2 应对策略
- 使用 Mock Adapter 先验证架构可行性
- 完善的错误处理和日志记录
- 分阶段开发，逐步验证

## 10. 下一步行动

1. 创建前端项目骨架
2. 创建后端项目骨架
3. 实现 BrokerAdapter 抽象基类
4. 实现 MockAdapter
5. 搭建 WebSocket 通信
6. 实现基础 UI 页面
