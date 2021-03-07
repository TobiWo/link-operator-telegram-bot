import * as wizardText from '../../../../../resources/wizard.json';
import { Composer, Scenes } from 'telegraf';
import { AddressInfo } from '../../../../model/address_info';
import { AverageRewardStepService } from './average';
import { BillingSet } from '../../../../model/feed_reward_status';
import { FeedWizard } from '../feed';
import { OcrFeedRewardService } from './service';
import { Replier } from '../../../../general_replier';
import { RewardListenerStepService } from './listener';
import { providers } from 'ethers';

export class OcrFeedRewardWizard extends FeedWizard<BillingSet> {
  private feedService: OcrFeedRewardService;
  private averageRewardStepService: AverageRewardStepService;
  private listenerStepService: RewardListenerStepService;

  constructor(private addressYaml: AddressInfo, private provider: providers.BaseProvider) {
    super();
    this.feedService = new OcrFeedRewardService();
    this.feedService._createOcrContracts(this.addressYaml, this.currentFeedStatus, this.provider);
    this.listenerStepService = new RewardListenerStepService(this.currentFeedStatus, this.provider);
    this.averageRewardStepService = new AverageRewardStepService(this.currentFeedStatus);
  }

  async init(): Promise<void> {
    await this.feedService._setCurrentBillingSetOnFeeds(this.currentFeedStatus);
  }

  getWizard(): Scenes.WizardScene<Scenes.WizardContext> {
    const ocrFeedWizard = new Scenes.WizardScene(
      wizardText.ocr_feed_wizard.name,
      this.getWizardMainMenu(),
      this.listenerStepService._getListenerConfirmationStep(),
      this.averageRewardStepService._getAverageTransmitterRewardStep()
    );
    return ocrFeedWizard;
  }

  private getWizardMainMenu(): Composer<Scenes.WizardContext<Scenes.WizardSessionData>> {
    const mainMenu = new Composer<Scenes.WizardContext>();
    mainMenu.command(wizardText.commands.long.start_listening, async (ctx) => this.replyWithListeningConfirmationButton(1, ctx));
    mainMenu.command(wizardText.commands.short.start_listening, async (ctx) =>
      this.replyWithListeningConfirmationButton(1, ctx)
    );
    mainMenu.command(wizardText.commands.long.stop_listening, async (ctx) => {
      this.listenerStepService._stopFeedRewardListeningStep(ctx);
    });
    mainMenu.command(wizardText.commands.short.stop_listening, async (ctx) => {
      this.listenerStepService._stopFeedRewardListeningStep(ctx);
    });
    mainMenu.command(wizardText.commands.long.average_reward, async (ctx) => {
      this.averageRewardStepService._replyWithGasPriceRequestButton(2, ctx);
    });
    mainMenu.command(wizardText.commands.short.average_reward, async (ctx) => {
      this.averageRewardStepService._replyWithGasPriceRequestButton(2, ctx);
    });
    mainMenu.command(wizardText.commands.long.leave, async (ctx) => {
      await ctx.reply(wizardText.general_replies.leaving);
      await Replier.replyBotMainMenu(ctx);
      return ctx.scene.leave();
    });
    mainMenu.help(async (ctx) => {
      await ctx.replyWithMarkdownV2(wizardText.ocr_feed_wizard.replies.help);
    });
    return mainMenu;
  }
}
