import * as wizardText from '../../../../../resources/wizard.json';
import { BigNumber, utils } from 'ethers';
import { BillingSet, FeedRewardStatus } from '../../../../model/feed_reward_status';
import { Composer, Markup, Scenes } from 'telegraf';
import { Helper } from '../../../../helper/help';
import { OcrFeedRewardService } from './service';
import { StepService } from '../step';

export class AverageRewardStepService extends StepService<BillingSet> {
  private feedService: OcrFeedRewardService;

  constructor(protected currentFeedStatus: Map<string, FeedRewardStatus<BillingSet>>) {
    super();
    this.feedService = new OcrFeedRewardService();
  }

  async _replyWithGasPriceRequestButton(
    selectStep: number,
    ctx: Scenes.WizardContext
  ): Promise<Scenes.WizardContextWizard<Scenes.WizardContext<Scenes.WizardSessionData>>> {
    await ctx.replyWithMarkdownV2(
      wizardText.ocr_feed_wizard.replies.gas_price_request,
      Markup.inlineKeyboard([
        Markup.button.callback(
          wizardText.ocr_feed_wizard.action.gasPrice._50,
          wizardText.ocr_feed_wizard.action.gasPrice._50
        ),
        Markup.button.callback(
          wizardText.ocr_feed_wizard.action.gasPrice._100,
          wizardText.ocr_feed_wizard.action.gasPrice._100
        ),
        Markup.button.callback(
          wizardText.ocr_feed_wizard.action.gasPrice._200,
          wizardText.ocr_feed_wizard.action.gasPrice._200
        ),
        Markup.button.callback(
          wizardText.ocr_feed_wizard.action.gasPrice._400,
          wizardText.ocr_feed_wizard.action.gasPrice._400
        ),
        Markup.button.callback(
          wizardText.ocr_feed_wizard.action.gasPrice._700,
          wizardText.ocr_feed_wizard.action.gasPrice._700
        ),
        Markup.button.callback(
          wizardText.ocr_feed_wizard.action.gasPrice.current,
          wizardText.ocr_feed_wizard.action.gasPrice.current
        ),
      ])
    );
    return ctx.wizard.selectStep(selectStep);
  }

  /**
   * @todo get current gas price
   */
  _getAverageTransmitterRewardStep(): Composer<Scenes.WizardContext<Scenes.WizardSessionData>> {
    const stepHandler = new Composer<Scenes.WizardContext>();
    stepHandler.action(wizardText.ocr_feed_wizard.action.gasPrice._50, async (ctx) => {
      await this.sendAverageTransmitterRewardReply(ctx, '50');
      await this.sendAverageObservationRewardReply(ctx);
      return ctx.wizard.selectStep(0);
    });
    stepHandler.action(wizardText.ocr_feed_wizard.action.gasPrice._100, async (ctx) => {
      await this.sendAverageTransmitterRewardReply(ctx, '100');
      await this.sendAverageObservationRewardReply(ctx);
      return ctx.wizard.selectStep(0);
    });
    stepHandler.action(wizardText.ocr_feed_wizard.action.gasPrice._200, async (ctx) => {
      await this.sendAverageTransmitterRewardReply(ctx, '200');
      await this.sendAverageObservationRewardReply(ctx);
      return ctx.wizard.selectStep(0);
    });
    stepHandler.action(wizardText.ocr_feed_wizard.action.gasPrice._400, async (ctx) => {
      await this.sendAverageTransmitterRewardReply(ctx, '400');
      await this.sendAverageObservationRewardReply(ctx);
      return ctx.wizard.selectStep(0);
    });
    stepHandler.action(wizardText.ocr_feed_wizard.action.gasPrice._700, async (ctx) => {
      await this.sendAverageTransmitterRewardReply(ctx, '700');
      await this.sendAverageObservationRewardReply(ctx);
      return ctx.wizard.selectStep(0);
    });
    stepHandler.action(wizardText.ocr_feed_wizard.action.gasPrice.current, async (ctx) => {
      await this.sendAverageTransmitterRewardReply(ctx, '1');
      await this.sendAverageObservationRewardReply(ctx);
      return ctx.wizard.selectStep(0);
    });
    return stepHandler;
  }

  private async sendAverageObservationRewardReply(ctx: Scenes.WizardContext): Promise<void> {
    let totalObservationReward: BigNumber = BigNumber.from(0);
    for (const feedStatus of this.currentFeedStatus.values()) {
      totalObservationReward = totalObservationReward.add(feedStatus.rewardData.linkWeiPerObservation);
    }
    await ctx.reply(
      wizardText.ocr_feed_wizard.replies.average_observation_feed_reward.format(
        Helper.parseLinkWeiToLink(totalObservationReward.div(this.currentFeedStatus.size), 3)
      )
    );
  }

  private async sendAverageTransmitterRewardReply(ctx: Scenes.WizardContext, gasPriceInGwei: string): Promise<void> {
    await ctx.reply(
      wizardText.ocr_feed_wizard.replies.average_transmitter_feed_reward.format(
        Helper.parseLinkWeiToLink(
          this.feedService._getAverageTransmitterReward(
            this.currentFeedStatus,
            utils.parseUnits(gasPriceInGwei, 'gwei')
          ),
          3
        )
      )
    );
  }
}
