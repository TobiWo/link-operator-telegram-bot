import * as FluxAggregator from '../../../artifacts/FluxAggregator.json';
import * as settings from '../../../settings.json';
import { Scenes, Composer } from 'telegraf';
import { providers, Contract, BigNumber, utils } from 'ethers';

export class RewardBalanceWizard {
  private infuraProvider: providers.InfuraProvider;

  constructor(private addressYaml: any) {
    this.infuraProvider = new providers.InfuraProvider('homestead', {
      projectId: settings.infuraProjectId,
      projectSecret: settings.infuraProjectSecret,
    });
  }

  getRewardBalanceWizard(): Scenes.WizardScene<Scenes.WizardContext> {
    const stepHandler = new Composer<Scenes.WizardContext>();
    stepHandler.command('currentTotalBalance', async (ctx) => {
      await this.handleRewardBalanceContext(ctx);
      return ctx.scene.leave();
    });
    stepHandler.command('ctb', async (ctx) => {
      await this.handleRewardBalanceContext(ctx);
      return ctx.scene.leave();
    });
    stepHandler.help(async (ctx) => {
      await ctx.reply(
        'Available commands:\n/currentTotalBalance (/ctb) - total balance of rewards on all active feeds'
      );
    });
    const rewardWizard = new Scenes.WizardScene('reward-wizard', stepHandler);
    return rewardWizard;
  }

  private async handleRewardBalanceContext(ctx: Scenes.WizardContext): Promise<void> {
    await ctx.reply('Fetching rewards...');
    const currentRewards = await this.getCurrentReward();
    await ctx.reply(`Current total balance is: ${utils.formatEther(currentRewards)} LINK`);
  }

  private async getCurrentReward(): Promise<BigNumber> {
    let totalReward: BigNumber = BigNumber.from('0');
    for (const feedAddress of this.addressYaml['flux_contracts']) {
      const contract: Contract = new Contract(feedAddress, FluxAggregator.abi, this.infuraProvider);
      totalReward = totalReward.add(await contract.withdrawablePayment(this.addressYaml['prod_oracle']));
    }
    return totalReward;
  }

  // async testOnContract(): Promise<void> {
  //   for (const address of CONTRACT_ADDRESSES) {
  //     const contract: Contract = new Contract(address, FluxAggregator.abi, this.infuraProvider);
  //     console.log(`Listening on contract: ${address}`);
  //     contract.on('AvailableFundsUpdated ', (amount) => {
  //       console.log(`New amount on ${address}: ${amount.toString()}`);
  //     });
  //   }
  // }
}

// export default new RewardBalanceWizard().getCurrentRewardBalanceWizard();
