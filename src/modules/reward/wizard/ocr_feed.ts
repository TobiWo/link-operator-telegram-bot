import * as wizardText from '../../../../resources/wizard.json';
import { BigNumber, providers, utils } from 'ethers';
import { BillingSet, FeedRewardStatus } from '../../../model/feed_reward_status';
import { Composer, Context, Markup, Scenes } from 'telegraf';
import { AddressInfo } from '../../../model/address_info';
import { FeedWizard } from './feed';
import { Helper } from '../../../helper/help';
import { OcrFeedRewardService } from '../service/ocr_feed';
import { Replier } from '../../../general_replier';
import { TrxInfo } from '../../../model/trx_info';

const BILLING_SET_NAME: string = 'BillingSet';
const GAS_USAGE: BigNumber = BigNumber.from(231255);

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
      this.getStartListeningConfirmationStep(),
      this.getAverageTransmitterRewardStep()
    );
    return ocrFeedWizard;
  }

  private getAverageTransmitterRewardStep(): Composer<Scenes.WizardContext<Scenes.WizardSessionData>> {
    const stepHandler = new Composer<Scenes.WizardContext>();
    stepHandler.action(wizardText.ocr_feed_wizard.requests.gasPriceAction._50, async (ctx) => {
      await this.sendAverageTransmitterRewardReply(ctx, '50');
      await this.sendAverageObservationRewardReply(ctx);
      return ctx.wizard.selectStep(0);
    });
    stepHandler.action(wizardText.ocr_feed_wizard.requests.gasPriceAction._100, async (ctx) => {
      await this.sendAverageTransmitterRewardReply(ctx, '100');
      await this.sendAverageObservationRewardReply(ctx);
      return ctx.wizard.selectStep(0);
    });
    stepHandler.action(wizardText.ocr_feed_wizard.requests.gasPriceAction._200, async (ctx) => {
      await this.sendAverageTransmitterRewardReply(ctx, '200');
      await this.sendAverageObservationRewardReply(ctx);
      return ctx.wizard.selectStep(0);
    });
    stepHandler.action(wizardText.ocr_feed_wizard.requests.gasPriceAction._400, async (ctx) => {
      await this.sendAverageTransmitterRewardReply(ctx, '400');
      await this.sendAverageObservationRewardReply(ctx);
      return ctx.wizard.selectStep(0);
    });
    stepHandler.action(wizardText.ocr_feed_wizard.requests.gasPriceAction._700, async (ctx) => {
      await this.sendAverageTransmitterRewardReply(ctx, '700');
      await this.sendAverageObservationRewardReply(ctx);
      return ctx.wizard.selectStep(0);
    });
    stepHandler.action(wizardText.ocr_feed_wizard.requests.gasPriceAction.current, async (ctx) => {
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
        Helper.getLinkValueWithDefinedDecimals(totalObservationReward.div(this.currentFeedStatus.size), 3)
      )
    );
  }

  private async sendAverageTransmitterRewardReply(ctx: Scenes.WizardContext, gasPriceInGwei: string): Promise<void> {
    await ctx.reply(
      wizardText.ocr_feed_wizard.replies.average_transmitter_feed_reward.format(
        Helper.getLinkValueWithDefinedDecimals(
          this.getAverageTransmitterReward(utils.parseUnits(gasPriceInGwei, 'gwei')),
          3
        )
      )
    );
  }

  private getAverageTransmitterReward(gasPrice: BigNumber): BigNumber {
    let totalTransmitterRewards: BigNumber = BigNumber.from(0);
    for (const feedStatus of this.currentFeedStatus.values()) {
      totalTransmitterRewards = totalTransmitterRewards.add(
        this.feedService._getNewTransmitterReward(feedStatus.rewardData, gasPrice, GAS_USAGE)
      );
    }
    return totalTransmitterRewards.div(this.currentFeedStatus.size);
  }

  private getStartListeningConfirmationStep(): Composer<Scenes.WizardContext<Scenes.WizardSessionData>> {
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
    mainMenu.command(wizardText.commands.long.average_reward, async (ctx) => {
      this.gasPriceRequest(2, ctx);
    });
    mainMenu.command(wizardText.commands.short.average_reward, async (ctx) => {
      this.gasPriceRequest(2, ctx);
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

  async gasPriceRequest(
    selectStep: number,
    ctx: Scenes.WizardContext
  ): Promise<Scenes.WizardContextWizard<Scenes.WizardContext<Scenes.WizardSessionData>>> {
    await ctx.replyWithMarkdownV2(
      '*Please select the gas price for which you want to receive the average transmitter reward*',
      Markup.inlineKeyboard([
        Markup.button.callback(
          wizardText.ocr_feed_wizard.requests.gasPriceAction._50,
          wizardText.ocr_feed_wizard.requests.gasPriceAction._50
        ),
        Markup.button.callback(
          wizardText.ocr_feed_wizard.requests.gasPriceAction._100,
          wizardText.ocr_feed_wizard.requests.gasPriceAction._100
        ),
        Markup.button.callback(
          wizardText.ocr_feed_wizard.requests.gasPriceAction._200,
          wizardText.ocr_feed_wizard.requests.gasPriceAction._200
        ),
        Markup.button.callback(
          wizardText.ocr_feed_wizard.requests.gasPriceAction._400,
          wizardText.ocr_feed_wizard.requests.gasPriceAction._400
        ),
        Markup.button.callback(
          wizardText.ocr_feed_wizard.requests.gasPriceAction._700,
          wizardText.ocr_feed_wizard.requests.gasPriceAction._700
        ),
        Markup.button.callback(
          wizardText.ocr_feed_wizard.requests.gasPriceAction.current,
          wizardText.ocr_feed_wizard.requests.gasPriceAction.current
        ),
      ])
    );
    return ctx.wizard.selectStep(selectStep);
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
          Helper.getLinkValueWithDefinedDecimals(
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
          Helper.getLinkValueWithDefinedDecimals(billingSet.linkWeiPerObservation, 4)
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
