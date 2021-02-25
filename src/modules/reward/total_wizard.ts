import '../../prototype/string.extensions';
import * as FluxAggregator from '../../../artifacts/FluxAggregator.json';
import * as LinkToken from '../../../artifacts/LinkToken.json';
import * as OcrAggregator from '../../../artifacts/OCR.json';
import * as wizardText from '../../../resources/wizard.json';
import { AddressInfo, ContractInfo } from '../../interface/address_info';
import { Scenes, Composer } from 'telegraf';
import { providers, Contract, BigNumber } from 'ethers';
import { Helper } from '../../helper/help';

export class RewardBalanceWizard {
  constructor(private addressYaml: AddressInfo, private provider: providers.BaseProvider) {}

  getWizard(): Scenes.WizardScene<Scenes.WizardContext> {
    const stepHandler = new Composer<Scenes.WizardContext>();
    stepHandler.command(wizardText.commands.long.current_total_balance, async (ctx) => {
      await this.handleRewardBalanceContext(ctx);
    });
    stepHandler.command(wizardText.commands.short.current_total_balance, async (ctx) => {
      await this.handleRewardBalanceContext(ctx);
    });
    stepHandler.command(wizardText.commands.long.leave, async (ctx) => {
      await ctx.reply(wizardText.general_replies.leaving);
      return ctx.scene.leave();
    });
    stepHandler.help(async (ctx) => {
      await ctx.reply(wizardText.total_wizard.replies.help);
    });
    const rewardWizard = new Scenes.WizardScene(wizardText.total_wizard.name, stepHandler);
    return rewardWizard;
  }

  private async handleRewardBalanceContext(ctx: Scenes.WizardContext): Promise<void> {
    await ctx.reply(wizardText.total_wizard.replies.fetching);
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
      wizardText.total_wizard.replies.total_ocr_contrats.format(
        Helper.getLinkValueWithTwoDecimals(currentOcrContractRewards)
      )
    );
    await ctx.reply(
      wizardText.total_wizard.replies.total_ocr_payee.format(Helper.getLinkValueWithTwoDecimals(currentOcrPayeeRewards))
    );
    await ctx.reply(
      wizardText.total_wizard.replies.total_flux.format(Helper.getLinkValueWithTwoDecimals(currentFluxRewards))
    );
    await ctx.reply(wizardText.total_wizard.replies.total.format(Helper.getLinkValueWithTwoDecimals(totalBalance)));
  }

  private async getCurrentRewardsOnContracts(contracts: ContractInfo[], abi: any, isFlux: boolean): Promise<BigNumber> {
    let totalReward: BigNumber = BigNumber.from('0');
    for (const feedAddress of contracts.map((item) => item.address)) {
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
