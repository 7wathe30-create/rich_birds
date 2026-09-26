@echo off
setlocal
title Rich Birds - local prototype
cd /d "%~dp0"

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

node -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22 || a===22 && b>=13 ? 0 : 1)"
if errorlevel 1 (
  echo Trebuetsya Node.js 22.13 ili novee. https://nodejs.org/
  pause
  exit /b 1
)

echo Ustanavlivayu zavisimosti tekuschey versii...
  call npm ci
  if errorlevel 1 (
    echo.
    echo Ustanovka ne udalas. Proverte podklyuchenie k internetu i zapustite fail snova.
    pause
    exit /b 1
  )

echo.
echo Posle nadpisi Rich Birds listening otkroyte http://localhost:3000
echo Ne zakryvayte eto okno, poka prosmatrivaete proekt.
call npm start
pause
