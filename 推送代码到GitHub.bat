@echo off
chcp 65001 >nul
title GitHub Push Tool

cd /d "%~dp0"

echo ========================================================
echo        Instagram + TikTok Monitor App - GitHub Push
echo ========================================================
echo.

echo [1/3] Git 配置检查与优化...
"C:\Users\nijiaqian\AppData\Local\Programs\Git\cmd\git.exe" config credential.helper manager

echo [2/3] 正在暂存所有最新代码...
"C:\Users\nijiaqian\AppData\Local\Programs\Git\cmd\git.exe" add .

echo [3/3] 正在推送到 GitHub 远程仓库 (origin main)...
echo * 如果弹出 GitHub 登录/授权窗口，请点击授权 (Sign in with your browser)...
echo.
"C:\Users\nijiaqian\AppData\Local\Programs\Git\cmd\git.exe" push origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================================
    echo  [成功] 代码已成功推送到 GitHub!
    echo ========================================================
) else (
    echo.
    echo ========================================================
    echo  [提示] 推送遇到问题，请检查网络或 GitHub 登录授权状态。
    echo ========================================================
)

echo.
pause
