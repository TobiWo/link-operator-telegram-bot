import '../../../../prototype/string.extensions';
import * as wizardText from '../../../../../resources/wizard.json';
import { Composer, Context, Scenes } from 'telegraf';
import { BigNumber } from 'ethers';
import { FeedRewardStatus } from '../../../../model/feed_reward_status';
import { FluxFeedRewardService } from './service';
import { Helper } from '../../../../helper/help';
import { StepService } from '../step';

const ROUND_DETAILS_UPDATED_NAME: string = 'RoundDetailsUpdated';

export class RewardListenerStepService extends StepService<BigNumber> {
  private feedService: FluxFeedRewardService;

  constructor(protected currentFeedStatus: Map<string, FeedRewardStatus<BigNumber>>) {
    super();
    this.feedService = new FluxFeedRewardService();
  }

  _getStartListeningConfirmationStep(): Composer<Scenes.WizardContext<Scenes.WizardSessionData>> {
    const stepHandler = new Composer<Scenes.WizardContext>();
    stepHandler.action(wizardText.listening_service.action.start, async (ctx) => {
      this.feedRewardListeningStep(ctx);
      return ctx.wizard.selectStep(0);
    });
    stepHandler.action(wizardText.listening_service.action.stop, async (ctx) => {
      ctx.reply(wizardText.flux_feed_wizard.replies.help);
      return ctx.wizard.selectStep(0);
    });
    return stepHandler;
  }

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

  async _stopFeedRewardListeningStep(ctx: Scenes.WizardContext): Promise<void> {
    for (const feedStatus of this.currentFeedStatus.values()) {
      feedStatus.contract.removeAllListeners(ROUND_DETAILS_UPDATED_NAME);
    }
    await ctx.reply(wizardText.flux_feed_wizard.replies.stopped_listening);
  }
}
