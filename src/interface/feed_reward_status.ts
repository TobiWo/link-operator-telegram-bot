import { BigNumber, Contract } from 'ethers';

export interface FeedRewardStatus<T> {
  contract: Contract;
  rewardData: T;
}

export interface BillingSet {
  maximumGasPriceInWei: BigNumber;
  reasonableGasPriceInWei: BigNumber;
  linkPerEth: BigNumber;
  linkWeiPerObservation: BigNumber;
  linkWeiPerTransmission: BigNumber;
}
