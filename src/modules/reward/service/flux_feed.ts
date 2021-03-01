import * as FluxAggregator from '../../../../artifacts/FluxAggregator.json';
import { providers, Contract, BigNumber } from 'ethers';
import { AddressInfo } from '../../../model/address_info';
import { FeedRewardStatus } from '../../../model/feed_reward_status';

export class FluxFeedRewardService {
  _getAverageFeedRewardAmount(currentFeedStatus: Map<string, FeedRewardStatus<BigNumber>>): BigNumber {
    let totalRewards: BigNumber = BigNumber.from(0);
    for (const feedStatus of currentFeedStatus.values()) {
      totalRewards = totalRewards.add(feedStatus.rewardData);
    }
    return totalRewards.div(BigNumber.from(currentFeedStatus.size));
  }

  _updateCurrentFeedReward(
    currentFeedStatus: Map<string, FeedRewardStatus<BigNumber>>,
    feedName: string,
    newReward: BigNumber
  ): void {
    const fluxFeedStatus: FeedRewardStatus<BigNumber> | undefined = currentFeedStatus.get(feedName);
    if (fluxFeedStatus && !fluxFeedStatus.rewardData.eq(newReward)) {
      fluxFeedStatus.rewardData = newReward;
    }
  }

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

  async _setCurrentRewardsOnFeeds(currentFeedStatus: Map<string, FeedRewardStatus<BigNumber>>): Promise<void> {
    for (const feedStatus of currentFeedStatus.values()) {
      const currentPaymentAmount: BigNumber = await feedStatus.contract.paymentAmount();
      feedStatus.rewardData = currentPaymentAmount;
    }
  }
}
