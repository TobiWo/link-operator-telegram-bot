import '../../prototype/string.extensions';
import * as FluxAggregator from '../../../artifacts/FluxAggregator.json';
import * as wizardText from '../../../resources/wizard.json';
import { Scenes, Composer, Context } from 'telegraf';
import { providers, Contract, BigNumber } from 'ethers';
import { AddressInfo } from '../../interface/address_info';
import { FluxFeedRewardStatus } from '../../interface/feed_reward_status';
import { Helper } from '../../helper/help';

const ROUND_DETAILS_UPDATED_NAME: string = 'RoundDetailsUpdated';

export class FluxFeedRewardWizard {
  private currentFeedStatus: Map<string, FluxFeedRewardStatus> = new Map();

  constructor(private addressYaml: AddressInfo, private provider: providers.BaseProvider) {
    this.createFluxContracts();
  }

  async init(): Promise<void> {
    await this.setCurrentRewardsOnFeeds();
  }

  getWizard(): Scenes.WizardScene<Scenes.WizardContext> {
    const stepHandler = new Composer<Scenes.WizardContext>();
    stepHandler.command(wizardText.commands.long.start_listening, async (ctx) => {
      this.feedRewardListeningStep(ctx);
    });
    stepHandler.command(wizardText.commands.short.start_listening, async (ctx) => {
      this.feedRewardListeningStep(ctx);
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
      return ctx.scene.leave();
    });
    stepHandler.help(async (ctx) => {
      await ctx.reply(wizardText.flux_feed_wizard.replies.help);
    });
    const rewardWizard = new Scenes.WizardScene(wizardText.flux_feed_wizard.name, stepHandler);
    return rewardWizard;
  }

  private async feedRewardListeningStep(ctx: Scenes.WizardContext): Promise<void> {
    for (const feedName of this.currentFeedStatus.keys()) {
      const feedStatus: FluxFeedRewardStatus | undefined = this.currentFeedStatus.get(feedName);
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
    await ctx.reply(
      wizardText.flux_feed_wizard.replies.new_feed_reward.format(
        feedName,
        Helper.getLinkValueWithTwoDecimals(paymentAmount)
      )
    );
    this.updateCurrentFeedReward(feedName, paymentAmount);
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
        Helper.getLinkValueWithTwoDecimals(this.getAverageFeedRewardAmount())
      )
    );
  }

  private getAverageFeedRewardAmount(): BigNumber {
    let totalRewards: BigNumber = BigNumber.from(0);
    for (const feedStatus of this.currentFeedStatus.values()) {
      totalRewards = totalRewards.add(feedStatus.currentReward);
    }
    return totalRewards.div(BigNumber.from(this.currentFeedStatus.size));
  }

  private updateCurrentFeedReward(feedName: string, newReward: BigNumber): void {
    const fluxFeedStatus: FluxFeedRewardStatus | undefined = this.currentFeedStatus.get(feedName);
    if (fluxFeedStatus && !fluxFeedStatus.currentReward.eq(newReward)) {
      fluxFeedStatus.currentReward = newReward;
    }
  }

  private createFluxContracts(): void {
    for (const contractInfo of this.addressYaml.flux.contracts) {
      const contract: Contract = new Contract(contractInfo.address, FluxAggregator.abi, this.provider);
      this.currentFeedStatus.set(contractInfo.name, { contract, currentReward: BigNumber.from(0) });
    }
  }

  private async setCurrentRewardsOnFeeds(): Promise<void> {
    for (const feedStatus of this.currentFeedStatus.values()) {
      const currentPaymentAmount: BigNumber = await feedStatus.contract.paymentAmount();
      feedStatus.currentReward = currentPaymentAmount;
    }
  }
}
