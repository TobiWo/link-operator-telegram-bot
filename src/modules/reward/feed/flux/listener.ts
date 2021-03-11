import '../../../../prototype/string.extensions';
import * as wizardText from '../../../../../resources/wizard.json';
import { Composer, Context, Scenes } from 'telegraf';
import { BigNumber } from 'ethers';
import { FeedRewardStatus } from '../../../../model/feed_reward_status';
import { FluxFeedRewardService } from './service';
import { Helper } from '../../../../helper/help';
import { StepService } from '../step';

// Name of the Event to listen for
const ROUND_DETAILS_UPDATED_NAME: string = 'RoundDetailsUpdated';

/**
 * StepService which holds all wizard-logic with regards to listening to the RoundDetailsUpdated event.
 * A step here is one particular functionality wihtin the wizard.
 */
export class RewardListenerStepService extends StepService<BigNumber> {
  private feedService: FluxFeedRewardService;

  constructor(protected currentFeedStatus: Map<string, FeedRewardStatus<BigNumber>>) {
    super();
    this.feedService = new FluxFeedRewardService();
  }

  /**
   * Listens to the selected answer of the user whether to start/stop the listening process.
   * If the process is started the listener will be activated otherwise the help will be replied.
   *
   * @returns composer which listens to user selection whether to proceed or not
   */
  _getListeningConfirmationStep(): Composer<Scenes.WizardContext<Scenes.WizardSessionData>> {
    const stepHandler = new Composer<Scenes.WizardContext>();
    stepHandler.action(wizardText.listening_service.action.start, async (ctx) => {
      await this.feedRewardListeningStep(ctx);
      return ctx.wizard.selectStep(0);
    });
    stepHandler.action(wizardText.listening_service.action.stop, async (ctx) => {
      ctx.reply(wizardText.flux_feed_wizard.replies.help);
      return ctx.wizard.selectStep(0);
    });
    return stepHandler;
  }

  /**
   * Starts listening on all flux-contracts for reward changes.
   *
   * @param ctx chat context
   */
  private async feedRewardListeningStep(ctx: Scenes.WizardContext): Promise<void> {
    for (const feedName of this.currentFeedStatus.keys()) {
      const feedStatus: FeedRewardStatus<BigNumber> = this.getFeedStatus(feedName);
      if (feedStatus.contract.listeners(ROUND_DETAILS_UPDATED_NAME).length != 0) {
        await ctx.reply(wizardText.flux_feed_wizard.replies.already_listening);
        return;
      }
      feedStatus.contract.on(ROUND_DETAILS_UPDATED_NAME, async (paymentAmount: BigNumber) =>
        this.roundDetailsUpdatedListener(ctx, feedName, paymentAmount)
      );
    }
    await ctx.reply(wizardText.flux_feed_wizard.replies.started_listening);
  }

  /**
   * Listener for contract.on with all related functionality to reply reward changes. Furthermore it updates
   * the respective feedStatus object
   *
   * @param ctx chat context
   * @param feedName name of the feed
   * @param paymentAmount new reward on feed
   */
  private async roundDetailsUpdatedListener(ctx: Context, feedName: string, paymentAmount: BigNumber): Promise<void> {
    try {
      const feedStatus: FeedRewardStatus<BigNumber> = this.getFeedStatus(feedName);
      await ctx.reply(
        wizardText.flux_feed_wizard.replies.new_feed_reward.format(
          feedName,
          Helper.parseLinkWeiToLink(feedStatus.rewardData, 2),
          Helper.parseLinkWeiToLink(paymentAmount, 2)
        )
      );
      this.feedService._updateCurrentFeedReward(this.getFeedStatus(feedName), paymentAmount);
    } catch (err) {
      console.log(err.message);
    }
  }

  /**
   * Stops the listening process for all feeds
   *
   * @param ctx chat context
   */
  async _stopFeedRewardListeningStep(ctx: Scenes.WizardContext): Promise<void> {
    for (const feedStatus of this.currentFeedStatus.values()) {
      feedStatus.contract.removeAllListeners(ROUND_DETAILS_UPDATED_NAME);
    }
    await ctx.reply(wizardText.flux_feed_wizard.replies.stopped_listening);
  }
}
