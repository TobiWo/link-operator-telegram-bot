import * as FluxAggregator from '../../../artifacts/FluxAggregator.json';
import * as wizardText from '../../../resources/wizard.json';
import { Scenes, Composer } from 'telegraf';
import { providers, Contract, BigNumber, utils } from 'ethers';
import { AddressInfo } from '../../interface/address_info';

const ROUND_DETAILS_UPDATED_NAME: string = 'RoundDetailsUpdated';

export class FluxFeedRewardWizard {
  private currentFeedStatus: Map<string, FluxFeedStatus> = new Map();

  constructor(private addressYaml: AddressInfo, private provider: providers.BaseProvider) {
    this.createFluxContracts();
  }

  async init(): Promise<void> {
    await this.setCurrentRewardsOnFeeds();
  }

  getWizard(): Scenes.WizardScene<Scenes.WizardContext> {
    const stepHandler = new Composer<Scenes.WizardContext>();
    stepHandler.command(wizardText.flux_feed_wizard.commands.long.start_listening, async (ctx) => {
      this.feedRewardListeningHandler(ctx);
    });
    stepHandler.command(wizardText.flux_feed_wizard.commands.short.start_listening, async (ctx) => {
      this.feedRewardListeningHandler(ctx);
    });
    stepHandler.command(wizardText.flux_feed_wizard.commands.long.stop_listening, async (ctx) => {
      this.stopFeedRewardListeningHandler(ctx);
    });
    stepHandler.command(wizardText.flux_feed_wizard.commands.short.stop_listening, async (ctx) => {
      this.stopFeedRewardListeningHandler(ctx);
    });
    stepHandler.command(wizardText.flux_feed_wizard.commands.long.average_reward, async (ctx) => {
      this.averageFeedRewardAmountHandler(ctx);
    });
    stepHandler.command(wizardText.flux_feed_wizard.commands.short.average_reward, async (ctx) => {
      this.averageFeedRewardAmountHandler(ctx);
    });
    stepHandler.command(wizardText.flux_feed_wizard.commands.long.leave, async (ctx) => {
      await ctx.reply(wizardText.flux_feed_wizard.replies.leaving);
      return ctx.scene.leave();
    });
    stepHandler.help(async (ctx) => {
      await ctx.reply(wizardText.flux_feed_wizard.replies.help);
    });
    const rewardWizard = new Scenes.WizardScene(wizardText.flux_feed_wizard.name, stepHandler);
    return rewardWizard;
  }

  private async feedRewardListeningHandler(ctx: Scenes.WizardContext): Promise<void> {
    for (const name of this.currentFeedStatus.keys()) {
      const feedStatus: FluxFeedStatus | undefined = this.currentFeedStatus.get(name);
      if (feedStatus) {
        if (feedStatus.contract.listeners(ROUND_DETAILS_UPDATED_NAME).length != 0) {
          await ctx.reply(wizardText.flux_feed_wizard.replies.already_listening);
          return;
        }
        feedStatus.contract.on(ROUND_DETAILS_UPDATED_NAME, async (paymentAmount) => {
          await ctx.reply(
            `${wizardText.flux_feed_wizard.replies.new_feed_reward} ${name}: ${this.getLinkValueWithTwoDecimals(
              paymentAmount
            )} LINK`
          );
          this.updateCurrentFeedReward(name, paymentAmount);
        });
      }
    }
    await ctx.reply(wizardText.flux_feed_wizard.replies.started_listening);
  }

  private async stopFeedRewardListeningHandler(ctx: Scenes.WizardContext): Promise<void> {
    for (const feedStatus of this.currentFeedStatus.values()) {
      feedStatus.contract.removeAllListeners(ROUND_DETAILS_UPDATED_NAME);
    }
    await ctx.reply(wizardText.flux_feed_wizard.replies.stopped_listening);
  }

  private async averageFeedRewardAmountHandler(ctx: Scenes.WizardContext): Promise<void> {
    await ctx.reply(
      `${wizardText.flux_feed_wizard.replies.average_feed_reward} ${this.getLinkValueWithTwoDecimals(
        this.getAverageFeedRewardAmount()
      )} LINK`
    );
  }

  private getAverageFeedRewardAmount(): BigNumber {
    let totalRewards: BigNumber = BigNumber.from(0);
    for (const feedStatus of this.currentFeedStatus.values()) {
      totalRewards = totalRewards.add(feedStatus.currentReward);
    }
    return totalRewards.div(BigNumber.from(this.currentFeedStatus.size));
  }

  private updateCurrentFeedReward(name: string, newReward: BigNumber): void {
    const fluxFeedStatus: FluxFeedStatus | undefined = this.currentFeedStatus.get(name);
    if (fluxFeedStatus && !fluxFeedStatus.currentReward.eq(newReward)) {
      fluxFeedStatus.currentReward = newReward;
      this.currentFeedStatus.set(name, fluxFeedStatus);
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

  private getLinkValueWithTwoDecimals(linkInWei: BigNumber): string {
    const valueString: string = utils.formatEther(linkInWei);
    return valueString.slice(0, valueString.indexOf('.') + 3);
  }
}

export interface FluxFeedStatus {
  contract: Contract;
  currentReward: BigNumber;
}
