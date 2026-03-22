# 量化交易平台 (Quant Trading Platform)

多平台量化交易系统，支持国金证券（A股）、moomoo（美股/港股）、OKX（虚拟货币）。

## 特性

- 🔌 **统一接口** - BrokerAdapter 抽象层，接入多个交易平台
- 📡 **实时行情** - WebSocket 推送，毫秒级行情更新
- 📝 **交易执行** - 统一下单接口，支持限价单/市价单
- ⚙️ **策略引擎** - 自定义量化策略，实盘与回测
- 🔁 **回测系统** - 历史数据回放，绩效统计分析
- 🛡️ **风控系统** - 仓位限制、资金检查、异常拦截
- 📊 **监控面板** - 实时 PnL、持仓、订单统计

## 技术栈

| 前端 | 后端 | 数据库 | 部署 |
|------|------|--------|------|
| React + TypeScript | Python 3.11+ / FastAPI | SQLite (开发) / PostgreSQL (生产) | Docker Compose |
| Vite + Ant Design | Pydantic + pytest | | |
| Zustand | uv | | |

## 快速开始

### Docker 部署（推荐）

```bash
docker compose up -d --build
```

访问 http://localhost

### 本地开发

```bash
# 后端
cd backend && uv sync && uv run uvicorn app.main:app --reload  # 端口 9000

# 前端
cd frontend && npm install && npm run dev                       # 端口 5173
```

默认登录账号：`admin` / `admin`

## 项目结构

```
backend/
├── app/
│   ├── adapters/     # 平台适配器（base/guojin/moomoo/okx）
│   ├── api/         # API 路由
│   ├── models/      # 数据模型
│   ├── services/    # 业务逻辑
│   ├── strategies/  # 策略引擎
│   ├── websocket/   # WebSocket 管理
│   └── main.py      # 应用入口
frontend/
├── src/
│   ├── components/  # UI 组件
│   ├── pages/       # 页面（行情、交易、策略、监控、回测、账户、日志）
│   └── services/     # API 服务
```

## 功能模块

### 📈 行情数据
- 三大平台 WebSocket 实时行情，1 秒间隔更新

### 💹 交易执行
- 统一下单接口（限价单/市价单）+ 订单管理（下单/撤单/查询）
- 持仓管理与同步 + 风控规则校验

### 🤖 策略引擎
- 策略脚本加载执行 + 均线策略示例（金叉死叉）

### 🔍 回测系统
- 历史数据模拟 + 绩效指标（收益率、最大回撤、胜率）

### 🔧 监控运维
- 实时 PnL、持仓、策略状态 + 三级日志（INFO/WARNING/ERROR）

## 测试

```bash
cd backend && uv run pytest -v
```

## 许可证

MIT License
