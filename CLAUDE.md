# 量化交易平台

多平台量化交易平台，支持国金证券（A股）、moomoo（美股/港股）、OKX（虚拟货币）。

## 技术栈
- **前端**: React + TypeScript + Vite + Ant Design + Zustand
- **后端**: Python 3.11+ / FastAPI / WebSocket / uv / Pydantic / pytest
- **数据库**: SQLite（开发）/ PostgreSQL（生产）
- **部署**: Docker + Docker Compose

## 架构
BrokerAdapter 抽象层统一各平台接口，策略引擎执行量化脚本，WebSocket 推送实时数据，风控模块校验订单。

## 目录
`frontend/` 前端；`backend/app/adapters/` 各平台适配器（base/guojin/moomoo/okx）；`backend/app/strategies/` 策略引擎；`backend/app/websocket/` WebSocket 处理。

## 规范
- 遵循现代化工业级设计的标准实践
- 前后端均用 TypeScript 类型注解 / Python 类型注解
- 前端函数式组件 + Hooks；后端 async/await
- 注释用中文
- Git 规范: 禁止提交代码，禁止使用git commit命令
- 用 playwright MCP/skill 验证功能
- 实盘总额度必须 < 10 美元
- 严格区分 Mock/模拟盘/实盘，不做降级处理

## 命令
```bash
# Docker 部署（默认）
docker compose up -d                    # 启动全部服务
docker compose logs -f                  # 查看日志
docker compose down                     # 停止服务

# 本地开发
cd frontend && npm install && npm run dev   # 前端，端口 5173
cd backend && uv sync && uv run uvicorn app.main:app --reload  # 后端，端口 9000
cd backend && uv run pytest -v
```
