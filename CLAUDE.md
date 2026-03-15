# 量化交易平台 (Quant Trading Platform)

## 项目概述

多平台量化交易平台，支持：
- **国金证券** — A股交易
- **moomoo（富途）** — 美股/港股交易
- **OKX** — 虚拟货币交易

通过统一的 BrokerAdapter 抽象层，实现多平台行情获取、策略执行和订单管理。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React + TypeScript + Vite + Ant Design |
| 后端 | Python 3.11+ / FastAPI / WebSocket / uv |
| 数据库 | SQLite（开发）/ PostgreSQL（生产） |
| 部署 | Docker + Docker Compose |

## 架构说明

采用**统一网关架构**，核心设计：

- **BrokerAdapter 抽象层**：定义统一的行情/交易接口，各平台实现各自的 Adapter
- **策略引擎**：加载和执行量化策略脚本，提供行情数据访问和下单接口
- **WebSocket 实时通信**：前后端通过 WebSocket 推送行情和订单状态
- **风控模块**：统一的风控规则校验，在下单前拦截异常操作

## 目录结构

```
quant-trading-platform/
├── frontend/                # React 前端
│   ├── src/
│   │   ├── components/      # 通用组件
│   │   ├── pages/           # 页面
│   │   ├── hooks/           # 自定义 Hooks
│   │   ├── services/        # API 调用 & WebSocket
│   │   ├── stores/          # 状态管理
│   │   └── types/           # TypeScript 类型定义
│   └── ...
├── backend/                 # FastAPI 后端
│   ├── app/
│   │   ├── api/             # API 路由
│   │   ├── core/            # 核心配置
│   │   ├── models/          # 数据模型
│   │   ├── services/        # 业务逻辑
│   │   ├── adapters/        # 各平台 BrokerAdapter 实现
│   │   │   ├── base.py      # 抽象基类
│   │   │   ├── guojin.py    # 国金证券
│   │   │   ├── moomoo.py    # moomoo（富途）
│   │   │   └── okx.py       # OKX
│   │   ├── strategies/      # 策略引擎
│   │   └── websocket/       # WebSocket 处理
│   ├── tests/               # 测试
│   └── ...
├── CLAUDE.md
├── DEVELOPMENT.md           # 开发规划
└── docker-compose.yml
```

## 开发规范

### 前端
- TypeScript **严格模式** (`strict: true`)
- 使用 **Ant Design** 组件库
- 函数式组件 + React Hooks
- 使用 Zustand 进行状态管理

### 后端
- Python **3.11+**
- 使用 **uv** 作为包管理器和运行器
- 全面使用**类型注解**
- **async/await** 异步编程
- Pydantic 做数据校验
- pytest 做单元测试

### Git 规范
禁止提交代码

## 常用命令

```bash
# 前端
cd frontend && npm install        # 安装依赖
cd frontend && npm run dev        # 启动开发服务器
cd frontend && npm run build      # 构建生产版本
cd frontend && npm run lint       # 代码检查

# 后端
cd backend && uv sync             # 安装依赖（使用 uv）
cd backend && uv run uvicorn app.main:app --reload  # 启动开发服务器
cd backend && uv run pytest -v    # 运行后端测试
```

## 注意

- 注释用中文
- 当配置的API KEY是真实配置时，涉及金钱的操作严格遵循总额度必须小于10美元，避免误操作导致损失。
