import * as OcrAggregator from '../../../../../artifacts/OffchainAggregatorBilling.json';
import * as wizardText from '../../../../../resources/wizard.json';
import { BigNumber, Contract, providers, utils } from 'ethers';
import { BillingSet, FeedRewardStatus } from '../../../../model/feed_reward_status';
import { AddressInfo } from '../../../../model/address_info';
import { Helper } from '../../../../helper/help';
import { TrxInfo } from '../../../../model/trx_info';
import _ from 'lodash';

const GAS_USAGE: BigNumber = BigNumber.from(231255);

export class OcrFeedRewardService {
  async _getTrxInfo(provider: providers.BaseProvider, transactionHash: string): Promise<TrxInfo> {
    const transactionResponse: providers.TransactionResponse = await provider.getTransaction(transactionHash);
    const transactionReceipt: providers.TransactionReceipt = await provider.getTransactionReceipt(transactionHash);
    return { transactionReceipt: transactionReceipt, transactionResponse: transactionResponse };
  }

  _getReplyForChangedTransmitterValues(feedStatus: FeedRewardStatus<BillingSet>, billingSet: BillingSet): string {
    let message: string = '';
    if (!feedStatus.rewardData.linkWeiPerTransmission.eq(billingSet.linkWeiPerTransmission)) {
      message += wizardText.ocr_feed_wizard.replies.reward_per_transmission_change.format(
        Helper.parseLinkWeiToLink(feedStatus.rewardData.linkWeiPerTransmission, 4),
        Helper.parseLinkWeiToLink(billingSet.linkWeiPerTransmission, 4)
      );
    }
    if (!feedStatus.rewardData.linkPerEth.eq(billingSet.linkPerEth)) {
      message += wizardText.ocr_feed_wizard.replies.eth_per_link_change.format(
        feedStatus.rewardData.linkPerEth.toString(),
        billingSet.linkPerEth.toString()
      );
    }
    return message;
  }

  _getNewTransmitterReward(billingSet: BillingSet, currentGasPrice: BigNumber, gasUsed: BigNumber): BigNumber {
    if (currentGasPrice.gte(billingSet.reasonableGasPriceInWei)) {
      return gasUsed.mul(currentGasPrice).mul(billingSet.linkPerEth).add(billingSet.linkWeiPerTransmission);
    } else {
      const gasBonus: BigNumber = billingSet.reasonableGasPriceInWei.sub(currentGasPrice).div(BigNumber.from(2));
      const newCurrentGasPrice: BigNumber = currentGasPrice.add(gasBonus);
      return gasUsed.mul(newCurrentGasPrice).mul(billingSet.linkPerEth).add(billingSet.linkWeiPerTransmission);
    }
  }

  _getAverageTransmitterReward(
    currentFeedStatus: Map<string, FeedRewardStatus<BillingSet>>,
    gasPrice: BigNumber
  ): BigNumber {
    let totalTransmitterRewards: BigNumber = BigNumber.from(0);
    for (const feedStatus of currentFeedStatus.values()) {
      totalTransmitterRewards = totalTransmitterRewards.add(
        this._getNewTransmitterReward(feedStatus.rewardData, gasPrice, GAS_USAGE)
      );
    }
    return totalTransmitterRewards.div(currentFeedStatus.size);
  }

  _isTransmitterRewardChanged(
    feedStatus: FeedRewardStatus<BillingSet>,
    linkWeiPerTransmission: BigNumber,
    linkPerEth: BigNumber
  ): boolean {
    return (
      !feedStatus.rewardData.linkWeiPerTransmission.eq(linkWeiPerTransmission) ||
      !feedStatus.rewardData.linkPerEth.eq(linkPerEth)
    );
  }

  _isObservationRewardChanged(feedStatus: FeedRewardStatus<BillingSet>, linkWeiPerObservation: BigNumber): boolean {
    return !feedStatus.rewardData.linkWeiPerObservation.eq(linkWeiPerObservation);
  }

  _updateCurrentBillingSet(feedStatus: FeedRewardStatus<BillingSet>, newBillingSet: BillingSet): void {
    if (!_.isEqual(feedStatus.rewardData, newBillingSet)) {
      feedStatus.rewardData = newBillingSet;
    }
  }

  _createOcrContracts(
    addressYaml: AddressInfo,
    currentFeedStatus: Map<string, FeedRewardStatus<BillingSet>>,
    provider: providers.BaseProvider
  ): void {
    for (const contractInfo of addressYaml.ocr.contracts) {
      const contract: Contract = new Contract(contractInfo.address, OcrAggregator.abi, provider);
      currentFeedStatus.set(contractInfo.name, {
        contract,
        rewardData: {
          linkPerEth: BigNumber.from(0),
          linkWeiPerObservation: BigNumber.from(0),
          linkWeiPerTransmission: BigNumber.from(0),
          maximumGasPriceInWei: BigNumber.from(0),
          reasonableGasPriceInWei: BigNumber.from(0),
        },
      });
    }
  }

  async _setCurrentBillingSetOnFeeds(currentFeedStatus: Map<string, FeedRewardStatus<BillingSet>>): Promise<void> {
    for (const feedStatus of currentFeedStatus.values()) {
      const currentBillingSetList: number[] = await feedStatus.contract.getBilling();
      const currentBillingSet: BillingSet = this._createBillingSet(currentBillingSetList);
      feedStatus.rewardData = currentBillingSet;
    }
  }

  _createBillingSet(contractReturnValue: number[]): BillingSet {
    return {
      linkPerEth: BigNumber.from(contractReturnValue[2]).div(utils.parseUnits('1', 'mwei')),
      linkWeiPerObservation: utils.parseUnits(contractReturnValue[3].toString(), 'gwei'),
      linkWeiPerTransmission: utils.parseUnits(contractReturnValue[4].toString(), 'gwei'),
      maximumGasPriceInWei: utils.parseUnits(contractReturnValue[0].toString(), 'gwei'),
      reasonableGasPriceInWei: utils.parseUnits(contractReturnValue[1].toString(), 'gwei'),
    };
  }
}
