// import { cliOptions } from './cli';
import { ChainlinkBot } from './bot';
import { logger } from './logger';

export class Main {
  private chainlinkBot: ChainlinkBot;

  constructor() {
    this.chainlinkBot = new ChainlinkBot();
  }

  async init(): Promise<void> {
    await this.chainlinkBot.initWizardInstances();
    this.chainlinkBot.bot.launch();
    logger.info('Launched link-operator-telegram-bot');
    process.once('SIGINT', () => this.chainlinkBot.bot.stop('SIGINT'));
    process.once('SIGTERM', () => this.chainlinkBot.bot.stop('SIGTERM'));
  }
}
