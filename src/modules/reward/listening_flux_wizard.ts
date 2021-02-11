import * as FluxAggregator from '../../../artifacts/FluxAggregator.json';
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
    stepHandler.command('listenOnRewardChanges', async (ctx) => {
      this.feedRewardListeningHandler(ctx);
    });
    stepHandler.command('lrc', async (ctx) => {
      this.feedRewardListeningHandler(ctx);
    });
    stepHandler.command('stopListening', async (ctx) => {
      this.stopFeedRewardListeningHandler(ctx);
    });
    stepHandler.command('sl', async (ctx) => {
      this.stopFeedRewardListeningHandler(ctx);
    });
    stepHandler.command('averageFluxReward', async (ctx) => {
      this.averageFeedRewardAmountHandler(ctx);
    });
    stepHandler.command('avr', async (ctx) => {
      this.averageFeedRewardAmountHandler(ctx);
    });
    stepHandler.command('leave', async (ctx) => {
      await ctx.reply('Leaving module!');
      return ctx.scene.leave();
    });
    stepHandler.help(async (ctx) => {
      await ctx.reply(
        'Available commands:\n/listenOnRewardChanges (/lrc) - listen to reward changes on every flux feed\n\
/stopListening (/sl) - stops listening on reward changes\n\
/averageFluxReward (/avr) - prints the current average feed-reward\n\
/leave - leaves the current module'
      );
    });
    const rewardWizard = new Scenes.WizardScene('flux-feed-wizard', stepHandler);
    return rewardWizard;
  }

  private async feedRewardListeningHandler(ctx: Scenes.WizardContext): Promise<void> {
    for (const address of this.currentFeedStatus.keys()) {
      const feedStatus: FluxFeedStatus | undefined = this.currentFeedStatus.get(address);
      if (feedStatus) {
        if (feedStatus.contract.listeners(ROUND_DETAILS_UPDATED_NAME).length != 0) {
          await ctx.reply('You already listening on flux contracts for reward changes!');
          return;
        }
        feedStatus.contract.on(ROUND_DETAILS_UPDATED_NAME, async (paymentAmount) => {
          await ctx.reply(`New feed-reward on ${address}: ${this.getLinkValueWithTwoDecimals(paymentAmount)} LINK`);
          this.updateCurrentFeedReward(address, paymentAmount);
        });
      }
    }
    await ctx.reply('Started listening on all flux-contracts!');
  }

  private async stopFeedRewardListeningHandler(ctx: Scenes.WizardContext): Promise<void> {
    for (const feedStatus of this.currentFeedStatus.values()) {
      feedStatus.contract.removeAllListeners(ROUND_DETAILS_UPDATED_NAME);
    }
    await ctx.reply('Stopped listening on all flux-contracts!');
  }

  private async averageFeedRewardAmountHandler(ctx: Scenes.WizardContext): Promise<void> {
    await ctx.reply(
      `Current average feed-reward: ${this.getLinkValueWithTwoDecimals(this.getAverageFeedRewardAmount())} LINK`
    );
  }

  private getAverageFeedRewardAmount(): BigNumber {
    let totalRewards: BigNumber = BigNumber.from(0);
    for (const feedStatus of this.currentFeedStatus.values()) {
      totalRewards = totalRewards.add(feedStatus.currentReward);
    }
    return totalRewards.div(BigNumber.from(this.currentFeedStatus.size));
  }

  private updateCurrentFeedReward(address: string, newReward: BigNumber): void {
    const fluxFeedStatus: FluxFeedStatus | undefined = this.currentFeedStatus.get(address);
    if (fluxFeedStatus && !fluxFeedStatus.currentReward.eq(newReward)) {
      fluxFeedStatus.currentReward = newReward;
      this.currentFeedStatus.set(address, fluxFeedStatus);
    }
  }

  private createFluxContracts(): void {
    for (const address of this.addressYaml.flux.contracts) {
      const contract: Contract = new Contract(address, FluxAggregator.abi, this.provider);
      this.currentFeedStatus.set(address, { contract, currentReward: BigNumber.from(0) });
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
