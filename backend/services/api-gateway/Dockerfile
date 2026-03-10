FROM node:20-alpine
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN chown -R appuser:appgroup /app
USER appuser
EXPOSE 8000
CMD ["node", "server.js"]
