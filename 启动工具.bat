@echo off
chcp 65001 >nul
title SNS 运营数据监控看板

echo ============================================
echo  SNS 数据监控看板 (Instagram + TikTok) 启动中...
echo ============================================
echo.

:: 1. 启动本地 Next.js 服务
echo [1/2] 正在启动本地服务引擎...
start "SNS Monitor Server" cmd /k "cd /d "%~dp0" && npm run dev"

:: 2. 等待服务就绪（等待 4 秒）
timeout /t 4 /nobreak >nul

:: 3. 自动在浏览器中打开看板网页
echo [2/2] 正在自动为您打开浏览器看板...
start http://localhost:3000

echo.
echo ============================================
echo  ✅ 启动成功！已在浏览器中打开看板。
echo  本地访问网址：http://localhost:3000
echo ============================================
echo.
echo 提示：只要保持「SNS Monitor Server」窗口开启即可正常使用。
echo.
pause
