# 量化交易平台 (Quant Trading Platform)

多平台量化交易系统，支持国金证券、moomoo（富途）、OKX 三大交易平台。

## 特性

- 🔌 **统一接口** - BrokerAdapter 抽象层，轻松接入多个交易平台
- 📊 **实时行情** - WebSocket 推送，毫秒级行情更新
- 🤖 **策略引擎** - 支持自定义量化策略，回测与实盘
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
source .venv/bin/activate
uv pip install -r requirements.txt
uvicorn app.main:app --reload
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
docker-compose up --build
```

访问：http://localhost

## 项目结构

```
quant-trading-platform/
├── backend/              # FastAPI 后端
│   ├── app/
│   │   ├── adapters/    # 交易平台适配器
│   │   ├── models/      # 数据模型
│   │   ├── websocket/   # WebSocket 管理
│   │   └── main.py      # 应用入口
│   └── tests/           # 单元测试
├── frontend/            # React 前端
│   ├── src/
│   │   ├── components/  # UI 组件
│   │   ├── pages/       # 页面
│   │   ├── stores/      # 状态管理
│   │   └── services/    # API 服务
│   └── ...
└── docker-compose.yml   # Docker 配置
```

## 开发进度

- [x] **Phase 1**: 基础架构搭建 ✅ (2026-03-14)
  - 前后端项目初始化
  - BrokerAdapter 抽象层
  - WebSocket 通信
  - 基础 UI 框架
  - **验证**: 后端测试 5/5 ✅ | Playwright 测试通过 ✅

- [ ] **Phase 2**: 行情数据模块
  - 国金证券行情接入
  - moomoo 行情接入
  - OKX 行情接入
  - 实时行情展示

- [ ] **Phase 3**: 交易执行模块
  - 统一下单接口
  - 订单管理
  - 持仓管理
  - 风控规则

- [ ] **Phase 4**: 策略引擎
  - 策略框架
  - 回测系统
  - 实盘运行

- [ ] **Phase 5**: 监控与运维
  - 交易监控
  - 日志系统
  - 告警通知

## API 文档

启动后端服务后访问：
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 测试

```bash
cd backend
pytest -v
```

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！
