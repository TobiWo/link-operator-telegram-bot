# link-operator-telegram-bot

Telegram bot for Chainlink node operators to get information about active feeds. After you configured your bot correctly and everything is running you can start to interact with the bot with keyword **link** (not /link, just link).

**Note:** Currently this bot is not a general available Telegram bot. This means every node operator needs to deploy one instance of the bot/container (guidance below) on their own.

## Features

Currently the bot is for getting various information about rewards. These are:

- replying with the total available rewards on flux and ocr-contract as well as the ocr-payee address
- replying with the current average feed reward for flux and ocr
- replying if Chainlink alters rewards on flux or ocr (listening on flux and/or ocr)

Furthermore you can add the bot to various chat groups of course. The bot is then accessible only in the defined groups.

## Caveat

In it's current version the bot has some shortcomings. No need to say, I have a long list with improvements :). However the functionality works so my idea was to improve it over time.

### Major shortcomings

1. You cannot deploy the bot behind a proxy
2. Webhooks are not possible yet
3. The listener which notifies you for changes of feed rewards currenlty only works in one chat group (where it got activated)
4. The bot is stateless. If it crashes or you make an update and redeploy it, the listener will be deactivated and need to be activated again
5. Since there is a rate limit for max. replies per second given by the Telegram servers it is possible that the listener will miss to inform you about a reward change when to many changes arrive in one second.
6. OCR reward calculation includes gas usage. This is pretty constant over time and varies only a little. Therefore the gas usage is not fetched from the blockchain yet but is hard-coded.
7. After adding new feeds to the config file (see below) a restart is necessary (will be one of the first improvements)
8. Logging and error handling is currently pretty rudimentary.
9. No unit tests are yet implemented

## Setup

### Build the image

I recommend to run the bot as container. Therefore a Dockerfile is included in this repo. Just head to the folder `docker` to check the file. The building process needs two build-args:

- USER_ID
- GROUP_ID

Since the bot needs an external settings file (see below), which needs to be mounted into the container (see docker-compose) the new user and group will be assigned to the same ids like your host-user/host-group (no root within container). This prevents any file permission issues.

Build the image from the repos root directory with the command: `docker build --build-arg USER_ID=$(id -u) --build-arg GROUP_ID=$(id -g) -t link-operator-telegram-bot:0.1.0 -f docker/Dockerfile .`

### Prepare the config file

The config file in this case is a simple yaml which only holds all relevant feed/contract information. You can find a template in `resources/external`.

The final address file needs to be named **address_info.yml** (even file ending .yaml isn't accepted) and needs to be stored in the directory where the template resides (path and name are currently hard-coded).

As you run the bot as container it needs to be mounted into the container into location `/home/bot/dist/resources/external` (see example docker-compose).

### Start the bot (container)

I personally prefer docker-compose over docker run. You can find an example compose in the `docker` folder of the repos root directory.

This compose relies on a external docker network where a geth client is already running on.

#### Help

To get information about necessary cli-arguments start the compose with `--help`, use `docker run --rm -it link-operator-telegram-bot:0.1.0 --help` or check the cli-command table below.

### Connect to Ethereum blockchain

Currently you have three supported ways to connect to mainnet:

1. via Infura using infura project id and infura secret
2. via http/https
3. via ws/wss

### Create a Telegram-bot

In order to use the container you need to start it with a bot-token you received while you created a telegram bot with the help of Telegrams **BotFather**. I think BotFather is pretty self-explanatory however you can also follow the [the official telegram documentation](https://core.telegram.org/bots#:~:text=for%20existing%20ones.-,Creating%20a%20new%20bot,in%20contact%20details%20and%20elsewhere.).

Before the container-start you also need to get the chat-ids which should be allowed to interact with the bot. Also all data is publicly availabe on the blockchain it shouldn't be that easy to get those information :P. The recommended way to interact with the link-bot is via groups. To get the chat-id follow this workflow:

1. Create your group(s)
2. Add the bot you created with the help of **BotFather**
3. Give the bot administrative rights (necessary because the bot can only listen to chat-messages as admin)
4. Add the bot called **@RawDataBot**
5. After adding this bot, it will immediately print a lot of information inclusive the chat-id. That's the information you want. This will be put into flag `--eligigble-chats` (some example output for **@RawDataBot** can be found [here](https://stackoverflow.com/a/46247058/4030166))
6. Delete **@RawDataBot** from group

**Note:** If you remove your link-bot from the chat and add it again, the chat-id might have changed.

### CLI arguments

|flag (long)|flag (short)|Description|
|---|---|---|
|`--bot-token`|`-b`|Token you received from **BotFather** while creating a Telegram bot|
|`--eligible-chats`|`-e`|Comma separated string which hold chats which are elligible to interact with the bot|
|`--infura-project-id`|`-i`|Infura project id (will be ignored if url is set)|
|`--infura-project-secret`|`-j`|Infura project secret (will be ignored if url is set)|
|`--url`|`-u`|Url of a running Ethereum client with activated RPC APIs (optional)|
|`--help`|`-h`|Prints help to console|

## Updating feeds

Updating is pretty simple. Just add new or delete old feeds from `address_config.yml` and restart the container/bot.

I know this is one big shortcoming which I will work on as first improvement.

## Donations/Contributions

This project was built independently from my employer. Therefore I really appreciate any collaborative work and/or help from the community.

You can also donate if you like. This definitely helps the project as well. Please use the following address for donations: `0x5a7F786815C03b45DC4341baE97fD4D9D6E70320` (ETH or ERC-20).

## Outlook

As you read and experienced while setting the bot up, the bot needs to be deployed by every operator itself. However, in the future it could be also possible to create a general available bot-instance. For now the further development concentrates on code and logic improvements, quality of life improvements and probably also new features.
