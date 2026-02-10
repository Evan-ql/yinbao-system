#!/bin/bash
# ============================================
# 银保报表系统 - 快速重启（不重新构建）
# 使用方法: bash restart.sh
# ============================================

echo "正在重启银保报表系统..."
sudo systemctl restart yinbao.service
sleep 2

STATUS=$(sudo systemctl is-active yinbao.service)
if [ "$STATUS" = "active" ]; then
    echo "✓ 服务已成功重启"
else
    echo "✗ 服务启动失败"
    tail -10 /home/ubuntu/yinbao-system/server.log
fi
