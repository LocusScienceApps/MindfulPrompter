@echo off
:: Start the Tauri desktop app in dev mode.
:: Kills all previous instances before starting fresh.

echo Cleaning up previous instances...
taskkill /FI "WINDOWTITLE eq MindfulPrompter Tauri Dev" /F >nul 2>&1
taskkill /IM "MindfulPrompter.exe" /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 "') do (
    taskkill /PID %%a /F >nul 2>&1
)

echo Starting MindfulPrompter (Tauri dev)...
start "MindfulPrompter Tauri Dev" cmd /k "cd /d %~dp0 && set PATH=%PATH%;%USERPROFILE%\.cargo\bin && npm run tauri dev"
