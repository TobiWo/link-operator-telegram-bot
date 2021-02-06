# link-operator-telegram-bot

Telegram bot for Chainlink node operators to get information about active feeds.

## Build the image

I recommend to run the bot as container. Therefore a Dockerfile is included in this repo. Just head to the folder `docker`. The building process needs two build-args:

* USER_ID
* GROUP_ID

This is because the container does not run as root and to prevent file access issues the user-id and group-id for the user of the container are assigned to the actual host user ids.

## Create a bot

You need to create a new bot on Telegram. The token you will receive is an necessary cli-argument. For further information how to create a bot head to [the official telegram descritopn](https://core.telegram.org/bots#:~:text=for%20existing%20ones.-,Creating%20a%20new%20bot,in%20contact%20details%20and%20elsewhere.)

## Docker-Compose

The compose file can be used as basis for your own setup. Depending on whether you want to connect to an own e.g. geth instance or to connect to infura you need to adapt the compose file accordingly.

The present config assumes that you are running a geth-instance as docker-container in the docker network `ETH-MAINNET`.

## Start the bot

To get information about necessary cli-arguments start the compose with `--help` or check the summary table below (*TODO*).
