// import { cliOptions } from './cli';
// import { logger } from './logger';
import { ChainlinkBot } from './bot';

export class Main {
  private chainlinkBot: ChainlinkBot;

  constructor() {
    this.chainlinkBot = new ChainlinkBot();
  }

  async init(): Promise<void> {
    await this.chainlinkBot.initWizardInstances();
    this.chainlinkBot.bot.launch();
    process.once('SIGINT', () => this.chainlinkBot.bot.stop('SIGINT'));
    process.once('SIGTERM', () => this.chainlinkBot.bot.stop('SIGTERM'));
  }
}
