FROM oven/bun:1

WORKDIR /usr/src/app

COPY bun.lock ./
COPY package.json ./

RUN bun install --frozen-lockfile --production

COPY assets ./assets
COPY src ./src
COPY tsconfig.json ./

EXPOSE 3000

CMD ["bun", "src/api-node.ts"]
