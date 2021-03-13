# link-operator-telegram-bot

Telegram bot for Chainlink node operators to get information about active feeds.

## Build the image

I recommend to run the bot as container. Therefore a Dockerfile is included in this repo. Just head to the folder `docker` to check the file. The building process needs two build-args:

* USER_ID
* GROUP_ID

Since the bot needs an external settings file (see below) which needs to be mounted into the container (see docker-compose) the new user and group will be assigned to the same ids like your host-user/host-group. This prevents any file permission issues.

Build the image with the command: `docker build --build-arg USER_ID=$(id -u) --build-arg GROUP_ID=$(id -g) -t link-operator-telegram-bot:latest -f docker/Dockerfile .`

## Create a bot

You need to create a new bot on Telegram. The token you will receive is an necessary cli-argument. For further information how to create a bot head to [the official telegram descritopn](https://core.telegram.org/bots#:~:text=for%20existing%20ones.-,Creating%20a%20new%20bot,in%20contact%20details%20and%20elsewhere.)

## Docker-Compose

The compose file can be used as basis for your own setup. Depending on whether you want to connect to an own e.g. geth instance or to connect to infura you need to adapt the compose file accordingly.

The present config assumes that you are running a geth-instance as docker-container in the docker network `ETH-MAINNET`.

## Start the bot

To get information about necessary cli-arguments start the compose with `--help` or check the summary table below (*TODO*).
Furhtermore, the compose mounts a folder `resources` into the dist-folder within the container. The `resources` folder needs to have a file called `address_info.yml`. This file contains all you operator related addresses. You can find a template of this file within the `resources` folder in the repo.

### CLI arguments

* `--eligible-chats` if only one chat and this chat-id is negative number you need to use the long argument form in the form `--eligible-chats=-1234`
* same is true for multiple negative chat ids
* if multiple chat ids and you want to use `-e` or `--eligible-chats` without the equal sign, put the positive number in front
