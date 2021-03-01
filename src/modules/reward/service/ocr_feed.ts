import * as OcrAggregator from '../../../../artifacts/OffchainAggregatorBilling.json';
import { BigNumber, Contract, providers } from 'ethers';
import { BillingSet, FeedRewardStatus } from '../../../model/feed_reward_status';
import { AddressInfo } from '../../../model/address_info';
import { TrxInfo } from '../../../model/trx_info';
import _ from 'lodash';

export const MICROLINK_PER_LINK: BigNumber = BigNumber.from(10 ** 6);
export const WEI_PER_GWEI: BigNumber = BigNumber.from(10 ** 9);

export class OcrFeedRewardService {
  async _getTrxInfo(provider: providers.BaseProvider, transactionHash: string): Promise<TrxInfo> {
    const transactionResponse: providers.TransactionResponse = await provider.getTransaction(transactionHash);
    const transactionReceipt: providers.TransactionReceipt = await provider.getTransactionReceipt(transactionHash);
    return { transactionReceipt: transactionReceipt, transactionResponse: transactionResponse };
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

  _isTransmitterRewardChanged(
    currentFeedStatus: Map<string, FeedRewardStatus<BillingSet>>,
    name: string,
    linkWeiPerTransmission: BigNumber,
    linkPerEth: BigNumber
  ): boolean {
    const ocrFeedStatus: FeedRewardStatus<BillingSet> | undefined = currentFeedStatus.get(name);
    if (ocrFeedStatus) {
      return (
        !ocrFeedStatus.rewardData.linkWeiPerTransmission.eq(linkWeiPerTransmission) ||
        !ocrFeedStatus.rewardData.linkPerEth.eq(linkPerEth)
      );
    }
    return false;
  }

  _isObservationRewardChanged(
    currentFeedStatus: Map<string, FeedRewardStatus<BillingSet>>,
    name: string,
    linkWeiPerObservation: BigNumber
  ): boolean {
    const ocrFeedStatus: FeedRewardStatus<BillingSet> | undefined = currentFeedStatus.get(name);
    if (ocrFeedStatus) {
      return !ocrFeedStatus.rewardData.linkWeiPerObservation.eq(linkWeiPerObservation);
    }
    return false;
  }

  _updateCurrentBillingSet(
    currentFeedStatus: Map<string, FeedRewardStatus<BillingSet>>,
    name: string,
    newBillingSet: BillingSet
  ): void {
    const ocrFeedStatus: FeedRewardStatus<BillingSet> | undefined = currentFeedStatus.get(name);
    if (ocrFeedStatus && !_.isEqual(ocrFeedStatus.rewardData, newBillingSet)) {
      ocrFeedStatus.rewardData = newBillingSet;
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
      linkPerEth: BigNumber.from(contractReturnValue[2]).div(MICROLINK_PER_LINK),
      linkWeiPerObservation: BigNumber.from(contractReturnValue[3]).mul(WEI_PER_GWEI),
      linkWeiPerTransmission: BigNumber.from(contractReturnValue[4]).mul(WEI_PER_GWEI),
      maximumGasPriceInWei: BigNumber.from(contractReturnValue[0]).mul(WEI_PER_GWEI),
      reasonableGasPriceInWei: BigNumber.from(contractReturnValue[1]).mul(WEI_PER_GWEI),
    };
  }
}
