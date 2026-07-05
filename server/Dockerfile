FROM node:20-alpine
WORKDIR /app
# 先装依赖（利用层缓存）
COPY server/package*.json ./server/
RUN cd server && npm install --omit=dev --no-audit --no-fund
# 拷贝后端源码与前端静态资源
COPY server ./server
COPY cc ./cc
WORKDIR /app/server
EXPOSE 8080
CMD ["node", "src/index.js"]
