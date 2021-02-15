import * as botText from '../resources/bot.json';
import * as wizardText from '../resources/wizard.json';
import { Telegraf, Scenes, session, Markup, Context } from 'telegraf';
import { AddressInfo } from './interface/address_info';
import { FluxFeedRewardWizard } from './modules/reward/listening_flux_wizard';
import { RewardBalanceWizard } from './modules/reward/total_wizard';
import YAML from 'yaml';
import { cliOptions } from './cli';
import fs from 'fs';
import path from 'path';

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
        ctx.replyWithMarkdownV2(botText.messages.help);
      }
    });

    this.bot.hears(botText.commands.link, async (ctx) => {
      if (this.isChatEligible(ctx)) {
        await ctx.replyWithMarkdownV2(
          botText.messages.choose_module,
          Markup.keyboard([[botText.module_names.total_reward, botText.module_names.flux_details]])
            .oneTime()
            .resize()
        );
      }
    });
    this.bot.hears(botText.module_names.total_reward, (ctx) => {
      ctx.scene.enter(wizardText.total_wizard.name);
      ctx.replyWithMarkdownV2(botText.messages.enter_total_reward);
    });
    this.bot.hears(botText.module_names.flux_details, (ctx) => {
      ctx.scene.enter(wizardText.flux_feed_wizard.name);
      ctx.replyWithMarkdownV2(botText.messages.enter_flux_details);
    });
  }

  private readAddressYaml(): void {
    const contractAddressesFilePath: string = path.join(__dirname, '..', 'resources/external/address_info.yml');
    const file: string = fs.readFileSync(contractAddressesFilePath, 'utf8');
    this.addressYaml = YAML.parse(file);
  }

  private isChatEligible(ctx: Context): boolean {
    if (ctx.chat) {
      if (!cliOptions.eligibleChats.includes(ctx.chat.id)) {
        ctx.replyWithMarkdownV2(botText.messages.is_chat_eligible);
        return false;
      }
      return true;
    }
    return false;
  }
}
