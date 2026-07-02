@echo off
REM J.A.R.V.I.S. launcher for Windows.
REM Double-click (via the desktop shortcut) or run: launch.bat
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required to run JARVIS.
  echo Install it from https://nodejs.org and try again.
  pause
  exit /b 1
)

node scripts\launch.mjs
