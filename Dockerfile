FROM node:16-alpine

RUN npm install -g pnpm@8.12

WORKDIR /app

ADD package.json .
ADD pnpm-lock.yaml .

RUN pnpm install

COPY . .

RUN pnpm build

CMD ["pnpm", "start"]

