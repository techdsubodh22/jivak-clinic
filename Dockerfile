FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY . .

# Data directory for the SQLite db file
RUN mkdir -p /data

ENV PORT=3000
ENV DB_PATH=/data/clinic.db

EXPOSE 3000

CMD ["node", "server.js"]