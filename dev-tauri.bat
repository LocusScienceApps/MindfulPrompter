@echo off
:: Start the Tauri desktop app in dev mode.
:: Kills any process on port 3000 first, then starts fresh.

echo Checking for processes on port 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 "') do (
    echo Killing PID %%a...
    taskkill /PID %%a /F >nul 2>&1
)

echo Starting MindfulPrompter (Tauri dev)...
start "MindfulPrompter Tauri Dev" cmd /k "cd /d %~dp0 && set PATH=%PATH%;%USERPROFILE%\.cargo\bin && npm run tauri dev"
