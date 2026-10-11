# MOTOR YEREVAN — Event Venue Landing & Analytics Admin

Официальный одностраничный лендинг для евентовой площадки **MOTOR YEREVAN** (Ереван, Армения) с интеграцией билетных партнеров, интерактивной картой и панелью администратора для динамического управления трекинговыми пикселями (Google Analytics, Meta Pixel, Яндекс Метрика, TikTok Pixel и произвольные HTML/JS коды).

---

## ⚡ Ближайшее мероприятие
- **Название:** `ISHOME Live in Yerevan 24 oct | TICKETS`
- **Организаторы:** 140 crew × PROUN
- **Дата и время:** Суббота, 24 октября, 17:00 (Day-time gathering)
- **Хедлайнер:** ISHOME live (Mirabella Karyanova / Shadowax / Mutabor / Berghain / «трип»)
- **Саппорт:** SHHAU, VAZGEN live, YCROW, ANGELIC WAVES live
- **Цены:** 1-я волна — 4 000 AMD, 2-я волна — 6 000 AMD, На входе — 8 000 AMD

---

## 🎟️ Билетные партнеры (из Linktree https://tr.ee/gIYGRcNOFH)
1. **Frisson Events:** [https://frisson.events/events/1otiK6-ishome-live-in-yerevan](https://frisson.events/events/1otiK6-ishome-live-in-yerevan)
2. **Esora:** [https://esora.app/ru/events/140-crew-proun-081bda9e](https://esora.app/ru/events/140-crew-proun-081bda9e)
3. **Show4me:** [https://show4me.com/events/event-1791632744](https://show4me.com/events/event-1791632744)

---

## 📍 Локация и адрес
- **Площадка:** MOTOR YEREVAN
- **Адрес:** 28 Marksi poxoc, Yerevan 0018, Armenia (улица Мовсеса Хоренаци / Маркса)
- **Координаты:** 40.171255, 44.511984 (Plus Code: `5GC6+Q8`)
- На сайте встроена интерактивная карта, кнопки копирования адреса в один клик и ссылки на построение маршрута в Google Maps и Яндекс Навигаторе.

---

## ⚙️ Панель администратора (`/admin`)
- **Ссылка:** `http://localhost:3000/admin` (или `ваш-домен.com/admin`)
- **Пароль по умолчанию:** `admin` (настраивается переменной окружения `ADMIN_PIN`)
- **Функционал добавления пикселей:**
  - Кнопка **`+ ДОБАВИТЬ ПИКСЕЛЬ`** позволяет добавлять неограниченное количество систем трекинга.
  - Готовые пресеты:
    - **Meta Pixel (Facebook & Instagram Ads):** автоматическая генерация полного `fbq` кода по номеру пикселя.
    - **Google Analytics 4 (GA4):** автоматическая генерация `gtag.js` по Measurement ID `G-XXXXXXXXXX`.
    - **Google Tag Manager (GTM):** генерация контейнера `GTM-XXXXXXX`.
    - **Яндекс Метрика:** код счетчика с Вебвизором по номеру счетчика.
    - **TikTok Pixel:** код по Pixel ID.
    - **Произвольный код:** любой HTML / JavaScript / `<noscript>` / `<img src="...">`.
  - Выбор позиции вставки: `<head>` или `<body>`.
  - Моментальное включение/выключение без перезапуска сервера через переключатель (Toggle Switch).
  - Вкладка **"Инспекция внедрения"** для предварительного просмотра сгенерированных блоков `<head>` и `<body>`.

---

## 🚀 Запуск и разработка

```bash
# 1. Установка зависимостей
npm install

# 2. Запуск сервера
npm start

# Страница откроется на:
# Лендинг: http://localhost:3000
# Админка: http://localhost:3000/admin
```

Для запуска в режиме отслеживания изменений (hot reload):
```bash
npm run dev
```

---

## 📁 Структура проекта
```
Site/
├── data/
│   ├── event.json         # Настройки события, цен, партнеров и адреса
│   └── pixels.json        # База данных подключенных пикселей и скриптов
├── public/
│   ├── admin/
│   │   ├── admin.css      # Стили админ-панели
│   │   ├── admin.js       # Логика CRUD, фильтры и пресеты
│   │   └── index.html     # Дашборд администратора
│   ├── css/
│   │   └── style.css      # Индустриальные адаптивные стили лендинга
│   ├── js/
│   │   └── main.js        # Таймер обратного отсчета, бургер-меню, копирование
│   └── index.html         # Шаблон главной страницы с динамическим инжектором
├── server.js              # Сервер Express с REST API и динамическим инжектором пикселей
└── package.json           # Зависимости и скрипты
```
