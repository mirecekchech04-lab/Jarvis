@echo off
setlocal
title J.A.R.V.I.S.
cd /d "%~dp0"

echo(
echo   ============================================
echo       J.A.R.V.I.S.  -  starting up...
echo   ============================================
echo(

rem --- 1. Make sure Node.js is installed --------------------------------
where node >nul 2>nul
if errorlevel 1 (
  echo   [!] Node.js was not found on this computer.
  echo       JARVIS needs Node.js ^(version 18 or newer^) to run.
  echo(
  echo       Opening the Node.js download page for you...
  start "" https://nodejs.org/en/download
  echo(
  echo   After installing Node.js, close this window and double-click JARVIS again.
  echo(
  pause
  exit /b 1
)

rem --- 2. Install components the FIRST time only ------------------------
if not exist "node_modules" (
  echo   First run detected - installing components. This happens only once
  echo   and may take a minute...
  echo(
  call npm install
  if errorlevel 1 (
    echo(
    echo   [!] Something went wrong while installing components.
    echo       Please check your internet connection and try again.
    echo(
    pause
    exit /b 1
  )
  echo(
  echo   Components installed.
  echo(
)

rem --- 3. Open the interface in the browser once the server is up -------
echo   Opening the JARVIS interface in your browser...
start "" /min cmd /c "timeout /t 2 /nobreak >nul & explorer http://localhost:3000"

rem --- 4. Start JARVIS -------------------------------------------------
echo(
echo   JARVIS is now running.
echo   Keep this window open while you use it - close it to shut JARVIS down.
echo(
node server.js

echo(
echo   JARVIS has stopped.
pause
endlocal
