import * as wizardText from '../../../../../resources/wizard.json';
import { BillingSet, FeedRewardStatus } from '../../../../model/feed_reward_status';
import { Composer, Markup, Scenes } from 'telegraf';
import { Helper } from '../../../../helper/help';
import { OcrFeedRewardService } from './service';
import { StepService } from '../step';
import { logger } from '../../../../logger';
import { utils } from 'ethers';

/**
 * StepService which holds all wizard-logic with regards to the average reward values.
 * A step here is one particular functionality wihtin the wizard.
 */
export class AverageRewardStepService extends StepService<BillingSet> {
  private feedService: OcrFeedRewardService;

  constructor(protected currentFeedStatus: Map<string, FeedRewardStatus<BillingSet>>) {
    super();
    this.feedService = new OcrFeedRewardService();
  }

  /**
   * Replies with multiple inline buttons for different gas prices. Selected gas price is used for calculation
   * of the current average transmitter reward.
   *
   * @param selectStepAfterReply Defines the step to which the wizard will return after the reply
   * @param ctx chat context
   * @returns position where to return within the wizard
   */
  async _replyWithGasPriceRequestButton(
    selectStepAfterReply: number,
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
    return ctx.wizard.selectStep(selectStepAfterReply);
  }

  /**
   * @todo get current gas price
   *
   * Creates a composer which listens for the selected gas price and replies with the corresponding average rewards.
   *
   * @returns Composer which listens for the selected gas price
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
      await this.sendAverageTransmitterRewardWithCurrentGasPriceReply(ctx);
      await this.sendAverageObservationRewardReply(ctx);
      return ctx.wizard.selectStep(0);
    });
    return stepHandler;
  }

  /**
   * Replies the average transmitter reward in dependence of the current fast gas price
   *
   * @param ctx chat context
   */
  private async sendAverageTransmitterRewardWithCurrentGasPriceReply(ctx: Scenes.WizardContext): Promise<void> {
    try {
      const currentFastGasPrice: string = await this.feedService._getCurrentGasPriceInGwei();
      await ctx.reply('Current fast gas price is: {0} GWEI'.format(currentFastGasPrice));
      await this.sendAverageTransmitterRewardReply(ctx, currentFastGasPrice);
    } catch (err) {
      logger.error(err.message);
      if (err.message.includes('NoResponseError')) {
        await ctx.reply(wizardText.ocr_feed_wizard.replies.no_gas_price);
      }
    }
  }

  /**
   * Replies the average observation reward for all ocr-contracts in full Link.
   *
   * @param ctx chat context
   */
  private async sendAverageObservationRewardReply(ctx: Scenes.WizardContext): Promise<void> {
    await ctx.reply(
      wizardText.ocr_feed_wizard.replies.average_observation_feed_reward.format(
        Helper.parseLinkWeiToLink(this.feedService._getAverageObservationReward(this.currentFeedStatus), 3)
      )
    );
  }

  /**
   * Replies the average transmitter reward in dependence of the supplied gas price for all ocr-contracts
   *
   * @param ctx chat context
   * @param gasPriceInGwei
   */
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
