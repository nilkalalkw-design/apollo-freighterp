FROM node:20-alpine

WORKDIR /app

COPY server/package*.json ./
RUN npm install --omit=dev

COPY server/src ./src
COPY server/sql ./sql
COPY web ./web

ENV NODE_ENV=production
EXPOSE 4000

CMD ["npm", "start"]
