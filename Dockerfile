# 依存パッケージのインストール
FROM node:16.10.0 as deps
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install

# Build環境
FROM node:16.10.0 as builder
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN yarn run build

# 実行環境
FROM node:16.10.0
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/package.json /app/yarn.lock ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 8080
ENV PORT 8080
CMD ["yarn", "start"]
