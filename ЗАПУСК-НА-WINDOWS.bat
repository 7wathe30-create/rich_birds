@echo off
setlocal
title Rich Birds - local prototype

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js ne ustanovlen.
  echo Ustanovite Node.js 22 LTS s https://nodejs.org/
  echo Posle ustanovki zakroyte eto okno i zapustite fail snova.
  start "" https://nodejs.org/
  pause
  exit /b 1
)

if not exist node_modules (
  echo Ustanavlivayu zavisimosti. Eto nuzhno tolko pri pervom zapuske...
  call npm ci
  if errorlevel 1 (
    echo.
    echo Ustanovka ne udalas. Proverte podklyuchenie k internetu i zapustite fail snova.
    pause
    exit /b 1
  )
)

echo.
echo Rich Birds zapushchen: http://localhost:3000
echo Ne zakryvayte eto okno, poka prosmatrivaete proekt.
start "" http://localhost:3000
call npm start
pause
