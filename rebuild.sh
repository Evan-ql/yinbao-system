#!/bin/bash
# ============================================
# 银保报表系统 - 一键重新构建并重启
# 使用方法: bash rebuild.sh
# ============================================

set -e

echo "=========================================="
echo "  银保报表系统 - 重新构建并重启"
echo "=========================================="

cd /home/ubuntu/yinbao-system

# 1. 安装依赖（如有新增）
echo ""
echo "[1/3] 安装依赖..."
pnpm install

# 2. 重新构建
echo ""
echo "[2/3] 构建项目..."
pnpm build

# 3. 重启服务
echo ""
echo "[3/3] 重启服务..."
sudo systemctl restart yinbao.service
sleep 2

# 4. 检查状态
echo ""
echo "=========================================="
STATUS=$(sudo systemctl is-active yinbao.service)
if [ "$STATUS" = "active" ]; then
    echo "  ✓ 服务已成功重启并运行中"
    echo "  访问地址: https://3000-iiq8f4k9bqyfq1sjw35li-41c380be.sg1.manus.computer"
else
    echo "  ✗ 服务启动失败，请检查日志:"
    echo "    tail -20 /home/ubuntu/yinbao-system/server.log"
fi
echo "=========================================="
