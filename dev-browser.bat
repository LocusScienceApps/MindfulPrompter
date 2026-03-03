@echo off
:: Start Next.js dev server and open Chrome for browser testing.
:: Kills any process on port 3000 first, then starts fresh.

echo Checking for processes on port 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 "') do (
    echo Killing PID %%a...
    taskkill /PID %%a /F >nul 2>&1
)

echo Starting Next.js dev server...
start "MindfulPrompter Dev" cmd /k "cd /d %~dp0 && npm run dev"

:: Wait a few seconds for the server to be ready
timeout /t 4 /nobreak >nul

echo Opening Chrome...
start "" "chrome.exe" "http://localhost:3000"
