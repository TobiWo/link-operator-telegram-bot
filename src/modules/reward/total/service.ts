import * as LinkToken from '../../../../artifacts/LinkToken.json';
import { BigNumber, Contract, providers } from 'ethers';
import { ContractInfo } from '../../../model/address_info';

/**
 * Service for TotalRewardWizard.
 * The service handles all telegraf independent logic.
 */
export class TotalRewardService {
  constructor(private provider: providers.BaseProvider) {}

  /**
   * Method which returns the value of total rewards for the defined workflow (flux or ocr)
   *
   * @param contracts flux- or ocr-contract addresses
   * @param rewardOwner owner of the rewards to get correct rewards value from contracts
   * @param abi flux or ocr abi
   * @param isFlux boolean for which workflow the reward value should be retrieved
   * @returns total reward for defined workflow
   */
  async _getCurrentRewardsOnContracts(
    contracts: ContractInfo[],
    rewardOwner: string,
    abi: any, // eslint-disable-line @typescript-eslint/explicit-module-boundary-types
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

  /**
   * Returns the current rewards on the ocr payee address
   *
   * @param linkTokenAddress link token address
   * @param ocrPayee payee address
   * @returns current rewards on payee address
   */
  async _getCurrentOcrPayeeRewards(linkTokenAddress: string, ocrPayee: string): Promise<BigNumber> {
    const contract: Contract = new Contract(linkTokenAddress, LinkToken.abi, this.provider);
    return await contract.balanceOf(ocrPayee);
  }
}
