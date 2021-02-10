import { Telegraf, Scenes, session, Markup, Context } from 'telegraf';
import { AddressInfo } from './interface/address_info';
import { FluxFeedRewardWizard } from './modules/reward/listening_flux_wizard';
import { RewardBalanceWizard } from './modules/reward/total_wizard';
import YAML from 'yaml';
import { cliOptions } from './cli';
import fs from 'fs';
import path from 'path';

// import { HttpsProxyAgent } from 'https-proxy-agent';

const MODULE1: string = '💰 Current total rewards';
const MODULE2: string = '🦻 Flux feed reward details';

export class ChainlinkBot {
  private addressYaml: AddressInfo = {
    flux: { contracts: [], oracle: '' },
    link_token_contract: '',
    ocr: { contracts: [], oracle: '', payee: '' },
  };
  bot: Telegraf<Scenes.WizardContext>;
  private rewardBalanceWizard!: RewardBalanceWizard;
  private fluxFeedRewardWizard!: FluxFeedRewardWizard;

  constructor() {
    this.readAddressYaml();
    this.bot = new Telegraf<Scenes.WizardContext>(cliOptions.chatbotToken);
    this.createWizardInstances();
    this.setupBot();
  }

  async initWizardInstances(): Promise<void> {
    await this.fluxFeedRewardWizard.init();
  }

  private createWizardInstances(): void {
    this.rewardBalanceWizard = new RewardBalanceWizard(this.addressYaml, cliOptions.provider);
    this.fluxFeedRewardWizard = new FluxFeedRewardWizard(this.addressYaml, cliOptions.provider);
  }

  private setupBot() {
    const stage = new Scenes.Stage<Scenes.WizardContext>([
      this.rewardBalanceWizard.getWizard(),
      this.fluxFeedRewardWizard.getWizard(),
    ]);
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
          Markup.keyboard([[MODULE1, MODULE2]])
            .oneTime()
            .resize()
        );
      }
    });
    this.bot.hears(MODULE1, (ctx) => {
      ctx.scene.enter('reward-wizard');
      ctx.replyWithMarkdownV2('*Entering reward fetcher module\\!*\nType `/help` for all available commands');
    });
    this.bot.hears(MODULE2, (ctx) => {
      ctx.scene.enter('flux-feed-wizard');
      ctx.replyWithMarkdownV2('*Entering flux feed wizard\\!*\nType `/help` for all available commands');
    });
  }

  private readAddressYaml(): void {
    const contractAddressesFilePath: string = path.join(__dirname, '..', 'resources/external/address_info.yml');
    const file: string = fs.readFileSync(contractAddressesFilePath, 'utf8');
    this.addressYaml = YAML.parse(file);
  }

  private isChatEligible(ctx: Context): boolean {
    if (ctx.chat?.id) {
      if (!cliOptions.eligibleChats.includes(Math.abs(ctx.chat?.id))) {
        ctx.replyWithMarkdownV2('*Sorry, this chat is not eligible to work with me\\!*');
        return false;
      }
      return true;
    }
    return false;
  }
}
