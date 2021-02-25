import * as OcrAggregator from '../../../artifacts/OffchainAggregatorBilling.json';
import * as wizardText from '../../../resources/wizard.json';
import { Context, Scenes, Composer, Markup } from 'telegraf';
import { OcrFeedRewardStatus, BillingSet } from '../../interface/feed_reward_status';
import { providers, Contract, BigNumber } from 'ethers';
import { AddressInfo } from '../../interface/address_info';
import { Helper } from '../../helper/help';
import _ from 'lodash';

const BILLING_SET_NAME: string = 'BillingSet';
const WEI_PER_GWEI: BigNumber = BigNumber.from(10 ** 9);
const MICROLINK_PER_LINK: BigNumber = BigNumber.from(10 ** 6);

export class OcrFeedRewardWizard {
  private currentFeedStatus: Map<string, OcrFeedRewardStatus> = new Map();

  constructor(private addressYaml: AddressInfo, private provider: providers.BaseProvider) {
    this.createOcrContracts();
  }

  async init(): Promise<void> {
    await this.setCurrentBillingSetOnFeeds();
  }

  getWizard(): Scenes.WizardScene<Scenes.WizardContext> {
    const stepHandler = new Composer<Scenes.WizardContext>();
    stepHandler.command(wizardText.commands.long.start_listening, async (ctx) => {
      await ctx.replyWithMarkdownV2(
        '*Note: While activating the listener I will potentially spam this chat\\!*',
        Markup.inlineKeyboard([Markup.button.callback('▶️ Start', 'start'), Markup.button.callback('⏹️ Stop', 'stop')])
      );
      return ctx.wizard.selectStep(1);
    });
    stepHandler.command(wizardText.commands.short.start_listening, async (ctx) => {
      return ctx.wizard.next();
      this.feedRewardListeningStep(ctx);
    });
    stepHandler.command(wizardText.commands.long.stop_listening, async (ctx) => {
      // this.stopFeedRewardListeningStep(ctx);
    });
    stepHandler.command(wizardText.commands.short.stop_listening, async (ctx) => {
      // this.stopFeedRewardListeningStep(ctx);
    });
    stepHandler.command(wizardText.commands.long.leave, async (ctx) => {
      await ctx.reply(wizardText.general_replies.leaving);
      return ctx.scene.leave();
    });
    stepHandler.help(async (ctx) => {
      await ctx.reply(wizardText.ocr_feed_wizard.replies.help);
    });
    const rewardWizard = new Scenes.WizardScene(
      wizardText.ocr_feed_wizard.name,
      stepHandler,
      this.confirmListeningStart()
    );
    return rewardWizard;
  }

  private confirmListeningStart(): Composer<Scenes.WizardContext<Scenes.WizardSessionData>> {
    const stepHandler = new Composer<Scenes.WizardContext>();
    stepHandler.action('start', async (ctx) => {
      ctx.reply('start');
      return ctx.wizard.selectStep(0);
    });
    stepHandler.action('stop', async (ctx) => {
      ctx.reply(wizardText.ocr_feed_wizard.replies.help);
      return ctx.wizard.selectStep(0);
    });
    return stepHandler;
  }

  private async feedRewardListeningStep(ctx: Scenes.WizardContext): Promise<void> {
    for (const feedName of this.currentFeedStatus.keys()) {
      const feedStatus: OcrFeedRewardStatus | undefined = this.currentFeedStatus.get(feedName);
      if (feedStatus) {
        if (feedStatus.contract.listeners(BILLING_SET_NAME).length != 0) {
          await ctx.reply(wizardText.ocr_feed_wizard.replies.already_listening);
          return;
        }
        feedStatus.contract.on(BILLING_SET_NAME, async (...args: any) => this.billingSetListener(ctx, feedName, args));
      }
    }
    await ctx.reply(wizardText.ocr_feed_wizard.replies.started_listening);
  }

  private async billingSetListener(ctx: Context, feedName: string, args: any): Promise<void> {
    const retrievedBillingSet: BillingSet = this.createBillingSet(args.slice(0, args.length - 1));
    const transactionLog: providers.Log = args[args.length - 1];
    this.replyOnTransmitterRewardChange(ctx, feedName, retrievedBillingSet, transactionLog.transactionHash);
    this.replyOnObservationRewardChange(ctx, feedName, retrievedBillingSet);
    this.updateCurrentBillingSet(feedName, retrievedBillingSet);
  }

  private async replyOnTransmitterRewardChange(
    ctx: Context,
    feedName: string,
    billingSet: BillingSet,
    transactionHash: string
  ) {
    if (this.isTransmitterRewardChanged(feedName, billingSet.linkWeiPerTransmission, billingSet.linkPerEth)) {
      const trxInfo: TrxInfo = await this.getTrxInfo(transactionHash);
      await ctx.reply(
        wizardText.ocr_feed_wizard.replies.new_transmitter_feed_reward.format(
          feedName,
          Helper.getLinkValueWithTwoDecimals(
            this.getNewTransmitterReward(
              billingSet,
              trxInfo.transactionResponse.gasPrice,
              trxInfo.transactionReceipt.gasUsed
            )
          ),
          trxInfo.transactionResponse.gasPrice.div(WEI_PER_GWEI).toString()
        )
      );
    }
  }

  private async replyOnObservationRewardChange(ctx: Context, feedName: string, billingSet: BillingSet) {
    if (this.isObservationRewardChanged(feedName, billingSet.linkWeiPerObservation)) {
      await ctx.reply(
        wizardText.ocr_feed_wizard.replies.new_observation_feed_reward.format(
          feedName,
          Helper.getLinkValueWithTwoDecimals(billingSet.linkWeiPerObservation)
        )
      );
    }
  }

  private async getTrxInfo(transactionHash: string): Promise<TrxInfo> {
    const transactionResponse: providers.TransactionResponse = await this.provider.getTransaction(transactionHash);
    const transactionReceipt: providers.TransactionReceipt = await this.provider.getTransactionReceipt(transactionHash);
    return { transactionReceipt: transactionReceipt, transactionResponse: transactionResponse };
  }

  private getNewTransmitterReward(billingSet: BillingSet, currentGasPrice: BigNumber, gasUsed: BigNumber): BigNumber {
    if (currentGasPrice.gte(billingSet.reasonableGasPriceInWei)) {
      return gasUsed.mul(currentGasPrice).mul(billingSet.linkPerEth).add(billingSet.linkWeiPerTransmission);
    } else {
      const gasBonus: BigNumber = billingSet.reasonableGasPriceInWei.sub(currentGasPrice).div(BigNumber.from(2));
      const newCurrentGasPrice: BigNumber = currentGasPrice.add(gasBonus);
      return gasUsed.mul(newCurrentGasPrice).mul(billingSet.linkPerEth).add(billingSet.linkWeiPerTransmission);
    }
  }

  private isTransmitterRewardChanged(name: string, linkWeiPerTransmission: BigNumber, linkPerEth: BigNumber): boolean {
    const ocrFeedStatus: OcrFeedRewardStatus | undefined = this.currentFeedStatus.get(name);
    if (ocrFeedStatus) {
      return (
        !ocrFeedStatus.billingSet.linkWeiPerTransmission.eq(linkWeiPerTransmission) ||
        !ocrFeedStatus.billingSet.linkPerEth.eq(linkPerEth)
      );
    }
    return false;
  }

  private isObservationRewardChanged(name: string, linkWeiPerObservation: BigNumber): boolean {
    const ocrFeedStatus: OcrFeedRewardStatus | undefined = this.currentFeedStatus.get(name);
    if (ocrFeedStatus) {
      return !ocrFeedStatus.billingSet.linkWeiPerObservation.eq(linkWeiPerObservation);
    }
    return false;
  }

  private updateCurrentBillingSet(name: string, newBillingSet: BillingSet): void {
    const ocrFeedStatus: OcrFeedRewardStatus | undefined = this.currentFeedStatus.get(name);
    if (ocrFeedStatus && !_.isEqual(ocrFeedStatus.billingSet, newBillingSet)) {
      ocrFeedStatus.billingSet = newBillingSet;
    }
  }

  private createOcrContracts(): void {
    for (const contractInfo of this.addressYaml.ocr.contracts) {
      const contract: Contract = new Contract(contractInfo.address, OcrAggregator.abi, this.provider);
      this.currentFeedStatus.set(contractInfo.name, {
        billingSet: {
          linkPerEth: BigNumber.from(0),
          linkWeiPerObservation: BigNumber.from(0),
          linkWeiPerTransmission: BigNumber.from(0),
          maximumGasPriceInWei: BigNumber.from(0),
          reasonableGasPriceInWei: BigNumber.from(0),
        },
        contract,
      });
    }
  }

  private async setCurrentBillingSetOnFeeds(): Promise<void> {
    for (const feedStatus of this.currentFeedStatus.values()) {
      const currentBillingSetList: number[] = await feedStatus.contract.getBilling();
      const currentBillingSet: BillingSet = this.createBillingSet(currentBillingSetList);
      feedStatus.billingSet = currentBillingSet;
    }
  }

  private createBillingSet(contractReturnValue: number[]): BillingSet {
    return {
      linkPerEth: BigNumber.from(contractReturnValue[2]).div(MICROLINK_PER_LINK),
      linkWeiPerObservation: BigNumber.from(contractReturnValue[3]).mul(WEI_PER_GWEI),
      linkWeiPerTransmission: BigNumber.from(contractReturnValue[4]).mul(WEI_PER_GWEI),
      maximumGasPriceInWei: BigNumber.from(contractReturnValue[0]).mul(WEI_PER_GWEI),
      reasonableGasPriceInWei: BigNumber.from(contractReturnValue[1]).mul(WEI_PER_GWEI),
    };
  }
}

interface TrxInfo {
  transactionResponse: providers.TransactionResponse;
  transactionReceipt: providers.TransactionReceipt;
}
