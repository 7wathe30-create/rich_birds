# Запуск Rich Birds на своём компьютере

Нужен [Node.js 22 LTS](https://nodejs.org/). Не устанавливайте кошелёк, расширения браузера или RPC: текущая версия — локальный дизайн-прототип и не обращается к блокчейну.

## Windows

1. Скачайте проект с GitHub: https://github.com/7wathe30-create/rich_birds
2. Нажмите зелёную кнопку **Code** → **Download ZIP**, распакуйте ZIP в любую папку.
3. Установите Node.js 22 LTS с nodejs.org. После установки закройте и снова откройте PowerShell.
4. В распакованной папке дважды нажмите `ЗАПУСК-НА-WINDOWS.bat`. Браузер откроет `http://localhost:3000` автоматически.

В первый раз файл загрузит зависимости — для этого нужен интернет. Не закрывайте чёрное окно во время просмотра сайта. Остановка — `Ctrl+C` в этом окне.

### Вариант через PowerShell

Откройте PowerShell в папке, где хотите хранить проект, и выполните:

   ```powershell
   git clone https://github.com/7wathe30-create/rich_birds.git
   cd rich_birds
   npm ci
   npm start
   ```

Откройте в браузере: `http://localhost:3000`. Чтобы остановить сервер, вернитесь в PowerShell и нажмите `Ctrl+C`.

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
