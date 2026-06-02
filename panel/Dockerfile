FROM node:18-alpine

RUN apk add --no-cache android-tools curl

WORKDIR /app
COPY package.json ./
RUN npm install --production

COPY server.js ./
COPY public ./public

RUN mkdir -p /apks /tmp/uploads

EXPOSE 8233
CMD ["node", "server.js"]
