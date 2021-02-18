import { BigNumber, Contract } from 'ethers';

export interface FluxFeedRewardStatus extends FeedRewardStatus {
  currentReward: BigNumber;
}

export interface OcrFeedRewardStatus extends FeedRewardStatus {
  billingSet: BillingSet;
}

export interface BillingSet {
  maximumGasPrice: number;
  reasonableGasPrice: number;
  microLinkPerEth: number;
  linkGweiPerObservation: number;
  linkGweiPerTransmission: number;
}

export interface FeedRewardStatus {
  contract: Contract;
}
