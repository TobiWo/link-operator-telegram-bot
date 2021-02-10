import * as FluxAggregator from '../../../artifacts/FluxAggregator.json';
import * as LinkToken from '../../../artifacts/LinkToken.json';
import * as OcrAggregator from '../../../artifacts/OCR.json';
// import * as RunlogAggregator from '../../../artifacts/Oracle.json';
import { Scenes, Composer } from 'telegraf';
import { providers, Contract, BigNumber, utils } from 'ethers';
import { AddressInfo } from '../../interface/address_info';

export class RewardBalanceWizard {
  constructor(private addressYaml: AddressInfo, private provider: providers.BaseProvider) {}

  getWizard(): Scenes.WizardScene<Scenes.WizardContext> {
    const stepHandler = new Composer<Scenes.WizardContext>();
    stepHandler.command('currentTotalBalance', async (ctx) => {
      await this.handleRewardBalanceContext(ctx);
    });
    stepHandler.command('ctb', async (ctx) => {
      await this.handleRewardBalanceContext(ctx);
    });
    stepHandler.command('leave', async (ctx) => {
      await ctx.reply('Leaving module!');
      return ctx.scene.leave();
    });
    stepHandler.help(async (ctx) => {
      await ctx.reply(
        'Available commands:\n/currentTotalBalance (/ctb) - total balance of rewards on all active feeds\n\
/leave - leaves the current module'
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
      OcrAggregator.abi,
      false
    );
    const currentOcrPayeeRewards = await this.getCurrentOcrPayeeRewards();
    const totalBalance: BigNumber = currentOcrContractRewards.add(currentFluxRewards).add(currentOcrPayeeRewards);
    await ctx.reply(
      `Total balance on OCR-contracts: ${this.getLinkValueWithTwoDecimals(currentOcrContractRewards)} LINK`
    );
    await ctx.reply(
      `Total balance on OCR-payee-address: ${this.getLinkValueWithTwoDecimals(currentOcrPayeeRewards)} LINK`
    );
    await ctx.reply(`Total balance on Flux-contracts: ${this.getLinkValueWithTwoDecimals(currentFluxRewards)} LINK`);
    await ctx.reply(`Current total balance is: ${this.getLinkValueWithTwoDecimals(totalBalance)} LINK`);
  }

  private getLinkValueWithTwoDecimals(linkInWei: BigNumber): string {
    const valueString: string = utils.formatEther(linkInWei);
    return valueString.slice(0, valueString.indexOf('.') + 3);
  }

  private async getCurrentRewardsOnContracts(contracts: string[], abi: any, isFlux: boolean): Promise<BigNumber> {
    let totalReward: BigNumber = BigNumber.from('0');
    for (const feedAddress of contracts) {
      const contract: Contract = new Contract(feedAddress, abi, this.provider);
      if (isFlux) {
        totalReward = totalReward.add(await contract.withdrawablePayment(this.addressYaml.flux.oracle));
      } else {
        totalReward = totalReward.add(await contract.owedPayment(this.addressYaml.ocr.oracle));
      }
    }
    return totalReward;
  }

  private async getCurrentOcrPayeeRewards(): Promise<BigNumber> {
    const contract: Contract = new Contract(this.addressYaml.link_token_contract, LinkToken.abi, this.provider);
    return await contract.balanceOf(this.addressYaml.ocr.payee);
  }
}
