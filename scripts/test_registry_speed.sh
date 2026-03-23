#!/bin/bash
# Docker 镜像加速器测速脚本

set -e

TEST_IMAGE="ghcr.io/kuangzhenfeng/quant-trading-platform/backend:latest"

echo "=========================================="
echo "  Docker 镜像加速器测速"
echo "=========================================="
echo ""

# 检查加速器配置
echo "==> 1. 检查加速器配置"
if [ -f /etc/docker/daemon.json ]; then
    echo "    配置文件:"
    cat /etc/docker/daemon.json | sed 's/^/    /'
else
    echo "    /etc/docker/daemon.json 不存在"
fi

echo ""
echo "    生效的镜像源:"
docker info 2>/dev/null | grep -A 5 "Registry Mirrors" | sed 's/^/    /' || echo "    未配置加速器"

echo ""
echo "==> 2. 清理旧镜像"
docker rmi ${TEST_IMAGE} 2>/dev/null || echo "    镜像不存在，无需清理"

echo ""
echo "==> 3. 拉取镜像测速"
echo "    镜像: ${TEST_IMAGE}"
echo ""

START=$(date +%s)
docker pull ${TEST_IMAGE}
END=$(date +%s)

DURATION=$((END - START))
echo ""
echo "=========================================="
echo "  耗时: ${DURATION} 秒"
echo "=========================================="
