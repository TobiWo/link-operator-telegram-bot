FROM node:14.15.4-buster
LABEL Maintainer=TobiWo

ARG GITHUB_USER
ARG GITHUB_TOKEN
ARG USER_ID
ARG GROUP_ID

RUN groupadd --gid $GROUP_ID bot \
    && useradd --no-log-init --create-home --gid $USER_ID bot

USER bot

WORKDIR /home/bot

RUN git clone https://${GITHUB_USER}:${GITHUB_TOKEN}@github.com/TobiWo/link-operator-telegram-bot.git \
    && cd link-operator-telegram-bot \
    && git checkout feature/add-basic-bot-functionality \
    && npm install --only=prod \
    && npm run-script build

WORKDIR /home/bot/link-operator-telegram-bot

ENTRYPOINT [ "node", "dist/src/main.js" ]
