# Используем официальный образ Node.js
FROM node:20-alpine

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package.json package-lock.json ./

# Устанавливаем все зависимости (включая devDependencies для сборки)
RUN npm ci

# Копируем исходный код
COPY . .

# Собираем проект (TypeScript -> JavaScript)
RUN npm run build

# Удаляем devDependencies после сборки (опционально, для уменьшения размера)
RUN npm prune --production

# Открываем порт
EXPOSE 3001

# Команда запуска
CMD ["npm", "start"]

