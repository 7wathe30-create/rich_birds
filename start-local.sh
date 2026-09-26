#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  printf '%s\n' 'Установите Node.js 22 LTS: https://nodejs.org/'
  exit 1
fi

node -e "const [a,b]=process.versions.node.split('.').map(Number);if(!(a>22 || a===22 && b>=13)){console.error('Требуется Node.js 22.13 или новее');process.exit(1)}"
printf '%s\n' 'Устанавливаю зависимости текущей версии…'
npm ci

printf '%s\n' 'Rich Birds: http://localhost:3000'
npm start
