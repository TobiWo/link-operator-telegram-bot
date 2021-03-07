import '../../../prototype/string.extensions';
import * as FluxAggregator from '../../../../artifacts/FluxAggregator.json';
import * as OcrAggregator from '../../../../artifacts/OCR.json';
import * as wizardText from '../../../../resources/wizard.json';
import { BigNumber, providers } from 'ethers';
import { Scenes, Composer } from 'telegraf';
import { AddressInfo } from '../../../model/address_info';
import { Helper } from '../../../helper/help';
import { Replier } from '../../../general_replier';
import { TotalRewardService } from './service';

export class TotalRewardWizard {
  private rewardServive: TotalRewardService;

  constructor(private addressYaml: AddressInfo, private provider: providers.BaseProvider) {
    this.rewardServive = new TotalRewardService(this.provider);
  }

  getWizard(): Scenes.WizardScene<Scenes.WizardContext> {
    const wizardMainMenu: Composer<Scenes.WizardContext<Scenes.WizardSessionData>> = this.getWizardMainMenu();
    const rewardWizard = new Scenes.WizardScene(wizardText.total_wizard.name, wizardMainMenu);
    return rewardWizard;
  }

  private getWizardMainMenu(): Composer<Scenes.WizardContext<Scenes.WizardSessionData>> {
    const mainMenu = new Composer<Scenes.WizardContext>();
    mainMenu.command(wizardText.commands.long.current_total_balance, async (ctx) => {
      await this.getRewardBalanceStep(ctx);
    });
    mainMenu.command(wizardText.commands.short.current_total_balance, async (ctx) => {
      await this.getRewardBalanceStep(ctx);
    });
    mainMenu.command(wizardText.commands.long.leave, async (ctx) => {
      await ctx.reply(wizardText.general_replies.leaving);
      await Replier.replyBotMainMenu(ctx);
      return ctx.scene.leave();
    });
    mainMenu.help(async (ctx) => {
      await ctx.replyWithMarkdownV2(wizardText.total_wizard.replies.help);
    });
    return mainMenu;
  }

  private async getRewardBalanceStep(ctx: Scenes.WizardContext): Promise<void> {
    await ctx.reply(wizardText.total_wizard.replies.fetching);
    const currentFluxRewards = await this.rewardServive._getCurrentRewardsOnContracts(
      this.addressYaml.flux.contracts,
      this.addressYaml.flux.oracle,
      FluxAggregator.abi,
      true
    );
    const currentOcrContractRewards = await this.rewardServive._getCurrentRewardsOnContracts(
      this.addressYaml.ocr.contracts,
      this.addressYaml.ocr.oracle,
      OcrAggregator.abi,
      false
    );
    const currentOcrPayeeRewards = await this.rewardServive._getCurrentOcrPayeeRewards(
      this.addressYaml.link_token_contract,
      this.addressYaml.ocr.payee
    );
    const totalBalance: BigNumber = currentOcrContractRewards.add(currentFluxRewards).add(currentOcrPayeeRewards);
    await ctx.reply(
      wizardText.total_wizard.replies.total_ocr_contrats.format(
        Helper.parseLinkWeiToLink(currentOcrContractRewards, 2)
      )
    );
    await ctx.reply(
      wizardText.total_wizard.replies.total_ocr_payee.format(
        Helper.parseLinkWeiToLink(currentOcrPayeeRewards, 2)
      )
    );
    await ctx.reply(
      wizardText.total_wizard.replies.total_flux.format(Helper.parseLinkWeiToLink(currentFluxRewards, 2))
    );
    await ctx.reply(
      wizardText.total_wizard.replies.total.format(Helper.parseLinkWeiToLink(totalBalance, 2))
    );
  }
}
