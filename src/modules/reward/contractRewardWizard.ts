import * as FluxAggregator from '../../../artifacts/FluxAggregator.json';
import * as settings from '../../../settings.json';
import { Scenes, Composer } from 'telegraf';
import { providers, Contract, BigNumber, utils } from 'ethers';

const ORACLE: string = '0xf6025e63cee5E436a5F1486e040aEEAd7e97B745';
// const CONTRACT_ADDRESSES: string[] = [
//   '0x7E6C635d6A53B5033D1B0ceE84ecCeA9096859e4',
//   '0x8cDE021F0BfA5f82610e8cE46493cF66AC04Af53',
//   '0xD79C42be9f47f54a37A835Ad2BeA06f0e847cC91',
//   '0x174b0B72ca036b0b64F190Ed83630751195D3362',
//   '0x204A6FE11De66aa463879f47F3533Dd87d47020D',
//   '0x060f728deB96875F992C97414eFf2B3ef6c58EC7',
//   '0xE9066571029B6FDaF5384853c384c7B01Bf39641',
//   '0x5977d45ba0a1ffc3740506d07f5693bbc45df3c7',
//   '0x41306eb5fc11a68c284c19ba3b9510c0252e0a34',
//   '0x3f2d1ff4930318b5a7c301e1bf7e703dcf6d83e3',
//   '0x4d35fe9c85233a8e00ae2d3c0d912a45bc781025',
//   '0x38cb8642a0fc558918fced939450d689d0e5a7be',
//   '0x75ed2f61837c3d9ef1bf0af4db84664dc6fe56bc',
//   '0xA3eAeC3AB66048E6F3Cf23D81881a3fcd9A3D2ED',
//   '0xaBb243ac767D0b7FCaa0BD5e19A7BA0D339d0B33',
//   '0xD286AF227B7b0695387E279B9956540818B1dc2a',
//   '0x42F3b59f72772EB5794B04D2d85aFAC0D30A5683',
//   '0x79D32CfAc14A486D9Cc5AF8f6542Fffc604F03Db',
//   '0x2f6BfbBB5d9CD374574Aa552dC6942C01D330C75',
//   '0x8640798469204DBbAd5842f8688B152c510F7777',
//   '0x5B0e9Ff11aae806067787d380967900551919c0D',
//   '0x955bbbB41b6FCe89aD3CdE8f74F964e99036BD52',
//   '0x07F91B341be87A94A36eC052D3468cfD1FA29aA6',
//   '0x49966068819c6c5109a7291EC91994DBC76e9977',
//   '0x1687f4e3293CC8ABEb896b9e082f6B195202D95E',
//   '0x484201B46cDCc415C829B71ebC51D9565cE3649A',
// ];

export class RewardBalanceWizard {
  private infuraProvider: providers.InfuraProvider;

  constructor() {
    this.infuraProvider = new providers.InfuraProvider('homestead', {
      projectId: settings.infuraProjectId,
      projectSecret: settings.infuraProjectSecret,
    });
  }

  // don't get back wizard but only Composer
  // build the main Wizard from all Composers in WizardClass
  // or follow https://github.com/dmbaranov/evemovies-bot/blob/5f6f5295f6072e513b6d4eb9066f890966e764d4/src/bot.ts or https://github.com/telegraf/telegraf/issues/540
  // or https://github.com/telegraf/telegraf/blob/develop/docs/examples/wizards/wizard-bot.ts
  // build wizard with no commands and set command like in first two links
  getCurrentRewardBalanceWizard(): Scenes.WizardScene<Scenes.WizardContext> {
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
      await ctx.reply('Available commands:\n/currentTotalBalance (/ctb) - total balance of rewards on all contracts');
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
    const contract: Contract = new Contract(
      '0x2f6BfbBB5d9CD374574Aa552dC6942C01D330C75',
      FluxAggregator.abi,
      this.infuraProvider
    );
    return await contract.withdrawablePayment(ORACLE);
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

export default new RewardBalanceWizard().getCurrentRewardBalanceWizard();
