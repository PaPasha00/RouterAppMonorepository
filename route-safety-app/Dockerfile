# Dockerfile для Railway
# Работает когда Root Directory установлен в route-safety-app
# Build context: route-safety-app/

FROM node:20-alpine

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json из be/
# Относительно build context (route-safety-app/)
COPY be/package.json ./
COPY be/package-lock.json* ./

# Устанавливаем все зависимости (включая devDependencies для сборки)
RUN npm install

# Копируем весь исходный код из be/
COPY be/ ./

# Собираем проект (TypeScript -> JavaScript)
RUN npm run build

# Удаляем devDependencies после сборки
RUN npm prune --production

# Открываем порт
EXPOSE 3001

# Команда запуска
CMD ["npm", "start"]

