@echo off
:: Start the Tauri desktop app in dev mode.
:: Cargo must be in PATH — handled here automatically.

echo Starting MindfulPrompter (Tauri dev)...
cd /d %~dp0
set PATH=%PATH%;C:\Users\wmben\.cargo\bin
npm run tauri dev
