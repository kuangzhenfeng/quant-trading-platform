# 量化交易平台 Phase 1 实施计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 搭建量化交易平台的基础架构，包括前后端项目初始化、BrokerAdapter 抽象层、WebSocket 通信和基础 UI 框架。

**Architecture:** 采用抽象优先策略，先定义统一的 BrokerAdapter 接口和数据模型，然后实现 Mock Adapter 用于开发测试。前后端通过 WebSocket 实时通信，前端使用 Zustand 管理状态。

**Tech Stack:** React 18 + TypeScript 5 + Vite 5 + Ant Design 5 + Zustand / Python 3.11+ + FastAPI + Pydantic + WebSocket

---

## 文件结构规划

### 后端文件
```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                    # FastAPI 应用入口
│   ├── core/
│   │   ├── __init__.py
│   │   └── config.py              # 配置管理
│   ├── models/
│   │   ├── __init__.py
│   │   └── schemas.py             # Pydantic 数据模型
│   ├── adapters/
│   │   ├── __init__.py
│   │   ├── base.py                # BrokerAdapter 抽象基类
│   │   ├── mock.py                # Mock 实现
│   │   └── factory.py             # 适配器工厂
│   ├── websocket/
│   │   ├── __init__.py
│   │   └── manager.py             # WebSocket 连接管理
│   └── api/
│       ├── __init__.py
│       └── websocket.py           # WebSocket 路由
├── tests/
│   ├── __init__.py
│   ├── test_adapters.py
│   └── test_websocket.py
├── requirements.txt
└── pytest.ini
```

### 前端文件
```
frontend/
├── src/
│   ├── main.tsx                   # 应用入口
│   ├── App.tsx                    # 根组件
│   ├── types/
│   │   └── index.ts               # TypeScript 类型定义
│   ├── services/
│   │   ├── api.ts                 # REST API 客户端
│   │   └── websocket.ts           # WebSocket 客户端
│   ├── stores/
│   │   ├── marketStore.ts         # 行情状态
│   │   └── accountStore.ts        # 账户状态
│   ├── components/
│   │   └── Layout/
│   │       └── MainLayout.tsx     # 主布局组件
│   └── pages/
│       ├── Dashboard.tsx          # 仪表盘页面
│       └── Trading.tsx            # 交易页面
├── package.json
├── vite.config.ts
├── tsconfig.json
└── index.html
```

---

## Chunk 1: 后端项目初始化

### 步骤 1.1: 创建后端目录结构
- [ ] 创建 `backend/` 目录
- [ ] 创建 `backend/app/` 及子目录（core, models, adapters, websocket, api）
- [ ] 创建 `backend/tests/` 目录
- [ ] 创建所有 `__init__.py` 文件

### 步骤 1.2: 创建 requirements.txt
- [ ] 创建 `backend/requirements.txt`，包含：
  - fastapi
  - uvicorn[standard]
  - pydantic
  - websockets
  - pytest
  - pytest-asyncio

### 步骤 1.3: 创建配置文件
- [ ] 创建 `backend/app/core/config.py`
- [ ] 定义基础配置类（API 端口、CORS 等）

### 步骤 1.4: 创建 FastAPI 应用入口
- [ ] 创建 `backend/app/main.py`
- [ ] 初始化 FastAPI 应用
- [ ] 配置 CORS 中间件
- [ ] 添加健康检查端点 `/health`

---

## Chunk 2: BrokerAdapter 抽象层

### 步骤 2.1: 定义数据模型
- [ ] 创建 `backend/app/models/schemas.py`
- [ ] 定义枚举类：OrderSide, OrderType, OrderStatus
- [ ] 定义 Pydantic 模型：TickData, OrderData, PositionData, AccountData

### 步骤 2.2: 创建 BrokerAdapter 抽象基类
- [ ] 创建 `backend/app/adapters/base.py`
- [ ] 定义 BrokerAdapter 抽象基类
- [ ] 定义抽象方法：connect, disconnect, get_tick, subscribe_market_data, place_order, cancel_order, get_order, get_account, get_positions

### 步骤 2.3: 实现 MockAdapter
- [ ] 创建 `backend/app/adapters/mock.py`
- [ ] 实现 MockAdapter 类，继承 BrokerAdapter
- [ ] 实现所有抽象方法，返回模拟数据
- [ ] 添加随机行情数据生成逻辑

### 步骤 2.4: 创建适配器工厂
- [ ] 创建 `backend/app/adapters/factory.py`
- [ ] 实现 AdapterFactory 类
- [ ] 添加 create() 方法，根据 broker 类型创建对应的适配器实例

---

## Chunk 3: WebSocket 通信

### 步骤 3.1: 创建 WebSocket 连接管理器
- [ ] 创建 `backend/app/websocket/manager.py`
- [ ] 实现 ConnectionManager 类
- [ ] 实现 connect, disconnect, broadcast 方法

### 步骤 3.2: 创建 WebSocket 路由
- [ ] 创建 `backend/app/api/websocket.py`
- [ ] 定义 WebSocket 端点 `/ws/{client_id}`
- [ ] 处理连接、断开和消息接收

### 步骤 3.3: 集成到主应用
- [ ] 在 `backend/app/main.py` 中注册 WebSocket 路由
- [ ] 测试 WebSocket 连接

---

## Chunk 4: 后端测试

### 步骤 4.1: 创建测试配置
- [ ] 创建 `backend/pytest.ini`
- [ ] 配置 pytest 异步测试

### 步骤 4.2: 编写适配器测试
- [ ] 创建 `backend/tests/test_adapters.py`
- [ ] 测试 MockAdapter 的各个方法
- [ ] 测试 AdapterFactory

### 步骤 4.3: 编写 WebSocket 测试
- [ ] 创建 `backend/tests/test_websocket.py`
- [ ] 测试 WebSocket 连接和消息广播

---

## Chunk 5: 前端项目初始化

### 步骤 5.1: 创建 Vite 项目
- [ ] 使用 `npm create vite@latest frontend -- --template react-ts` 创建项目
- [ ] 进入 frontend 目录，安装依赖

### 步骤 5.2: 安装必要依赖
- [ ] 安装 Ant Design: `npm install antd`
- [ ] 安装 Zustand: `npm install zustand`
- [ ] 安装 React Router: `npm install react-router-dom`

### 步骤 5.3: 配置 TypeScript
- [ ] 修改 `tsconfig.json`，启用严格模式
- [ ] 配置路径别名

### 步骤 5.4: 配置 Vite
- [ ] 修改 `vite.config.ts`
- [ ] 配置代理，将 `/api` 和 `/ws` 代理到后端

---

## Chunk 6: 前端类型定义

### 步骤 6.1: 创建类型文件
- [ ] 创建 `frontend/src/types/index.ts`
- [ ] 定义 Tick, Order, Position, Account 接口
- [ ] 定义 WebSocket 消息类型

---

## Chunk 7: 前端服务层

### 步骤 7.1: 创建 WebSocket 客户端
- [ ] 创建 `frontend/src/services/websocket.ts`
- [ ] 实现 WebSocketClient 类
- [ ] 实现 connect, on, send 方法
- [ ] 实现自动重连机制

### 步骤 7.2: 创建 API 客户端
- [ ] 创建 `frontend/src/services/api.ts`
- [ ] 配置 axios 实例
- [ ] 定义基础 API 方法

---

## Chunk 8: 前端状态管理

### 步骤 8.1: 创建行情状态
- [ ] 创建 `frontend/src/stores/marketStore.ts`
- [ ] 定义 MarketState 接口
- [ ] 实现 useMarketStore hook
- [ ] 添加 updateTick 方法

### 步骤 8.2: 创建账户状态
- [ ] 创建 `frontend/src/stores/accountStore.ts`
- [ ] 定义 AccountState 接口
- [ ] 实现 useAccountStore hook

---

## Chunk 9: 前端 UI 组件

### 步骤 9.1: 创建主布局
- [ ] 创建 `frontend/src/components/Layout/MainLayout.tsx`
- [ ] 使用 Ant Design Layout 组件
- [ ] 添加顶部导航栏和侧边菜单

### 步骤 9.2: 创建页面组件
- [ ] 创建 `frontend/src/pages/Dashboard.tsx`
- [ ] 创建 `frontend/src/pages/Trading.tsx`

### 步骤 9.3: 配置路由
- [ ] 在 `App.tsx` 中配置 React Router
- [ ] 设置路由：/ -> Dashboard, /trading -> Trading

---

## Chunk 10: 前后端联调

### 步骤 10.1: 启动后端服务
- [ ] 运行 `cd backend && uvicorn app.main:app --reload`
- [ ] 验证 `/health` 端点可访问

### 步骤 10.2: 启动前端服务
- [ ] 运行 `cd frontend && npm run dev`
- [ ] 验证页面可正常访问

### 步骤 10.3: 测试 WebSocket 连接
- [ ] 在前端页面中建立 WebSocket 连接
- [ ] 验证连接成功
- [ ] 测试消息收发

---

## Chunk 11: Docker 配置

### 步骤 11.1: 创建后端 Dockerfile
- [ ] 创建 `backend/Dockerfile`
- [ ] 使用 Python 3.11 基础镜像

### 步骤 11.2: 创建前端 Dockerfile
- [ ] 创建 `frontend/Dockerfile`
- [ ] 使用 Node 18 基础镜像

### 步骤 11.3: 创建 docker-compose.yml
- [ ] 在项目根目录创建 `docker-compose.yml`
- [ ] 配置 backend 和 frontend 服务

---

## 验收标准

- [ ] 后端服务可正常启动，`/health` 端点返回 200
- [ ] 前端页面可正常访问，显示基础布局
- [ ] WebSocket 连接成功，可以收发消息
- [ ] MockAdapter 可以返回模拟的行情数据
- [ ] 所有单元测试通过
- [ ] Docker Compose 可以一键启动整个应用

---

## 注意事项

1. **最小化原则**: 只实现必要的功能，避免过度设计
2. **类型安全**: 前后端都要使用严格的类型检查
3. **错误处理**: 添加基础的错误处理和日志
4. **测试优先**: 关键模块要有单元测试
5. **文档注释**: 关键接口和类要有清晰的注释

