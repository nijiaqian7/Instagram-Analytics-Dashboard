@echo off
chcp 65001 >nul
title Instagram 数据抓取工具

echo ============================================
echo  Instagram 数据抓取工具 - 启动中...
echo ============================================
echo.

:: 启动 Next.js 开发服务器（后台）
echo [1/2] 正在启动本地服务器...
start "NextJS Dev Server" cmd /k "cd /d "%~dp0" && npm run dev"

:: 等待服务器就绪
timeout /t 5 /nobreak >nul

:: 启动 Cloudflare 隧道并提取网址
echo [2/2] 正在生成公开网址...
echo.

:: 创建临时脚本提取隧道网址
set TMPLOG=%TEMP%\cf_tunnel_%RANDOM%.log

start "Cloudflare Tunnel" cmd /k "npx cloudflared tunnel --protocol http2 --url http://localhost:3000 2>&1 | tee "%TMPLOG%""

:: 等待隧道生成网址
echo 正在连接到 Cloudflare（约需 10 秒）...
timeout /t 12 /nobreak >nul

:: 从日志提取网址
for /f "tokens=*" %%i in ('findstr "trycloudflare.com" "%TMPLOG%" 2^>nul') do (
    set URLLINE=%%i
)

echo.
echo ============================================
echo  ✅ 启动成功！
echo.
echo  本地访问：  http://localhost:3000
echo.
echo  公开网址（任何设备可用）：
echo  请查看刚才弹出的「Cloudflare Tunnel」窗口
echo  找到包含 trycloudflare.com 的那行网址
echo ============================================
echo.
echo  关闭此窗口不会停止服务，关闭「NextJS Dev Server」
echo  和「Cloudflare Tunnel」窗口才会停止。
echo.
pause
