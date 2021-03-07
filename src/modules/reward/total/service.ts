import * as LinkToken from '../../../../artifacts/LinkToken.json';
import { BigNumber, Contract, providers } from 'ethers';
import { ContractInfo } from '../../../model/address_info';

export class TotalRewardService {
  constructor(private provider: providers.BaseProvider) {}

  async _getCurrentRewardsOnContracts(
    contracts: ContractInfo[],
    rewardOwner: string,
    abi: any,
    isFlux: boolean
  ): Promise<BigNumber> {
    let totalReward: BigNumber = BigNumber.from('0');
    for (const feedAddress of contracts.map((item) => item.address)) {
      const contract: Contract = new Contract(feedAddress, abi, this.provider);
      if (isFlux) {
        totalReward = totalReward.add(await contract.withdrawablePayment(rewardOwner));
      } else {
        totalReward = totalReward.add(await contract.owedPayment(rewardOwner));
      }
    }
    return totalReward;
  }

  async _getCurrentOcrPayeeRewards(linkTokenAddress: string, ocrPayee: string): Promise<BigNumber> {
    const contract: Contract = new Contract(linkTokenAddress, LinkToken.abi, this.provider);
    return await contract.balanceOf(ocrPayee);
  }
}
