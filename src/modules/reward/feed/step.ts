import { BillingSet, FeedRewardStatus } from '../../../model/feed_reward_status';
import { BigNumber } from 'ethers';

export class StepService<T extends BigNumber | BillingSet> {
  protected currentFeedStatus: Map<string, FeedRewardStatus<T>> = new Map();

  protected getFeedStatus(feedName: string): FeedRewardStatus<T> {
    const feedStatus: FeedRewardStatus<T> | undefined = this.currentFeedStatus.get(feedName);
    if (feedStatus) return feedStatus;
    throw Error(`FeedNotPresentError: No feed with name ${feedName} tracked!`);
  }
}
