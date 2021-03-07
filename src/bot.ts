import './prototype/string.extensions';
import * as botText from '../resources/bot.json';
import * as wizardText from '../resources/wizard.json';
import { Telegraf, Scenes, session, Context } from 'telegraf';
import { AddressInfo } from './model/address_info';
import { FluxFeedRewardWizard } from './modules/reward/feed/flux/wizard';
import { OcrFeedRewardWizard } from './modules/reward/feed/ocr/wizard';
import { Replier } from './general_replier';
import { TotalRewardWizard } from './modules/reward/total/wizard';
import YAML from 'yaml';
import { cliOptions } from './cli';
import fs from 'fs';
import path from 'path';

export class ChainlinkBot {
  private addressYaml!: AddressInfo;
  bot: Telegraf<Scenes.WizardContext>;
  private totalRewardWizard!: TotalRewardWizard;
  private fluxFeedRewardWizard!: FluxFeedRewardWizard;
  private ocrFeedRewardWizard!: OcrFeedRewardWizard;

  constructor() {
    this.readAddressYaml();
    this.bot = new Telegraf<Scenes.WizardContext>(cliOptions.chatbotToken);
    this.createWizardInstances();
    this.setupBot();
  }

  async initWizardInstances(): Promise<void> {
    await this.fluxFeedRewardWizard.init();
    await this.ocrFeedRewardWizard.init();
  }

  private createWizardInstances(): void {
    this.totalRewardWizard = new TotalRewardWizard(this.addressYaml, cliOptions.provider);
    this.fluxFeedRewardWizard = new FluxFeedRewardWizard(this.addressYaml, cliOptions.provider);
    this.ocrFeedRewardWizard = new OcrFeedRewardWizard(this.addressYaml, cliOptions.provider);
  }

  private setupBot() {
    const stage = new Scenes.Stage<Scenes.WizardContext>([
      this.totalRewardWizard.getWizard(),
      this.fluxFeedRewardWizard.getWizard(),
      this.ocrFeedRewardWizard.getWizard(),
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
        await Replier.replyBotMainMenu(ctx);
      }
    });
    this.bot.hears(botText.module_names.total_reward, (ctx) => {
      ctx.scene.enter(wizardText.total_wizard.name);
      ctx.replyWithMarkdownV2(botText.messages.enter_total_reward.format(wizardText.total_wizard.replies.help));
      ctx.reply(botText.messages.type_help);
    });
    this.bot.hears(botText.module_names.flux_details, (ctx) => {
      ctx.scene.enter(wizardText.flux_feed_wizard.name);
      ctx.replyWithMarkdownV2(botText.messages.enter_flux_details.format(wizardText.flux_feed_wizard.replies.help));
      ctx.reply(botText.messages.type_help);
    });
    this.bot.hears(botText.module_names.ocr_details, (ctx) => {
      ctx.scene.enter(wizardText.ocr_feed_wizard.name);
      ctx.replyWithMarkdownV2(botText.messages.enter_ocr_details.format(wizardText.ocr_feed_wizard.replies.help));
      ctx.reply(botText.messages.type_help);
    });
  }

  private readAddressYaml(): void {
    try {
      const contractAddressesFilePath: string = path.join(__dirname, '..', 'resources/external/address_info.yml');
      const file: string = fs.readFileSync(contractAddressesFilePath, 'utf8');
      this.addressYaml = YAML.parse(file);
    } catch (error) {
      console.log(error.message);
      process.exit();
    }
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
