import * as wizardText from '../../../../resources/wizard.json';
import { BillingSet, FeedRewardStatus } from '../../../model/feed_reward_status';
import { Composer, Context, Scenes } from 'telegraf';
import { OcrFeedRewardService, WEI_PER_GWEI } from '../service/ocr_feed';
import { AddressInfo } from '../../../model/address_info';
import { FeedWizard } from './feed';
import { Helper } from '../../../helper/help';
import { Replier } from '../../../general_replier';
import { TrxInfo } from '../../../model/trx_info';
import { providers } from 'ethers';

const BILLING_SET_NAME: string = 'BillingSet';

export class OcrFeedRewardWizard extends FeedWizard<BillingSet> {
  private feedService: OcrFeedRewardService;

  constructor(private addressYaml: AddressInfo, private provider: providers.BaseProvider) {
    super();
    this.feedService = new OcrFeedRewardService();
    this.feedService._createOcrContracts(this.addressYaml, this.currentFeedStatus, this.provider);
  }

  async init(): Promise<void> {
    await this.feedService._setCurrentBillingSetOnFeeds(this.currentFeedStatus);
  }

  getWizard(): Scenes.WizardScene<Scenes.WizardContext> {
    const wizardMainMenu: Composer<Scenes.WizardContext<Scenes.WizardSessionData>> = this.getWizardMainMenu();
    const ocrFeedWizard = new Scenes.WizardScene(
      wizardText.ocr_feed_wizard.name,
      wizardMainMenu,
      this.getStartListeningConfirmationStep()
    );
    return ocrFeedWizard;
  }

  getStartListeningConfirmationStep(): Composer<Scenes.WizardContext<Scenes.WizardSessionData>> {
    const stepHandler = new Composer<Scenes.WizardContext>();
    stepHandler.action(wizardText.listening_service.action.start, async (ctx) => {
      this.feedRewardListeningStep(ctx);
      return ctx.wizard.selectStep(0);
    });
    stepHandler.action(wizardText.listening_service.action.stop, async (ctx) => {
      ctx.reply(wizardText.ocr_feed_wizard.replies.help);
      return ctx.wizard.selectStep(0);
    });
    return stepHandler;
  }

  private getWizardMainMenu(): Composer<Scenes.WizardContext<Scenes.WizardSessionData>> {
    const mainMenu = new Composer<Scenes.WizardContext>();
    mainMenu.command(wizardText.commands.long.start_listening, async (ctx) =>
      this.startListeningConfirmationRequest(1, ctx)
    );
    mainMenu.command(wizardText.commands.short.start_listening, async (ctx) =>
      this.startListeningConfirmationRequest(1, ctx)
    );
    mainMenu.command(wizardText.commands.long.stop_listening, async (ctx) => {
      this.stopFeedRewardListeningStep(ctx);
    });
    mainMenu.command(wizardText.commands.short.stop_listening, async (ctx) => {
      this.stopFeedRewardListeningStep(ctx);
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

  private async feedRewardListeningStep(ctx: Scenes.WizardContext): Promise<void> {
    for (const feedName of this.currentFeedStatus.keys()) {
      const feedStatus: FeedRewardStatus<BillingSet> | undefined = this.currentFeedStatus.get(feedName);
      if (feedStatus) {
        if (feedStatus.contract.listeners(BILLING_SET_NAME).length != 0) {
          await ctx.reply(wizardText.ocr_feed_wizard.replies.already_listening);
          return;
        }
        feedStatus.contract.on(BILLING_SET_NAME, async (...args: any) => this.billingSetListener(ctx, feedName, args));
      }
    }
    await ctx.reply(wizardText.ocr_feed_wizard.replies.started_listening);
  }

  private async billingSetListener(ctx: Context, feedName: string, args: any): Promise<void> {
    const retrievedBillingSet: BillingSet = this.feedService._createBillingSet(args.slice(0, args.length - 1));
    const transactionLog: providers.Log = args[args.length - 1];
    this.replyOnTransmitterRewardChange(ctx, feedName, retrievedBillingSet, transactionLog.transactionHash);
    this.replyOnObservationRewardChange(ctx, feedName, retrievedBillingSet);
    this.feedService._updateCurrentBillingSet(this.currentFeedStatus, feedName, retrievedBillingSet);
  }

  private async replyOnTransmitterRewardChange(
    ctx: Context,
    feedName: string,
    billingSet: BillingSet,
    transactionHash: string
  ) {
    if (
      this.feedService._isTransmitterRewardChanged(
        this.currentFeedStatus,
        feedName,
        billingSet.linkWeiPerTransmission,
        billingSet.linkPerEth
      )
    ) {
      const trxInfo: TrxInfo = await this.feedService._getTrxInfo(this.provider, transactionHash);
      await ctx.reply(
        wizardText.ocr_feed_wizard.replies.new_transmitter_feed_reward.format(
          feedName,
          Helper.getLinkValueWithTwoDecimals(
            this.feedService._getNewTransmitterReward(
              billingSet,
              trxInfo.transactionResponse.gasPrice,
              trxInfo.transactionReceipt.gasUsed
            )
          ),
          trxInfo.transactionResponse.gasPrice.div(WEI_PER_GWEI).toString()
        )
      );
    }
  }

  private async replyOnObservationRewardChange(ctx: Context, feedName: string, billingSet: BillingSet) {
    if (
      this.feedService._isObservationRewardChanged(this.currentFeedStatus, feedName, billingSet.linkWeiPerObservation)
    ) {
      await ctx.reply(
        wizardText.ocr_feed_wizard.replies.new_observation_feed_reward.format(
          feedName,
          Helper.getLinkValueWithTwoDecimals(billingSet.linkWeiPerObservation)
        )
      );
    }
  }

  private async stopFeedRewardListeningStep(ctx: Scenes.WizardContext): Promise<void> {
    for (const feedStatus of this.currentFeedStatus.values()) {
      feedStatus.contract.removeAllListeners(BILLING_SET_NAME);
    }
    await ctx.reply(wizardText.ocr_feed_wizard.replies.stopped_listening);
  }
}
