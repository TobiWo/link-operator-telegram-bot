import * as settings from '../settings.json';
import { Telegraf, Scenes, session, Markup, Context } from 'telegraf';
import { RewardBalanceWizard } from './modules/reward/total_wizard';
import YAML from 'yaml';
import fs from 'fs';
import path from 'path';

// import { HttpsProxyAgent } from 'https-proxy-agent';

const MODULE1: string = '💰 Current total rewards';
const ELIGIBLE_CHAT: number = -562433941;

class ChainlinkBot {
  private addressYaml: any;
  bot: Telegraf<Scenes.WizardContext>;
  private rewardBalanceWizard!: RewardBalanceWizard;

  constructor() {
    this.readAddressYaml();
    this.bot = new Telegraf<Scenes.WizardContext>(settings.token);
    this.setupWizardInstances();
    this.setupBot();
  }

  private setupWizardInstances(): void {
    this.rewardBalanceWizard = new RewardBalanceWizard(this.addressYaml);
  }

  private setupBot() {
    const stage = new Scenes.Stage<Scenes.WizardContext>([this.rewardBalanceWizard.getRewardBalanceWizard()]);
    this.bot.use(session());
    this.bot.use(stage.middleware());

    this.bot.help((ctx) => {
      if (this.isChatEligible(ctx)) {
        ctx.replyWithMarkdownV2(
          'This bot is segmented into several modules with certain funtionalities\\. Type `link` to start the bot\\.'
        );
      }
    });

    this.bot.hears('link', async (ctx) => {
      if (this.isChatEligible(ctx)) {
        await ctx.replyWithMarkdownV2(
          '*Choose your module*',
          Markup.keyboard([[MODULE1]])
            .oneTime()
            .resize()
        );
      }
    });
    this.bot.hears(MODULE1, (ctx) => {
      ctx.scene.enter('reward-wizard');
      ctx.replyWithMarkdownV2('*Entering reward fetcher module\\!*\nType `/help` for all available commands');
    });
  }

  private readAddressYaml(): void {
    const contractAddressesFilePath: string = path.join(__dirname, '..', 'resources/address_info.yml');
    const file: string = fs.readFileSync(contractAddressesFilePath, 'utf8');
    this.addressYaml = YAML.parse(file);
  }

  private isChatEligible(ctx: Context): boolean {
    if (ctx.chat?.id) {
      if (Math.abs(ctx.chat?.id) != ELIGIBLE_CHAT) {
        ctx.replyWithMarkdownV2('*Sorry, this chat is not eligible to work with me\\!*');
        return false;
      }
      return true;
    }
    return false;
  }
}

const chainlinkBot = new ChainlinkBot();
export default chainlinkBot;
