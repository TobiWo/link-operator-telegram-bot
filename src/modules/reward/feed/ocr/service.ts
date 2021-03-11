import * as OcrAggregator from '../../../../../artifacts/OffchainAggregatorBilling.json';
import * as wizardText from '../../../../../resources/wizard.json';
import { BigNumber, Contract, providers, utils } from 'ethers';
import { BillingSet, FeedRewardStatus } from '../../../../model/feed_reward_status';
import { AddressInfo } from '../../../../model/address_info';
import { Helper } from '../../../../helper/help';
import { TrxInfo } from '../../../../model/trx_info';
import _ from 'lodash';

export const GAS_USAGE: BigNumber = BigNumber.from(231255);

/**
 * Service for OcrFeedRewardWizard.
 * The service handles all telegraf independent logic.
 */
export class OcrFeedRewardService {
  /**
   * Returns transaction info object
   *
   * @todo Currently the transaction-receipt is fetched for the same trx. In the code of the service this refers
   * to the trx where the BillingSet was adapted. For the gas price this is correct but for the gas usage it is the
   * wrong trx. Here I need to use the transmission-trx vom the specific contract (find the last transmission trx on contract).
   * As workaround, I ignore the transaction-receipt and use a hardcoded number for gas-usage (see where function is called)
   *
   * @param provider provider to retrieve transaction information
   * @param transactionHash
   * @returns object with TransactionResponse and TransactionReceipt
   */
  async _getTrxInfo(provider: providers.BaseProvider, transactionHash: string): Promise<TrxInfo> {
    const transactionResponse: providers.TransactionResponse = await provider.getTransaction(transactionHash);
    const transactionReceipt: providers.TransactionReceipt = await provider.getTransactionReceipt(transactionHash);
    return { transactionReceipt: transactionReceipt, transactionResponse: transactionResponse };
  }

  /**
   * Returns a reply-message which displays changes for different transmitter reward values
   *
   * @param feedStatus feed-status object
   * @param billingSet object which holds new reward values
   * @returns reply-message with different transmitter reward values
   */
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

  /**
   * Creates the transmitter reward for the new billing-set and defined gas price. This follows the
   * Chainlink definition how to calculate the ocr-transmitter-reward.
   *
   * @param billingSet billing set object
   * @param currentGasPrice current gas price
   * @param gasUsed gas used for a transmitter trx
   * @returns new transmitter reward
   */
  _getNewTransmitterReward(billingSet: BillingSet, currentGasPrice: BigNumber, gasUsed: BigNumber): BigNumber {
    if (currentGasPrice.gte(billingSet.reasonableGasPriceInWei)) {
      return gasUsed.mul(currentGasPrice).mul(billingSet.linkPerEth).add(billingSet.linkWeiPerTransmission);
    } else {
      const gasBonus: BigNumber = billingSet.reasonableGasPriceInWei.sub(currentGasPrice).div(BigNumber.from(2));
      const newCurrentGasPrice: BigNumber = currentGasPrice.add(gasBonus);
      return gasUsed.mul(newCurrentGasPrice).mul(billingSet.linkPerEth).add(billingSet.linkWeiPerTransmission);
    }
  }

  /**
   * Returns the average observation reward for all ocr-contracts.
   *
   * @param currentFeedStatus status of all feeds
   * @returns average observation reward for all ocr-contracts
   */
  _getAverageObservationReward(currentFeedStatus: Map<string, FeedRewardStatus<BillingSet>>): BigNumber {
    let totalObservationReward: BigNumber = BigNumber.from(0);
    for (const feedStatus of currentFeedStatus.values()) {
      totalObservationReward = totalObservationReward.add(feedStatus.rewardData.linkWeiPerObservation);
    }
    return totalObservationReward.div(currentFeedStatus.size);
  }

  /**
   * Returns the average transmitter reward for all ocr-contracts. This is higly volatile as it depends from
   * many factors.
   *
   * @param currentFeedStatus status of all feeds
   * @param gasPrice selected gas price
   * @returns average transmitter reward for all ocr-contracts
   */
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

  /**
   * Checks whether relevant transmitter reward values were changed in comparison to the current settings.
   * Is called when an BillingSet-event was emitted.
   *
   * @param feedStatus feed status of one feed
   * @param linkWeiPerTransmission value recorded in BillingSet-event
   * @param linkPerEth value recorded in BillingSet-event
   * @returns whether any transmitter reward value changed
   */
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

  /**
   * Checks whether the observation reward value was changed. Is called when an BillingSet-event was emitted.
   *
   * @param feedStatus feed status of one feed
   * @param linkWeiPerObservation value recorded in BillingSet-event
   * @returns whether observation reward value changed
   */
  _isObservationRewardChanged(feedStatus: FeedRewardStatus<BillingSet>, linkWeiPerObservation: BigNumber): boolean {
    return !feedStatus.rewardData.linkWeiPerObservation.eq(linkWeiPerObservation);
  }

  /**
   * Updates the supplied feed status via call by reference
   *
   * @param feedStatus feed status of one feed
   * @param newBillingSet updated BillingSet
   */
  _updateCurrentBillingSet(feedStatus: FeedRewardStatus<BillingSet>, newBillingSet: BillingSet): void {
    if (!_.isEqual(feedStatus.rewardData, newBillingSet)) {
      feedStatus.rewardData = newBillingSet;
    }
  }

  /**
   * Creates contract-objects and stores it in the supplied empty currentFeedStatus-Map via call by reference.
   *
   * @param addressYaml full address_info.yml typescript represenation
   * @param currentFeedStatus empty map for all feed status
   * @param provider provider which is used to connect to the blockchain via contract-object
   */
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

  /**
   * Sets current BillingSet for all feeds
   *
   * @param currentFeedStatus map for all feed status
   */
  async _setCurrentBillingSetOnFeeds(currentFeedStatus: Map<string, FeedRewardStatus<BillingSet>>): Promise<void> {
    for (const feedStatus of currentFeedStatus.values()) {
      const currentBillingSetList: number[] = await feedStatus.contract.getBilling();
      const currentBillingSet: BillingSet = this._createBillingSet(currentBillingSetList);
      feedStatus.rewardData = currentBillingSet;
    }
  }

  /**
   * Creates a BillingSet/set of reward values as stored in the ocr-contract.
   * Note: The units are different compared to the ocr-contract as using wei or full eth are more intuitive.
   *
   * @param contractReturnValue can be the return-value from getBilling or the first part of the emitted BillingEvent
   * @returns set of reward values as defined in ocr-contracts
   */
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
