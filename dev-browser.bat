@echo off
:: Start Next.js dev server and open Chrome for browser testing.
:: Service worker skips caching on localhost, so no manual unregister needed.

echo Starting Next.js dev server...
start "MindfulPrompter Dev" cmd /k "cd /d %~dp0 && npm run dev"

:: Wait a few seconds for the server to be ready
timeout /t 4 /nobreak >nul

echo Opening Chrome...
start "" "chrome.exe" "http://localhost:3000"
