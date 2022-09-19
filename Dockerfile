FROM node:16-alpine

RUN npm install -g pnpm

WORKDIR /app

ADD package.json .
ADD pnpm-lock.yaml .
ADD prisma .

RUN pnpm install

ADD . .

RUN pnpm build

CMD ["pnpm", "start"]

