# Stage 1: Build backend and frontend
FROM node:20-alpine AS build

WORKDIR /app

# Root
COPY package*.json ./
RUN npm install

# Backend
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install
COPY backend ./
RUN npm run build

# Frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend ./
RUN npm run build

# Stage 2: Production image
FROM node:20-alpine AS production

WORKDIR /app

COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/backend ./backend
COPY --from=build /app/frontend ./frontend

EXPOSE 5000 5173

ENV NODE_ENV=production

CMD ["npm", "run", "start"]

