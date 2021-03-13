import * as FluxAggregator from '../../../../../artifacts/FluxAggregator.json';
import { providers, Contract, BigNumber } from 'ethers';
import { AddressInfo } from '../../../../model/address_info';
import { FeedRewardStatus } from '../../../../model/feed_reward_status';

/**
 * Service for FluxFeedRewardWizard.
 * The service handles all telegraf independent logic.
 */
export class FluxFeedRewardService {
  /**
   * Returns average feed reward for all flux feeds
   *
   * @param currentFeedStatus map with all feed status
   * @returns average feed reward
   */
  _getAverageFeedRewardAmount(currentFeedStatus: Map<string, FeedRewardStatus<BigNumber>>): BigNumber {
    let totalRewards: BigNumber = BigNumber.from(0);
    for (const feedStatus of currentFeedStatus.values()) {
      totalRewards = totalRewards.add(feedStatus.rewardData);
    }
    return totalRewards.div(BigNumber.from(currentFeedStatus.size));
  }

  /**
   * Updated the feed status with the new feed reward
   *
   * @param feedStatus feed status
   * @param newReward new feed reward
   */
  _updateCurrentFeedReward(feedStatus: FeedRewardStatus<BigNumber>, newReward: BigNumber): void {
    if (!feedStatus.rewardData.eq(newReward)) {
      feedStatus.rewardData = newReward;
    }
  }

  /**
   * Creates contract-objects and stores it in the supplied empty currentFeedStatus-Map via call by reference.
   *
   * @param currentFeedStatus empty map for all feed status
   * @param addressYaml full address_info.yml typescript represenation
   * @param provider provider which is used to connect to the blockchain via contract-object
   */
  _createFluxContracts(
    currentFeedStatus: Map<string, FeedRewardStatus<BigNumber>>,
    addressYaml: AddressInfo,
    provider: providers.BaseProvider
  ): void {
    for (const contractInfo of addressYaml.flux.contracts) {
      const contract: Contract = new Contract(contractInfo.address, FluxAggregator.abi, provider);
      currentFeedStatus.set(contractInfo.name, { contract, rewardData: BigNumber.from(0) });
    }
  }

  /**
   * Initially retrieves the current reward values from contracts and stores it in memory.
   * Used during instantiation.
   *
   * @param currentFeedStatus map with all feed status
   */
  async _setCurrentRewardsOnFeeds(currentFeedStatus: Map<string, FeedRewardStatus<BigNumber>>): Promise<void> {
    for (const feedStatus of currentFeedStatus.values()) {
      const currentPaymentAmount: BigNumber = await feedStatus.contract.paymentAmount();
      feedStatus.rewardData = currentPaymentAmount;
    }
  }
}