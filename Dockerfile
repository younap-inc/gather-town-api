# 依存パッケージのインストール
FROM node:16.10.0 as deps
WORKDIR /app
# packeg.jsonとpackage-lock.jsonのみコピーする
COPY package.json yarn.lock ./
RUN yarn install

# Build環境
FROM node:16.10.0 as builder
WORKDIR /app
COPY . .
# depsステージでインストールしたパッケージをコピーする
COPY --from=deps /app/node_modules ./node_modules
RUN yarn run build

# 実行環境
FROM node:16.10.0
WORKDIR /app
ENV NODE_ENV production
# buildによって.next配下に生成されたhtml、JSON、JSファイルをコピーする
COPY --from=builder /app/package.json ./yarn.lock
EXPOSE 8080
ENV PORT 8080
CMD [ "PORT=8080","yarn", "start" ]
