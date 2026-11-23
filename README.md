# Telegram Booking Mini App

MVP интерфейса выбора даты и времени для Telegram Mini App на React + Vite.

## Локальный запуск

```bash
npm install
npm run dev
```

## Публикация на GitHub Pages

1. Откройте **Settings → Pages**.
2. В разделе **Build and deployment** выберите **GitHub Actions**.
3. Проверьте запуск workflow во вкладке **Actions** после push в `main`.
4. Приложение будет доступно по адресу https://funnyruler.github.io/tg-webapp-booking/.

## Демо-слоты

Занятые часы заданы в `src/App.jsx` в объекте `closedSlots`. Это только тестовые данные. Для реального бронирования сервер обязан повторно проверять доступность слота в момент подтверждения.

## Интеграция с Telegram

Страница подключает официальный Telegram Web Apps SDK с CDN.

- Без backend подтверждение через `Telegram.WebApp.sendData()` работает при запуске из обычной reply-клавиатуры Telegram с `web_app` кнопкой (`KeyboardButton`).
- Для запуска из inline-кнопки (`InlineKeyboardButton` с `web_app`) задайте `VITE_BOOKING_API_URL` и реализуйте POST endpoint. Приложение передаст JSON `{ "date": "YYYY-MM-DD", "time": "HH:MM" }` и заголовок `X-Telegram-Init-Data`.
- На backend обязательно валидируйте `initData` по правилам Telegram и перепроверяйте занятость слота. Не доверяйте данным клиента.

`VITE_BOOKING_API_URL` задаётся как переменная окружения при сборке Vite.
