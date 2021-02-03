import * as FluxAggregator from '../../../artifacts/FluxAggregator.json';
import * as LinkToken from '../../../artifacts/LinkToken.json';
// import * as RunlogAggregator from '../../../artifacts/Oracle.json';
import * as settings from '../../../settings.json';
import { Scenes, Composer } from 'telegraf';
import { providers, Contract, BigNumber, utils } from 'ethers';

const OCR_ABI: string[] = ['function owedPayment(address _transmitter) public view returns (uint256)'];

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
    const currentFluxRewards = await this.getCurrentRewardsOnContracts(
      this.addressYaml.flux.contracts,
      FluxAggregator.abi,
      true
    );
    const currentOcrContractRewards = await this.getCurrentRewardsOnContracts(
      this.addressYaml.ocr.contracts,
      OCR_ABI,
      false
    );
    const currentOcrPayeeRewards = await this.getCurrentOcrPayeeRewards();
    const totalBalance: BigNumber = currentOcrContractRewards.add(currentFluxRewards).add(currentOcrPayeeRewards);
    await ctx.reply(`Total balance on OCR-contracts: ${utils.formatEther(currentOcrContractRewards)} LINK`);
    await ctx.reply(`Total balance on OCR-payee-address: ${utils.formatEther(currentOcrPayeeRewards)} LINK`);
    await ctx.reply(`Total balance on Flux-contracts: ${utils.formatEther(currentFluxRewards)} LINK`);
    await ctx.reply(`Current total balance is: ${utils.formatEther(totalBalance)} LINK`);
  }

  private async getCurrentRewardsOnContracts(contracts: string[], abi: any, isFlux: boolean): Promise<BigNumber> {
    let totalReward: BigNumber = BigNumber.from('0');
    for (const feedAddress of contracts) {
      const contract: Contract = new Contract(feedAddress, abi, this.infuraProvider);
      if (isFlux) {
        totalReward = totalReward.add(await contract.withdrawablePayment(this.addressYaml.flux.oracle));
      } else {
        totalReward = totalReward.add(await contract.owedPayment(this.addressYaml.ocr.oracle));
      }
    }
    return totalReward;
  }

  private async getCurrentOcrPayeeRewards(): Promise<BigNumber> {
    const contract: Contract = new Contract(this.addressYaml.link_token_contract, LinkToken.abi, this.infuraProvider);
    return await contract.balanceOf(this.addressYaml.ocr.payee);
  }

  // private async getCurrentRunlogReward(): Promise<BigNumber> {
  //   const contract: Contract = new Contract(this.addressYaml.runlog.owner, RunlogAggregator.abi, this.infuraProvider);
  // }
}

// export default new RewardBalanceWizard().getCurrentRewardBalanceWizard();
