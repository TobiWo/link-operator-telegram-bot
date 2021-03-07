import '../../../../prototype/string.extensions';
import * as wizardText from '../../../../../resources/wizard.json';
import { BigNumber, providers } from 'ethers';
import { Composer, Scenes } from 'telegraf';
import { AddressInfo } from '../../../../model/address_info';
import { FeedWizard } from '../feed';
import { FluxFeedRewardService } from './service';
import { Helper } from '../../../../helper/help';
import { Replier } from '../../../../general_replier';
import { RewardListenerStepService } from './listener';

export class FluxFeedRewardWizard extends FeedWizard<BigNumber> {
  private feedService: FluxFeedRewardService;
  private listenerStepService: RewardListenerStepService;

  constructor(private addressYaml: AddressInfo, private provider: providers.BaseProvider) {
    super();
    this.feedService = new FluxFeedRewardService();
    this.feedService._createFluxContracts(this.currentFeedStatus, this.addressYaml, this.provider);
    this.listenerStepService = new RewardListenerStepService(this.currentFeedStatus);
  }

  async init(): Promise<void> {
    await this.feedService._setCurrentRewardsOnFeeds(this.currentFeedStatus);
  }

  getWizard(): Scenes.WizardScene<Scenes.WizardContext> {
    const wizardMainMenu: Composer<Scenes.WizardContext<Scenes.WizardSessionData>> = this.getWizardMainMenu();
    const fluxFeedWizard = new Scenes.WizardScene(
      wizardText.flux_feed_wizard.name,
      wizardMainMenu,
      this.listenerStepService._getStartListeningConfirmationStep()
    );
    return fluxFeedWizard;
  }

  private getWizardMainMenu(): Composer<Scenes.WizardContext<Scenes.WizardSessionData>> {
    const mainMenu = new Composer<Scenes.WizardContext>();
    mainMenu.command(wizardText.commands.long.start_listening, async (ctx) => {
      this.replyWithListeningConfirmationButton(1, ctx);
    });
    mainMenu.command(wizardText.commands.short.start_listening, async (ctx) => {
      this.replyWithListeningConfirmationButton(1, ctx);
    });
    mainMenu.command(wizardText.commands.long.stop_listening, async (ctx) => {
      this.listenerStepService._stopFeedRewardListeningStep(ctx);
    });
    mainMenu.command(wizardText.commands.short.stop_listening, async (ctx) => {
      this.listenerStepService._stopFeedRewardListeningStep(ctx);
    });
    mainMenu.command(wizardText.commands.long.average_reward, async (ctx) => {
      this.averageFeedRewardAmountStep(ctx);
    });
    mainMenu.command(wizardText.commands.short.average_reward, async (ctx) => {
      this.averageFeedRewardAmountStep(ctx);
    });
    mainMenu.command(wizardText.commands.long.leave, async (ctx) => {
      await ctx.reply(wizardText.general_replies.leaving);
      await Replier.replyBotMainMenu(ctx);
      return ctx.scene.leave();
    });
    mainMenu.help(async (ctx) => {
      await ctx.replyWithMarkdownV2(wizardText.flux_feed_wizard.replies.help);
    });
    return mainMenu;
  }

  private async averageFeedRewardAmountStep(ctx: Scenes.WizardContext): Promise<void> {
    await ctx.reply(
      wizardText.flux_feed_wizard.replies.average_feed_reward.format(
        Helper.parseLinkWeiToLink(this.feedService._getAverageFeedRewardAmount(this.currentFeedStatus), 2)
      )
    );
  }
}
