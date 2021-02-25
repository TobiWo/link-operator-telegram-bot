import { BigNumber, Contract } from 'ethers';

export interface FluxFeedRewardStatus extends FeedContract {
  currentReward: BigNumber;
}

export interface OcrFeedRewardStatus extends FeedContract {
  billingSet: BillingSet;
}

export interface BillingSet {
  maximumGasPriceInWei: BigNumber;
  reasonableGasPriceInWei: BigNumber;
  linkPerEth: BigNumber;
  linkWeiPerObservation: BigNumber;
  linkWeiPerTransmission: BigNumber;
}

export interface FeedContract {
  contract: Contract;
}
