FROM node:16-alpine as builder


WORKDIR /app
RUN mkdir -p apps/api apps/client libs/api-interface
COPY package.json yarn.lock /app/
COPY apps/api/package.json /app/apps/api/
COPY apps/client/package.json /app/apps/client/
COPY apps/socket/package.json /app/apps/socket/
COPY libs/api-interface/package.json /app/libs/api-interface/
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn api prisma generate
RUN yarn api prisma migrate dev
RUN yarn build

FROM node:16-alpine

RUN yarn global add concurrently env-cmd prisma pm2

WORKDIR /app
RUN mkdir -p apps/api apps/client apps/socket libs/api-interface
COPY package.json yarn.lock /app/
COPY apps/api/package.json /app/apps/api/
COPY apps/client/package.json /app/apps/client/
COPY apps/socket/package.json /app/apps/socket/
COPY libs/api-interface/package.json /app/libs/api-interface/
RUN yarn install --frozen-lockfile --production

# RUN apk add python3
COPY apps/api/prisma/schema.prisma /app/apps/api/prisma/schema.prisma
RUN prisma generate --schema /app/apps/api/prisma/schema.prisma

COPY --from=builder /app/libs/api-interface/dist/ /app/libs/api-interface/dist/

COPY --from=builder /app/apps/socket/dist/. /app/apps/socket/.

COPY --from=builder /app/apps/api/dist/src/. /app/apps/api/.
COPY --from=builder /app/apps/api/dist/prisma /app/apps/api/prisma

COPY --from=builder /app/apps/client/.next/standalone/apps/client/. /app/apps/client/.
COPY --from=builder /app/apps/client/.next/static/. /app/apps/client/.next/static/.
COPY --from=builder /app/apps/client/public/. /app/apps/client/public/.

COPY libs/api-interface/index.ts /app/apps/client/public/api-interface.ts

EXPOSE 3000
EXPOSE 4000
EXPOSE 4001

ENV NODE_ENV=production

CMD ["concurrently", "pm2-runtime -i max apps/api/main.js --name api","node apps/socket/main.js", "node apps/client/server.js"]
# CMD ["concurrently", "node apps/api/main.js","node apps/socket/main.js", "node apps/client/server.js"]
# CMD ["concurrently", "pm2-runtime -i max apps/api/main.js --name api", "node apps/client/server.js"]
# CMD ["python3", "-m", "http.server", "3000", "-d", "/app/"]