FROM node:14.15.4-buster
LABEL Maintainer=TobiWo

ARG USER_ID
ARG GROUP_ID

RUN groupadd --gid $GROUP_ID bot \
    && useradd --no-log-init --create-home --gid $USER_ID bot

USER bot

WORKDIR /home/bot

COPY . .

RUN npm install --only=prod \
    && npm run-script build

ENTRYPOINT [ "node", "dist/src/main.js" ]
