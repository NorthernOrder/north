FROM node:20-alpine

RUN npm install -g pnpm@9.2

WORKDIR /app

COPY package.json .
COPY pnpm-lock.yaml .

RUN pnpm install

COPY . .

RUN pnpm build

CMD ["pnpm", "start"]
