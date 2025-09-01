# Production image (small, runs prestart -> generates OpenAPI spec automatically)
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm install --production
COPY . .
EXPOSE 3000
# Use npm start so prestart script regenerates spec inside container
CMD ["npm", "start"]

# To develop with live reload, use docker-compose with a bind mount and override command to "npm run dev".
