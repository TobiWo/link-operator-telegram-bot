import { BillingSet, FeedRewardStatus } from '../../../model/feed_reward_status';
import { BigNumber } from 'ethers';

/**
 * Parent StepService class
 */
export class StepService<T extends BigNumber | BillingSet> {
  protected currentFeedStatus: Map<string, FeedRewardStatus<T>> = new Map();

  /**
   * General method for a step service to prevent checking for undefined object multiple times
   * in different code locations.
   *
   * @param feedName name of the feed as defined in address_info.yml
   * @throws Error when no feed status is fetchable for the defined feed
   * @returns FeedRewardStatus object for the defined feed
   */
  protected getFeedStatus(feedName: string): FeedRewardStatus<T> {
    const feedStatus: FeedRewardStatus<T> | undefined = this.currentFeedStatus.get(feedName);
    if (feedStatus) return feedStatus;
    throw Error(`FeedNotPresentError: No feed with name ${feedName} tracked!`);
  }
}
