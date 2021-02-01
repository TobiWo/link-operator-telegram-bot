import * as FluxAggregator from '../../artifacts/FluxAggregator.json';
import * as settings from '../../settings.json';
import { Scenes, Composer } from 'telegraf';
import { providers, Contract, BigNumber, utils } from 'ethers';

const ORACLE: string = '0xf6025e63cee5E436a5F1486e040aEEAd7e97B745';

export class RewardBalanceWizardNew {
  private infuraProvider: providers.InfuraProvider;

  constructor() {
    this.infuraProvider = new providers.InfuraProvider('homestead', {
      projectId: settings.infuraProjectId,
      projectSecret: settings.infuraProjectSecret,
    });
  }

  getCurrentRewardBalanceWizard(): Scenes.WizardScene<Scenes.WizardContext> {
    const stepHandler = new Composer<Scenes.WizardContext>();
    stepHandler.command('otherRewards', async (ctx) => {
      this.contextHandler(ctx);
      return ctx.scene.leave();
    });
    stepHandler.command('oR', async (ctx) => {
      this.contextHandler(ctx);
      return ctx.scene.leave();
    });
    stepHandler.help(async (ctx) => {
      await ctx.reply('Fetch current rewards with commands /otherRewards or /oR');
    });
    const rewardWizard = new Scenes.WizardScene('reward-wizard2', stepHandler);
    return rewardWizard;
  }

  private async contextHandler(ctx: Scenes.WizardContext) {
    await ctx.reply('Fetching rewards...');
    const currentRewards = await this.getCurrentReward();
    await ctx.reply(`Current rewards are: ${utils.formatEther(currentRewards)} LINK`);
  }

  private async getCurrentReward(): Promise<BigNumber> {
    const contract: Contract = new Contract(
      '0x8cDE021F0BfA5f82610e8cE46493cF66AC04Af53',
      FluxAggregator.abi,
      this.infuraProvider
    );
    return await contract.withdrawablePayment(ORACLE);
  }
}

export default new RewardBalanceWizardNew().getCurrentRewardBalanceWizard();
