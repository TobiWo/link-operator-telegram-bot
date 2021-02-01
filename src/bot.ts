import * as settings from '../settings.json';
import { Telegraf, Scenes, session, Markup } from 'telegraf';
import RewardBalanceWizard from './modules/reward/contractRewardWizard';
import RewardBalanceWizardNew from './bot/contractRewardWizard2';

// import { HttpsProxyAgent } from 'https-proxy-agent';

const MODULE1: string = '💰 Current total rewards';
const MODULE2: string = '🦻 Listen to reward changes';

class ChainlinkBot {
  bot: Telegraf<Scenes.WizardContext>;

  constructor() {
    this.bot = new Telegraf<Scenes.WizardContext>(settings.token);
    this.setupBot();
  }

  private setupBot() {
    const stage = new Scenes.Stage<Scenes.WizardContext>([RewardBalanceWizard, RewardBalanceWizardNew]);
    this.bot.use(session());
    this.bot.use(stage.middleware());

    this.bot.help((ctx) =>
      ctx.replyWithMarkdownV2(
        'This bot is segmented into several modules with certain funtionalities\\. Type `link` to start the bot\\.'
      )
    );

    this.bot.hears('link', async (ctx) => {
      await ctx.replyWithMarkdownV2(
        '*Choose your module*',
        Markup.keyboard([[MODULE1, MODULE2]])
          .oneTime()
          .resize()
      );
    });
    this.bot.hears(MODULE1, (ctx) => {
      ctx.scene.enter('reward-wizard');
      ctx.replyWithMarkdownV2('*Entering reward fetcher module\\!*\nType `/help` for all available commands');
    });
    this.bot.hears(MODULE2, (ctx) => {
      ctx.scene.enter('reward-wizard2');
      ctx.replyWithMarkdownV2('*Entering another module\\!*\nType `/help` for all available commands');
    });
  }
}

const chainlinkBot = new ChainlinkBot();
export default chainlinkBot;
