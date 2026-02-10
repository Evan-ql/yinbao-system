#!/bin/bash
# ============================================
# 银保报表系统 - 查看运行日志
# 使用方法: bash logs.sh [行数]
# ============================================

LINES=${1:-50}
echo "=========================================="
echo "  银保报表系统 - 最近 ${LINES} 行日志"
echo "=========================================="
echo ""

# 服务状态
echo "服务状态: $(sudo systemctl is-active yinbao.service)"
echo ""
echo "--- 日志内容 ---"
tail -n $LINES /home/ubuntu/yinbao-system/server.log
