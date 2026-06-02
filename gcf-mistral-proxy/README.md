# Прокси-сервер для Mistral Realtime API на Google Cloud Functions

Этот каталог содержит код для развертывания легковесного прокси-сервера в Google Cloud Functions (2nd Gen), который перенаправляет трафик WebSocket к Mistral Realtime API.

## Почему это необходимо?
Браузерные WebSocket-соединения не позволяют передавать кастомные заголовки (такие как `Authorization: Bearer <API_KEY>`) во время первоначального рукопожатия (handshake). Mistral API не принимает API-ключи через URL-параметры в целях безопасности. Данная функция выступает шлюзом: клиент подключается к ней, а функция устанавливает безопасное WebSocket-соединение с Mistral, добавляя необходимый заголовок авторизации.

---

## Способ 1: Развертывание через Google Cloud Console (в браузере)

1. Откройте консоль [Google Cloud Console](https://console.cloud.google.com/).
2. Перейдите в раздел **Cloud Functions** (Облачные функции) и нажмите **Create Function** (Создать функцию).
3. В разделе **Basics** (Основные настройки) выберите:
   - **Environment**: 2nd gen (второе поколение — важно для поддержки WebSockets).
   - **Function name**: `mistral-realtime-proxy` (или любое другое имя).
   - **Region**: Выберите ближайший к вам регион (например, `europe-west3` или `us-central1`).
   - **Trigger**: HTTP.
   - Отметьте опцию **Allow unauthenticated invocations** (Разрешить неавторизованные вызовы), чтобы ваше PWA-приложение на смартфоне могло подключаться к функции.
4. Нажмите **Next** (Далее), чтобы перейти на шаг настройки кода.
5. Выберите **Runtime**: `Node.js 20` (или `Node.js 18`).
6. В разделе **Source code** выберите **Inline Editor** (Встроенный редактор):
   - В файл `index.js` скопируйте содержимое файла `index.js` из этой папки.
   - В файл `package.json` скопируйте содержимое файла `package.json` из этой папки.
   - Укажите **Entry point** (Точка входа): `mistralProxy`.
7. (Опционально) Если вы хотите, чтобы API-ключ Mistral был захардкожен на сервере и не передавался со смартфона, разверните вкладку **Runtime, Build, Connections and Security Settings** в самом низу первого шага настройки, найдите раздел **Environment variables** (Переменные окружения) и добавьте:
   - Имя: `MISTRAL_API_KEY`
   - Значение: `ВАШ_API_КЛЮЧ_MISTRAL`
   *(Если переменная не задана, прокси будет ожидать ключ от клиента в параметре `?api_key=...`)*.
8. Нажмите **Deploy** (Развернуть). Развертывание займет около 1–2 минут.
9. После завершения скопируйте полученный **Trigger URL** функции. Он будет выглядеть примерно так:
   `https://mistral-realtime-proxy-xxxxxx-xx.a.run.app`

---

## Способ 2: Развертывание через консоль gcloud CLI

Если у вас установлен [Google Cloud SDK (gcloud CLI)](https://cloud.google.com/sdk/docs/install), вы можете развернуть функцию одной командой из этого каталога.

1. Авторизуйтесь в Google Cloud:
   ```bash
   gcloud auth login
   ```
2. Выберите ваш проект GCP:
   ```bash
   gcloud config set project ID_ВАШЕГО_ПРОЕКТА
   ```
3. Выполните команду развертывания (из папки `gcf-mistral-proxy`):
   ```bash
   gcloud functions deploy mistral-realtime-proxy \
     --gen2 \
     --runtime=nodejs20 \
     --region=europe-west3 \
     --trigger-http \
     --allow-unauthenticated \
     --entry-point=mistralProxy
   ```
   Если вы хотите задать API-ключ на сервере, добавьте флаг переменной окружения:
   ```bash
   --set-env-vars MISTRAL_API_KEY=ВАШ_API_КЛЮЧ_MISTRAL
   ```

4. После развертывания команда выведет URL в строке `uri: https://...`

---

## Как использовать этот URL в приложении TalkFlow

Когда вы развернете функцию, скопируйте полученный HTTPS URL, измените протокол с `https://` на `wss://` и вставьте его в настройки TalkFlow (в будущих коммитах мы сделаем поддержку настройки прокси-сервера прямо из интерфейса приложения, либо вы можете обновить константы в `mistralRealtimeService.ts`).

Пример ссылки для подключения:
`wss://mistral-realtime-proxy-xxxxxx-xx.a.run.app/?model=voxtral-mini-transcribe-realtime-2602&api_key=ваш_api_ключ_mistral`
