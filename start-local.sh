#!/usr/bin/env sh
set -eu

if ! command -v node >/dev/null 2>&1; then
  printf '%s\n' 'Установите Node.js 22 LTS: https://nodejs.org/'
  exit 1
fi

if [ ! -d node_modules ]; then
  printf '%s\n' 'Устанавливаю зависимости…'
  npm ci
fi

printf '%s\n' 'Rich Birds: http://localhost:3000'
npm start
