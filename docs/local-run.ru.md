# Запуск Rich Birds на своём компьютере

Нужен [Node.js 22 LTS](https://nodejs.org/). Не устанавливайте кошелёк, расширения браузера или RPC: текущая версия — локальный дизайн-прототип и не обращается к блокчейну.

## Windows

1. Установите Node.js 22 LTS с nodejs.org. После установки закройте и снова откройте PowerShell.
2. Откройте PowerShell в папке, где хотите хранить проект, и выполните:

   ```powershell
   git clone https://github.com/7wathe30-create/rich_birds.git
   cd rich_birds
   npm ci
   npm start
   ```

3. Откройте в браузере: `http://localhost:3000`.
4. Чтобы остановить сервер, вернитесь в PowerShell и нажмите `Ctrl+C`.

Если Windows сообщает, что `git` не найден, установите Git for Windows с https://git-scm.com/download/win, закройте PowerShell и повторите команды. Если `npm ci` сообщает о несовместимой версии Node, проверьте `node --version`: должно быть `v22.x`.

## macOS

В Terminal выполните:

```sh
git clone https://github.com/7wathe30-create/rich_birds.git
cd rich_birds
npm ci
npm start
```

Откройте `http://localhost:3000`, а для остановки нажмите `Control+C` в Terminal.

## Проверка перед запуском

```sh
npm test
npm run build
```

Все данные профиля, выбранный аватар и демо-земли сохраняются только в браузере этого компьютера (`localStorage`). Их можно удалить настройками сайта браузера для `localhost`.
