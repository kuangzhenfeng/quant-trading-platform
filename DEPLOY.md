# 部署指南

## Docker 部署

### 构建和启动服务

```bash
docker-compose up -d
```

### 停止服务

```bash
docker-compose down
```

### 查看日志

```bash
docker-compose logs -f
```

## 访问地址

- 前端：http://localhost
- 后端 API：http://localhost:9000
- API 文档：http://localhost:9000/docs

## CI/CD

项目使用 GitHub Actions 进行持续集成：
- 每次推送到 main 分支时自动运行测试
- Pull Request 时自动运行测试
