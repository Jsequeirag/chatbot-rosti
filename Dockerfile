# Image size ~ 400MB
FROM node:21-alpine3.18 as builder

WORKDIR /chatbot-rosti

RUN corepack enable && corepack prepare pnpm@latest --activate
ENV PNPM_HOME=/usr/local/bin

COPY . .

COPY package*.json *-lock.yaml ./

RUN apk add --no-cache --virtual .gyp \
        python3 \
        make \
        g++ \
    && apk add --no-cache git \
    && pnpm install \
    && apk del .gyp

FROM node:21-alpine3.18 as deploy

WORKDIR /chatbot-rosti

ARG PORT
ENV PORT $PORT
EXPOSE $PORT

COPY --from=builder /chatbot-rosti/assets ./assets
COPY --from=builder /chatbot-rosti/dist ./dist
COPY --from=builder /chatbot-rosti/*.json /chatbot-rosti/*-lock.yaml ./

RUN corepack enable && corepack prepare pnpm@latest --activate 
ENV PNPM_HOME=/usr/local/bin

RUN npm cache clean --force && pnpm install --production --ignore-scripts \
    && addgroup -g 1001 -S nodejs && adduser -S -u 1001 nodejs \
    && rm -rf $PNPM_HOME/.npm $PNPM_HOME/.node-gyp

CMD ["npm", "start"]