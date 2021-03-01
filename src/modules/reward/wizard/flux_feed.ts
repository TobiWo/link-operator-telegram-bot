import '../../../prototype/string.extensions';
import * as wizardText from '../../../../resources/wizard.json';
import { BigNumber, providers } from 'ethers';
import { Composer, Context, Scenes } from 'telegraf';
import { AddressInfo } from '../../../model/address_info';
import { FeedRewardStatus } from '../../../model/feed_reward_status';
import { FeedWizard } from './feed';
import { FluxFeedRewardService } from '../service/flux_feed';
import { Helper } from '../../../helper/help';
import { Replier } from '../../../general_replier';

const ROUND_DETAILS_UPDATED_NAME: string = 'RoundDetailsUpdated';

export class FluxFeedRewardWizard extends FeedWizard<BigNumber> {
  private feedService: FluxFeedRewardService;

  constructor(private addressYaml: AddressInfo, private provider: providers.BaseProvider) {
    super();
    this.feedService = new FluxFeedRewardService();
    this.feedService._createFluxContracts(this.currentFeedStatus, this.addressYaml, this.provider);
  }

  async init(): Promise<void> {
    await this.feedService._setCurrentRewardsOnFeeds(this.currentFeedStatus);
  }

  getWizard(): Scenes.WizardScene<Scenes.WizardContext> {
    const wizardMainMenu: Composer<Scenes.WizardContext<Scenes.WizardSessionData>> = this.getWizardMainMenu();
    const fluxFeedWizard = new Scenes.WizardScene(
      wizardText.flux_feed_wizard.name,
      wizardMainMenu,
      this.getStartListeningConfirmationStep()
    );
    return fluxFeedWizard;
  }

  getStartListeningConfirmationStep(): Composer<Scenes.WizardContext<Scenes.WizardSessionData>> {
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

  private getWizardMainMenu(): Composer<Scenes.WizardContext<Scenes.WizardSessionData>> {
    const stepHandler = new Composer<Scenes.WizardContext>();
    stepHandler.command(wizardText.commands.long.start_listening, async (ctx) => {
      this.startListeningConfirmationRequest(1, ctx);
    });
    stepHandler.command(wizardText.commands.short.start_listening, async (ctx) => {
      this.startListeningConfirmationRequest(1, ctx);
    });
    stepHandler.command(wizardText.commands.long.stop_listening, async (ctx) => {
      this.stopFeedRewardListeningStep(ctx);
    });
    stepHandler.command(wizardText.commands.short.stop_listening, async (ctx) => {
      this.stopFeedRewardListeningStep(ctx);
    });
    stepHandler.command(wizardText.commands.long.average_reward, async (ctx) => {
      this.averageFeedRewardAmountStep(ctx);
    });
    stepHandler.command(wizardText.commands.short.average_reward, async (ctx) => {
      this.averageFeedRewardAmountStep(ctx);
    });
    stepHandler.command(wizardText.commands.long.leave, async (ctx) => {
      await ctx.reply(wizardText.general_replies.leaving);
      await Replier.replyBotMainMenu(ctx);
      return ctx.scene.leave();
    });
    stepHandler.help(async (ctx) => {
      await ctx.replyWithMarkdownV2(wizardText.flux_feed_wizard.replies.help);
    });
    return stepHandler;
  }

  private async feedRewardListeningStep(ctx: Scenes.WizardContext): Promise<void> {
    for (const feedName of this.currentFeedStatus.keys()) {
      const feedStatus: FeedRewardStatus<BigNumber> | undefined = this.currentFeedStatus.get(feedName);
      if (feedStatus) {
        if (feedStatus.contract.listeners(ROUND_DETAILS_UPDATED_NAME).length != 0) {
          await ctx.reply(wizardText.flux_feed_wizard.replies.already_listening);
          return;
        }
        feedStatus.contract.on(ROUND_DETAILS_UPDATED_NAME, async (paymentAmount: BigNumber) =>
          this.roundDetailsUpdatedListener(ctx, feedName, paymentAmount)
        );
      }
    }
    await ctx.reply(wizardText.flux_feed_wizard.replies.started_listening);
  }

  private async roundDetailsUpdatedListener(ctx: Context, feedName: string, paymentAmount: BigNumber): Promise<void> {
    try {
      await ctx.reply(
        wizardText.flux_feed_wizard.replies.new_feed_reward.format(
          feedName,
          Helper.getLinkValueWithTwoDecimals(paymentAmount)
        )
      );
      this.feedService._updateCurrentFeedReward(this.currentFeedStatus, feedName, paymentAmount);
    } catch (err) {
      console.log(err.message);
    }
  }

  private async stopFeedRewardListeningStep(ctx: Scenes.WizardContext): Promise<void> {
    for (const feedStatus of this.currentFeedStatus.values()) {
      feedStatus.contract.removeAllListeners(ROUND_DETAILS_UPDATED_NAME);
    }
    await ctx.reply(wizardText.flux_feed_wizard.replies.stopped_listening);
  }

  private async averageFeedRewardAmountStep(ctx: Scenes.WizardContext): Promise<void> {
    await ctx.reply(
      wizardText.flux_feed_wizard.replies.average_feed_reward.format(
        Helper.getLinkValueWithTwoDecimals(this.feedService._getAverageFeedRewardAmount(this.currentFeedStatus))
      )
    );
  }
}
