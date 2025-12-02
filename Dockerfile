# --- Stage 1 --- Build Stage
FROM node:22.19.0 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# --- Stage 2 --- Production Stage 
FROM node:22.19.0
WORKDIR /app
ARG BUILD_EPOCH
ENV BUILD_EPOCH=$BUILD_EPOCH
COPY --from=builder /app /app
EXPOSE 9009
CMD ["node", "./src/index.js"]
