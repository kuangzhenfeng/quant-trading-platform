# 量化交易平台 - 启动指南

## 已完成内容

✅ **后端 (Backend)**
- FastAPI 应用框架
- BrokerAdapter 抽象层
- MockAdapter 模拟实现
- WebSocket 通信管理
- 单元测试

✅ **前端 (Frontend)**
- React + TypeScript + Vite
- Ant Design UI 组件
- Zustand 状态管理
- WebSocket 客户端
- 路由配置（仪表盘、交易页面）

✅ **Docker 配置**
- backend/Dockerfile
- frontend/Dockerfile
- docker-compose.yml

## 启动方式

### 方式 1：本地开发

**后端启动：**
```bash
cd backend
uv venv
source .venv/bin/activate
uv pip install -r requirements.txt
uvicorn app.main:app --reload
```

或使用 uv 直接运行：
```bash
cd backend
uv run uvicorn app.main:app --reload
```

**前端启动：**
```bash
cd frontend
npm run dev
```

访问：http://localhost:5173

### 方式 2：Docker

```bash
docker-compose up --build
```

访问：http://localhost

## 验证

1. 后端健康检查：http://localhost:9000/health
2. WebSocket 连接：ws://localhost:9000/ws/test
3. 前端页面：仪表盘和交易页面

## 下一步

Phase 1 完成后，可以继续：
- Phase 2：接入真实行情数据
- Phase 3：实现交易功能
- Phase 4：策略引擎
- Phase 5：监控运维
