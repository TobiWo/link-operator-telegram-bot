import { Telegraf, Scenes } from 'telegraf';
import ChainlinkBot from './bot';
// import { cliOptions } from './cli';
// import { logger } from './logger';

export class Server {
  private chainlinkBot: Telegraf<Scenes.WizardContext>;

  constructor() {
    this.chainlinkBot = ChainlinkBot.bot;
  }

  async init(): Promise<void> {
    this.chainlinkBot.launch();
    process.once('SIGINT', () => this.chainlinkBot.stop('SIGINT'));
    process.once('SIGTERM', () => this.chainlinkBot.stop('SIGTERM'));
  }
}
