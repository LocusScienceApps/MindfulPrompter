@echo off
:: Start Next.js dev server and open Chrome for browser testing.
:: Kills all previous instances before starting fresh.

echo Cleaning up previous instances...
taskkill /FI "WINDOWTITLE eq MindfulPrompter Dev" /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 "') do (
    taskkill /PID %%a /F >nul 2>&1
)

echo Starting Next.js dev server...
start "MindfulPrompter Dev" cmd /k "cd /d %~dp0 && npm run dev"

:: Wait a few seconds for the server to be ready
timeout /t 4 /nobreak >nul

echo Opening Chrome...
start "" "chrome.exe" "http://localhost:3000"
