# 量化交易平台 (Quant Trading Platform)

多平台量化交易系统，支持国金证券、moomoo（富途）、OKX 三大交易平台。

## 特性

- 🔌 **统一接口** - BrokerAdapter 抽象层，轻松接入多个交易平台
- 📊 **实时行情** - WebSocket 推送，毫秒级行情更新
- 💹 **交易执行** - 统一下单接口，支持限价单/市价单
- 🤖 **策略引擎** - 支持自定义量化策略，实盘与回测
- 📈 **回测系统** - 历史数据回放，绩效统计分析
- 🛡️ **风控系统** - 仓位限制、资金检查、异常拦截
- 📊 **监控面板** - 实时 PnL、持仓、订单统计
- 👥 **多账户** - 支持多平台账户配置与切换
- 📝 **日志系统** - 三级日志、自动告警
- 🎨 **现代 UI** - React + Ant Design，响应式设计
- 🐳 **容器化** - Docker 一键部署

## 技术栈

**前端**
- React 18 + TypeScript 5
- Vite 5 + Ant Design 5
- Zustand (状态管理)
- WebSocket (实时通信)

**后端**
- Python 3.11+ + FastAPI
- Pydantic (数据验证)
- WebSocket (实时推送)
- pytest (单元测试)

## 快速开始

### 本地开发

**后端：**
```bash
cd backend
uv venv
uv pip install -r requirements.txt
uv run uvicorn app.main:app --reload
```

**前端：**
```bash
cd frontend
npm install
npm run dev
```

访问：http://localhost:5173

### Docker 部署

```bash
docker compose up -d --build
```

访问：http://localhost

## 项目结构

```
quant-trading-platform/
├── backend/              # FastAPI 后端
│   ├── app/
│   │   ├── adapters/    # 交易平台适配器（OKX、国金、moomoo）
│   │   ├── api/         # API 路由
│   │   ├── models/      # 数据模型
│   │   ├── services/    # 业务逻辑（交易、行情、策略、监控）
│   │   ├── strategies/  # 策略实现
│   │   ├── websocket/   # WebSocket 管理
│   │   └── main.py      # 应用入口
│   └── tests/           # 单元测试（26 个测试）
├── frontend/            # React 前端
│   ├── src/
│   │   ├── components/  # UI 组件
│   │   ├── pages/       # 页面（行情、交易、策略、监控、账户、日志、回测）
│   │   ├── services/    # API 服务
│   │   └── App.tsx      # 应用入口
│   └── ...
├── .github/workflows/   # CI/CD 配置
├── docker-compose.yml   # Docker 编排
├── DEVELOPMENT.md       # 开发规划
└── DEPLOY.md           # 部署指南
```

## 功能模块

### 行情数据
- 支持 OKX、国金证券、moomoo 三大平台
- WebSocket 实时推送，1 秒间隔更新
- 前端行情看板，多平台切换

### 交易执行
- 统一下单接口（限价单/市价单）
- 订单管理（下单/撤单/查询）
- 持仓管理与同步
- 风控规则（仓位限制、资金检查）

### 策略引擎
- 策略脚本加载和执行
- 均线策略示例（金叉死叉）
- 行情数据自动分发
- 策略日志记录

### 回测系统
- 历史数据模拟生成
- 策略回放执行
- 绩效指标（收益率、最大回撤、胜率）

### 监控运维
- 实时 PnL 统计
- 持仓明细展示
- 策略状态监控
- 多账户管理
- 三级日志系统（INFO/WARNING/ERROR）
- 自动告警通知

## 测试

```bash
cd backend
pytest -v
```

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！
