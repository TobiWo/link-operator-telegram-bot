import * as wizardText from '../../../../../resources/wizard.json';
import { BillingSet, FeedRewardStatus } from '../../../../model/feed_reward_status';
import { Composer, Context, Scenes } from 'telegraf';
import { OcrFeedRewardService, GAS_USAGE } from './service';
import { providers, utils } from 'ethers';
import { Helper } from '../../../../helper/help';
import { StepService } from '../step';
import { TrxInfo } from '../../../../model/trx_info';

// Name of the Event to listen for
const BILLING_SET_NAME: string = 'BillingSet';

/**
 * StepService which holds all wizard-logic with regards to listening to the BillingSet event.
 * A step here is one particular functionality wihtin the wizard.
 */
export class RewardListenerStepService extends StepService<BillingSet> {
  private feedService: OcrFeedRewardService;

  constructor(
    protected currentFeedStatus: Map<string, FeedRewardStatus<BillingSet>>,
    private provider: providers.BaseProvider
  ) {
    super();
    this.feedService = new OcrFeedRewardService();
  }

  /**
   * Listens to the selected answer of the user whether to start/stop the listening process.
   * If the process is started the listener will be activated otherwise the help will be replied.
   *
   * @returns Composer which listens for selected answer of the user whether to start/stop the listening process
   */
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

  /**
   * Starts listening on all ocr-contracts for reward changes.
   *
   * @param ctx chat context
   */
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

  /**
   * Listener for contract.on with all related functionality to reply reward changes. Furthermore it updates
   * the respective feedStatus object
   *
   * @param ctx chat context
   * @param feedName name of the feed
   * @param args arguments from the returned BillingSet event
   */
  private async billingSetListener(ctx: Context, feedName: string, args: any): Promise<void> {
    const retrievedBillingSet: BillingSet = this.feedService._createBillingSet(args.slice(0, args.length - 1));
    const transactionLog: providers.Log = args[args.length - 1];
    await this.replyOnTransmitterRewardChange(ctx, feedName, retrievedBillingSet, transactionLog.transactionHash);
    await this.replyOnObservationRewardChange(ctx, feedName, retrievedBillingSet);
    this.feedService._updateCurrentBillingSet(this.getFeedStatus(feedName), retrievedBillingSet);
  }

  /**
   * If any transmitter reward value was changed it replies the full new transmitter reward
   * and also which values were changed.
   *
   * @param ctx chat contex
   * @param feedName name of the feed
   * @param billingSet new reward parameters
   * @param transactionHash trx-hash of the transaction where the event was emitted
   */
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
      try {
        const trxInfo: TrxInfo = await this.feedService._getTrxInfo(this.provider, transactionHash);
        await ctx.reply(
          wizardText.ocr_feed_wizard.replies.new_transmitter_feed_reward.format(
            feedName,
            Helper.parseLinkWeiToLink(
              this.feedService._getNewTransmitterReward(billingSet, trxInfo.transactionResponse.gasPrice, GAS_USAGE),
              2
            ),
            trxInfo.transactionResponse.gasPrice.div(utils.parseUnits('1', 'gwei')).toString(),
            this.feedService._getReplyForChangedTransmitterValues(this.getFeedStatus(feedName), billingSet)
          )
        );
      } catch (err) {
        console.log(err);
      }
    }
  }

  /**
   * If observation reward was changed it replies the observation reward
   *
   * @param ctx chat contect
   * @param feedName name of the feed
   * @param billingSet new reward parameters
   */
  private async replyOnObservationRewardChange(ctx: Context, feedName: string, billingSet: BillingSet): Promise<void> {
    if (this.feedService._isObservationRewardChanged(this.getFeedStatus(feedName), billingSet.linkWeiPerObservation)) {
      try {
        await ctx.reply(
          wizardText.ocr_feed_wizard.replies.new_observation_feed_reward.format(
            feedName,
            Helper.parseLinkWeiToLink(billingSet.linkWeiPerObservation, 4)
          )
        );
      } catch (err) {
        console.log(err.message);
      }
    }
  }

  /**
   * Stops the listening process for all feeds
   *
   * @param ctx chat context
   */
  async _stopFeedRewardListeningStep(ctx: Scenes.WizardContext): Promise<void> {
    for (const feedStatus of this.currentFeedStatus.values()) {
      feedStatus.contract.removeAllListeners(BILLING_SET_NAME);
    }
    await ctx.reply(wizardText.ocr_feed_wizard.replies.stopped_listening);
  }
}
