import * as wizardText from '../../../../../resources/wizard.json';
import { BillingSet, FeedRewardStatus } from '../../../../model/feed_reward_status';
import { Composer, Context, Scenes } from 'telegraf';
import { providers, utils } from 'ethers';
import { Helper } from '../../../../helper/help';
import { OcrFeedRewardService } from './service';
import { StepService } from '../step';
import { TrxInfo } from '../../../../model/trx_info';

const BILLING_SET_NAME: string = 'BillingSet';

export class RewardListenerStepService extends StepService<BillingSet> {
  private feedService: OcrFeedRewardService;

  constructor(
    protected currentFeedStatus: Map<string, FeedRewardStatus<BillingSet>>,
    private provider: providers.BaseProvider
  ) {
    super();
    this.feedService = new OcrFeedRewardService();
  }

  _getListenerConfirmationStep(): Composer<Scenes.WizardContext<Scenes.WizardSessionData>> {
    const stepHandler = new Composer<Scenes.WizardContext>();
    stepHandler.action(wizardText.listening_service.action.start, async (ctx) => {
      await this.feedRewardListeningStep(ctx);
      return ctx.wizard.selectStep(0);
    });
    stepHandler.action(wizardText.listening_service.action.stop, async (ctx) => {
      await ctx.reply(wizardText.ocr_feed_wizard.replies.help);
      return ctx.wizard.selectStep(0);
    });
    return stepHandler;
  }

  private async feedRewardListeningStep(ctx: Scenes.WizardContext): Promise<void> {
    for (const feedName of this.currentFeedStatus.keys()) {
      const feedStatus: FeedRewardStatus<BillingSet> = this.getFeedStatus(feedName);
      if (feedStatus.contract.listeners(BILLING_SET_NAME).length != 0) {
        await ctx.reply(wizardText.ocr_feed_wizard.replies.already_listening);
        return;
      }
      feedStatus.contract.on(BILLING_SET_NAME, async (...args: any) => this.billingSetListener(ctx, feedName, args));
    }
    await ctx.reply(wizardText.ocr_feed_wizard.replies.started_listening);
  }

  private async billingSetListener(ctx: Context, feedName: string, args: any): Promise<void> {
    const retrievedBillingSet: BillingSet = this.feedService._createBillingSet(args.slice(0, args.length - 1));
    const transactionLog: providers.Log = args[args.length - 1];
    await this.replyOnTransmitterRewardChange(ctx, feedName, retrievedBillingSet, transactionLog.transactionHash);
    await this.replyOnObservationRewardChange(ctx, feedName, retrievedBillingSet);
    this.feedService._updateCurrentBillingSet(this.getFeedStatus(feedName), retrievedBillingSet);
  }

  private async replyOnTransmitterRewardChange(
    ctx: Context,
    feedName: string,
    billingSet: BillingSet,
    transactionHash: string
  ): Promise<void> {
    if (
      this.feedService._isTransmitterRewardChanged(
        this.getFeedStatus(feedName),
        billingSet.linkWeiPerTransmission,
        billingSet.linkPerEth
      )
    ) {
      const trxInfo: TrxInfo = await this.feedService._getTrxInfo(this.provider, transactionHash);
      await ctx.reply(
        wizardText.ocr_feed_wizard.replies.new_transmitter_feed_reward.format(
          feedName,
          Helper.parseLinkWeiToLink(
            this.feedService._getNewTransmitterReward(
              billingSet,
              trxInfo.transactionResponse.gasPrice,
              trxInfo.transactionReceipt.gasUsed
            ),
            2
          ),
          trxInfo.transactionResponse.gasPrice.div(utils.parseUnits('1', 'gwei')).toString(),
          this.feedService._getReplyForChangedTransmitterValues(this.getFeedStatus(feedName), billingSet)
        )
      );
    }
  }

  private async replyOnObservationRewardChange(ctx: Context, feedName: string, billingSet: BillingSet) {
    if (this.feedService._isObservationRewardChanged(this.getFeedStatus(feedName), billingSet.linkWeiPerObservation)) {
      await ctx.reply(
        wizardText.ocr_feed_wizard.replies.new_observation_feed_reward.format(
          feedName,
          Helper.parseLinkWeiToLink(billingSet.linkWeiPerObservation, 4)
        )
      );
    }
  }

  async _stopFeedRewardListeningStep(ctx: Scenes.WizardContext): Promise<void> {
    for (const feedStatus of this.currentFeedStatus.values()) {
      feedStatus.contract.removeAllListeners(BILLING_SET_NAME);
    }
    await ctx.reply(wizardText.ocr_feed_wizard.replies.stopped_listening);
  }
}
